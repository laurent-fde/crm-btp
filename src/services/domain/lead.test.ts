import { describe, expect, it } from "vitest";
import { eventLabel, groupByStage, normalizeFrenchPhone, sortHistory, STAGES, type Lead, type LeadEvent } from "./lead";

const lead = (over: Partial<Lead>): Lead => ({
  id: "1",
  name: "Karim Benali",
  company: null,
  trade: null,
  city: null,
  postalCode: null,
  email: "karim@exemple.fr",
  phone: null,
  stage: "nouveau",
  createdAt: new Date("2026-11-23T09:00:00.000Z"),
  ...over,
});

describe("domaine · lead · groupByStage", () => {
  it("donne toujours les 7 colonnes, dans l'ordre des étapes, même vides", () => {
    const columns = groupByStage([]);

    expect(columns.map((c) => c.label)).toEqual([
      "Nouveau",
      "E-mail envoyé",
      "Ouvert",
      "Lien cliqué",
      "Page visitée",
      "Gagné",
      "Perdu",
    ]);
    expect(columns.map((c) => c.stage)).toEqual([...STAGES]);
    expect(columns.every((c) => c.leads.length === 0)).toBe(true);
  });

  // Critère 1 : un lead « nouveau » est rangé dans la colonne « Nouveau ».
  it("range chaque lead dans la colonne de son étape, le plus récent en premier", () => {
    const ancien = lead({ id: "a", name: "Ancien", createdAt: new Date("2026-11-20T09:00:00.000Z") });
    const recent = lead({ id: "r", name: "Récent", createdAt: new Date("2026-11-23T09:00:00.000Z") });
    const ouvert = lead({ id: "o", name: "Ouvert", stage: "ouvert" });

    const columns = groupByStage([ancien, ouvert, recent]);

    expect(columns.find((c) => c.stage === "nouveau")?.leads.map((l) => l.id)).toEqual(["r", "a"]);
    expect(columns.find((c) => c.stage === "ouvert")?.leads.map((l) => l.id)).toEqual(["o"]);
  });
});

describe("domaine · lead · normalizeFrenchPhone", () => {
  it.each([
    ["0612345678", "06 12 34 56 78"],
    ["06 12 34 56 78", "06 12 34 56 78"],
    ["06.12.34.56.78", "06 12 34 56 78"],
    ["06-12-34-56-78", "06 12 34 56 78"],
    ["+33 6 12 34 56 78", "06 12 34 56 78"],
    ["+33612345678", "06 12 34 56 78"],
    ["0033 4 72 00 00 00", "04 72 00 00 00"],
    ["+33 (0)4 72 00 00 00", "04 72 00 00 00"],
    // Revue PR #8 : le 0 tapé après l'indicatif ne doit pas être doublé.
    ["+33 06 12 34 56 78", "06 12 34 56 78"],
    ["0033 06 12 34 56 78", "06 12 34 56 78"],
  ])("accepte %s et l'écrit %s", (saisie, attendu) => {
    expect(normalizeFrenchPhone(saisie)).toBe(attendu);
  });

  it.each(["06123", "061234567890", "0012345678", "abcdefghij", "+44 20 7946 0958", "06 12 34 56 7a"])(
    "refuse %s",
    (saisie) => {
      expect(normalizeFrenchPhone(saisie)).toBeNull();
    },
  );
});

describe("domaine · lead · sortHistory", () => {
  const event = (id: string, iso: string): LeadEvent => ({
    id,
    leadId: "lead-1",
    type: "lead_cree",
    occurredAt: new Date(iso),
  });

  // Critère 1 (lot 2) : l'historique se lit du plus ancien au plus récent, il commence donc par « Lead créé ».
  it("range l'historique du plus ancien au plus récent, sans modifier la liste reçue", () => {
    const recu = [event("b", "2026-11-24T09:00:00.000Z"), event("a", "2026-11-23T09:00:00.000Z")];

    expect(sortHistory(recu).map((e) => e.id)).toEqual(["a", "b"]);
    expect(recu.map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("domaine · lead · eventLabel", () => {
  // Critère 1 (lot 3) : l'historique montre « E-mail 1 envoyé ».
  it("nomme chaque événement de l'historique", () => {
    const at = new Date("2026-11-23T09:00:00.000Z");
    expect(eventLabel({ id: "a", leadId: "l", type: "lead_cree", occurredAt: at })).toBe("Lead créé");
    expect(eventLabel({ id: "b", leadId: "l", type: "email_envoye", emailStep: 1, occurredAt: at })).toBe("E-mail 1 envoyé");
  });
});
