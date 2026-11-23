import { describe, expect, it } from "vitest";
import { createLeadService, getSuggestedTrades } from "./lead.service";
import { createFakeClock, createFakeIds, createFakeLeadRepository } from "./testing/fakes";

function setup() {
  const fake = createFakeLeadRepository();
  const service = createLeadService({ repository: fake.repository, clock: createFakeClock(), ids: createFakeIds() });
  return { ...fake, service };
}

const valide = {
  name: "  Karim Benali ",
  company: "Benali Élec",
  trade: "Électricien",
  city: "Lyon",
  postalCode: " 69003 ",
  email: " Karim.Benali@Exemple.FR ",
  phone: "+33 6 12 34 56 78",
};

describe("service · lead.service · addLead", () => {
  // Critère 1 : un lead valide arrive dans « Nouveau ».
  it("enregistre un lead valide dans « Nouveau », daté par l'horloge, et le montre dans la colonne Nouveau", async () => {
    const { service, leads } = setup();

    const result = await service.addLead(valide);

    expect(result).toEqual({
      ok: true,
      lead: {
        id: "lead-1",
        name: "Karim Benali",
        company: "Benali Élec",
        trade: "Électricien",
        city: "Lyon",
        postalCode: "69003",
        email: "karim.benali@exemple.fr",
        phone: "06 12 34 56 78",
        stage: "nouveau",
        createdAt: new Date("2026-11-23T09:00:00.000Z"),
      },
    });
    expect(leads).toHaveLength(1);
    const board = await service.getBoard();
    expect(board.find((c) => c.stage === "nouveau")?.leads.map((l) => l.name)).toEqual(["Karim Benali"]);
  });

  it("accepte un lead avec seulement le nom et l'e-mail : les autres champs sont vides", async () => {
    const { service } = setup();

    const result = await service.addLead({ name: "Jeanne Morel", email: "jeanne@exemple.fr", city: "   " });

    expect(result.ok && result.lead).toMatchObject({ company: null, trade: null, city: null, postalCode: null, phone: null });
  });

  // Critère 2 : sans nom, refusé avec « Le nom est obligatoire ».
  it.each([{ name: "" }, { name: "    " }, {}])("refuse un lead sans nom (%o), sans rien enregistrer", async (saisie) => {
    const { service, leads } = setup();

    const result = await service.addLead({ ...saisie, email: "karim@exemple.fr" });

    expect(result).toEqual({ ok: false, errors: { name: "Le nom est obligatoire" } });
    expect(leads).toHaveLength(0);
  });

  // Critère 3 : e-mail invalide, refusé avec un message sur le champ e-mail.
  it.each(["karim@", "karim.exemple.fr", "karim@exemple"])("refuse l'e-mail invalide « %s »", async (email) => {
    const { service, leads } = setup();

    const result = await service.addLead({ name: "Karim", email });

    expect(result).toEqual({ ok: false, errors: { email: "L'adresse e-mail n'est pas valide" } });
    expect(leads).toHaveLength(0);
  });

  it("refuse un lead sans e-mail : la séquence ne pourrait pas lui être envoyée", async () => {
    const { service } = setup();

    expect(await service.addLead({ name: "Karim" })).toEqual({
      ok: false,
      errors: { email: "L'e-mail est obligatoire" },
    });
  });

  it("refuse un téléphone qui n'est pas un numéro français", async () => {
    const { service, leads } = setup();

    const result = await service.addLead({ name: "Karim", email: "karim@exemple.fr", phone: "06 12" });

    expect(result).toEqual({
      ok: false,
      errors: { phone: "Le téléphone n'est pas valide (ex. 06 12 34 56 78)" },
    });
    expect(leads).toHaveLength(0);
  });

  it.each(["6900", "690033", "6900A", "00123"])("refuse le code postal « %s »", async (postalCode) => {
    const { service, leads } = setup();

    const result = await service.addLead({ name: "Karim", email: "karim@exemple.fr", postalCode });

    expect(result).toEqual({
      ok: false,
      errors: { postalCode: "5 chiffres attendus (ex. 69003)" },
    });
    expect(leads).toHaveLength(0);
  });

  // Revue PR #8 : un code postal collé avec un espace est accepté.
  it("accepte un code postal écrit avec un espace et l'enregistre sans", async () => {
    const { service } = setup();

    const result = await service.addLead({ name: "Karim", email: "karim@exemple.fr", postalCode: "69 003" });

    expect(result.ok && result.lead.postalCode).toBe("69003");
  });

  // Revue PR #8 : une panne de la base n'est pas une page d'erreur.
  it("renvoie un message général si l'enregistrement échoue, sans lever d'exception", async () => {
    const { repository } = createFakeLeadRepository();
    repository.insert = async () => {
      throw new Error("base injoignable");
    };
    const service = createLeadService({ repository, clock: createFakeClock(), ids: createFakeIds() });

    const result = await service.addLead({ name: "Karim", email: "karim@exemple.fr" });

    expect(result).toEqual({
      ok: false,
      errors: {},
      formError: "Enregistrement impossible pour le moment. Réessaie dans un instant.",
    });
  });

  it("refuse un champ de plus de 100 caractères", async () => {
    const { service } = setup();

    const result = await service.addLead({ name: "Karim", email: "karim@exemple.fr", company: "x".repeat(101) });

    expect(result).toEqual({ ok: false, errors: { company: "100 caractères maximum" } });
  });

  it("renvoie toutes les erreurs à la fois, une par champ", async () => {
    const { service } = setup();

    const result = await service.addLead({ name: "", email: "karim@", phone: "12" });

    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["email", "name", "phone"]);
  });
});

describe("service · lead.service · getSuggestedTrades", () => {
  it("propose les métiers du bâtiment à la saisie", () => {
    expect(getSuggestedTrades()).toEqual(expect.arrayContaining(["Maçon", "Électricien", "Plombier"]));
  });
});
