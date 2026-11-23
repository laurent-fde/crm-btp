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

const karim = {
  id: "lead-k",
  name: "Karim Benali",
  company: "Benali Élec",
  trade: "Électricien",
  city: "Lyon",
  postalCode: "69003",
  email: "karim.benali@exemple.fr",
  phone: "06 12 34 56 78",
  stage: "ouvert" as const,
  createdAt: new Date("2026-11-20T08:00:00.000Z"),
};

describe("service · lead.service · historique (lot 2)", () => {
  // Critère 1 (lot 2) : l'historique commence par « Lead créé », daté.
  it("enregistre « Lead créé » à l'heure de l'horloge, et la fiche le montre en premier", async () => {
    const { service, events } = setup();

    const added = await service.addLead({ name: "Karim", email: "karim@exemple.fr" });
    const id = added.ok ? added.lead.id : "";

    expect(events).toEqual([
      { id: expect.any(String), leadId: id, type: "lead_cree", occurredAt: new Date("2026-11-23T09:00:00.000Z") },
    ]);
    const detail = await service.getLeadDetail(id);
    expect(detail.ok && detail.lead.name).toBe("Karim");
    expect(detail.ok && detail.history[0]).toMatchObject({ label: "Lead créé", occurredAt: new Date("2026-11-23T09:00:00.000Z") });
  });

  it("renvoie l'historique du plus ancien au plus récent", async () => {
    const { repository } = createFakeLeadRepository(
      [karim],
      [
        { id: "e2", leadId: "lead-k", type: "lead_cree", occurredAt: new Date("2026-11-22T08:00:00.000Z") },
        { id: "e1", leadId: "lead-k", type: "lead_cree", occurredAt: new Date("2026-11-20T08:00:00.000Z") },
      ],
    );
    const service = createLeadService({ repository, clock: createFakeClock(), ids: createFakeIds() });

    const detail = await service.getLeadDetail("lead-k");
    expect(detail.ok && detail.history.map((h) => h.id)).toEqual(["e1", "e2"]);
  });

  it("ne renvoie rien pour un lead inconnu", async () => {
    const { service } = setup();

    expect(await service.getLeadDetail("inconnu")).toEqual({ ok: false, message: "Ce lead n'existe pas ou plus." });
  });

  // Revue PR #9 : une panne de la base à l'ouverture de la fiche n'est pas une page d'erreur.
  it("renvoie un message général si la base est en panne, sans lever d'exception", async () => {
    const { repository } = createFakeLeadRepository([karim]);
    repository.findById = async () => {
      throw new Error("base injoignable");
    };
    const service = createLeadService({ repository, clock: createFakeClock(), ids: createFakeIds() });

    expect(await service.getLeadDetail("lead-k")).toEqual({
      ok: false,
      message: "Fiche indisponible pour le moment. Réessaie dans un instant.",
    });
  });
});

describe("service · lead.service · updateLead (lot 2)", () => {
  function setupWithKarim() {
    const fake = createFakeLeadRepository([karim]);
    const service = createLeadService({ repository: fake.repository, clock: createFakeClock(), ids: createFakeIds() });
    return { ...fake, service };
  }
  // La saisie du formulaire de la fiche : les 7 champs, en texte.
  const saisie = {
    name: karim.name,
    company: karim.company,
    trade: karim.trade,
    city: karim.city,
    postalCode: karim.postalCode,
    email: karim.email,
    phone: karim.phone,
  };

  // Critère 2 (lot 2) : la nouvelle ville est enregistrée ; l'étape et la date de création ne bougent pas.
  it("change la ville, en gardant l'étape et la date de création", async () => {
    const { service, leads } = setupWithKarim();

    const result = await service.updateLead("lead-k", { ...saisie, city: " Villeurbanne ", postalCode: "69100" });

    expect(result.ok).toBe(true);
    expect(leads[0]).toEqual({ ...karim, city: "Villeurbanne", postalCode: "69100" });
  });

  // Critère 3 (lot 2) : nom effacé, même message qu'à l'ajout, rien n'est modifié.
  it("refuse un nom effacé avec le même message qu'à l'ajout, sans rien modifier", async () => {
    const { service, leads } = setupWithKarim();

    const result = await service.updateLead("lead-k", { ...saisie, name: "  " });

    expect(result).toEqual({ ok: false, errors: { name: "Le nom est obligatoire" } });
    expect(leads[0]).toEqual(karim);
  });

  // Revue PR #9 : seuls les 7 champs de la fiche sont écrits ; l'étape, que les lots 4 et 5 font avancer, n'est jamais réécrite.
  it("n'envoie au dépôt que les 7 champs de la fiche, jamais l'étape", async () => {
    const { service, repository } = setupWithKarim();
    const appels: unknown[] = [];
    const original = repository.updateDetails;
    repository.updateDetails = async (id, details) => {
      appels.push([id, details]);
      return original(id, details);
    };

    await service.updateLead("lead-k", { ...saisie, city: "Villeurbanne" });

    expect(appels).toEqual([
      [
        "lead-k",
        {
          name: "Karim Benali",
          company: "Benali Élec",
          trade: "Électricien",
          city: "Villeurbanne",
          postalCode: "69003",
          email: "karim.benali@exemple.fr",
          phone: "06 12 34 56 78",
        },
      ],
    ]);
  });

  // Revue PR #9 : un identifiant vide est refusé sans toucher à la base.
  it("refuse un identifiant vide sans appeler le dépôt", async () => {
    const { service, repository } = setupWithKarim();
    repository.updateDetails = async () => {
      throw new Error("ne doit pas être appelé");
    };

    expect(await service.updateLead("  ", saisie)).toEqual({
      ok: false,
      errors: {},
      formError: "Ce lead n'existe pas ou plus.",
    });
  });

  it("prévient si le lead n'existe pas ou plus", async () => {
    const { service } = setupWithKarim();

    expect(await service.updateLead("inconnu", saisie)).toEqual({
      ok: false,
      errors: {},
      formError: "Ce lead n'existe pas ou plus.",
    });
  });

  it("renvoie un message général si la base est en panne", async () => {
    const { repository } = createFakeLeadRepository([karim]);
    repository.updateDetails = async () => {
      throw new Error("base injoignable");
    };
    const service = createLeadService({ repository, clock: createFakeClock(), ids: createFakeIds() });

    expect(await service.updateLead("lead-k", saisie)).toEqual({
      ok: false,
      errors: {},
      formError: "Enregistrement impossible pour le moment. Réessaie dans un instant.",
    });
  });
});
