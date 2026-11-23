import { describe, expect, it } from "vitest";
import { boardStats, sequenceStep } from "./board-stats";
import { groupByStage, type BoardLead, type Stage } from "./lead";

const lead = (id: string, stage: Stage, emailStep = 0): BoardLead => ({
  id,
  name: id,
  company: null,
  trade: null,
  city: null,
  postalCode: null,
  email: `${id}@exemple.fr`,
  phone: null,
  stage,
  createdAt: new Date("2026-11-23T09:00:00.000Z"),
  emailStep,
});

describe("domaine · boardStats", () => {
  it("compte le total et les leads de chaque étape, dans l'ordre des colonnes", () => {
    const stats = boardStats(groupByStage([lead("a", "nouveau"), lead("b", "nouveau"), lead("c", "gagne"), lead("d", "perdu")]), 3);

    expect(stats.total).toBe(4);
    expect(stats.byStage.map((s) => [s.stage, s.count])).toEqual([
      ["nouveau", 2],
      ["email_envoye", 0],
      ["ouvert", 0],
      ["lien_clique", 0],
      ["page_visitee", 0],
      ["gagne", 1],
      ["perdu", 1],
    ]);
  });

  it("répartit les leads « E-mail envoyé » selon le dernier e-mail reçu, de 1 à la longueur de la séquence", () => {
    const columns = groupByStage([
      lead("a", "email_envoye", 1),
      lead("b", "email_envoye", 2),
      lead("c", "email_envoye", 3),
      lead("d", "email_envoye", 3),
      lead("e", "ouvert", 1), // a agi : n'est plus en attente dans la séquence
    ]);

    expect(boardStats(columns, 3).sequence).toEqual([
      { step: 1, count: 1 },
      { step: 2, count: 1 },
      { step: 3, count: 2 },
    ]);
    expect(boardStats(columns, 4).sequence.map((s) => s.count)).toEqual([1, 1, 2, 0]);
  });

  it("compte au dernier e-mail un lead dont l'étape dépasse la séquence actuelle (séquence raccourcie)", () => {
    expect(boardStats(groupByStage([lead("a", "email_envoye", 5)]), 3).sequence.at(-1)).toEqual({ step: 3, count: 1 });
  });

  // Revue #21 : le taux de gain porte sur les leads terminés (gagnés + perdus), pas sur les leads en cours.
  it("donne le taux de gain sur les leads terminés, null tant qu'aucun n'est terminé", () => {
    const columns = groupByStage([lead("a", "gagne"), lead("b", "nouveau"), lead("c", "perdu"), lead("d", "perdu"), lead("e", "ouvert")]);
    expect(boardStats(columns, 3).wonRate).toBe(33);
    expect(boardStats(groupByStage([lead("a", "nouveau")]), 3).wonRate).toBeNull();
  });

  // Revue #21 : un lead « E-mail envoyé » sans aucun e-mail (étape changée à la main) ne gonfle pas « E-mail 1 ».
  it("ne compte pas dans la séquence un lead « E-mail envoyé » qui n'a reçu aucun e-mail", () => {
    expect(boardStats(groupByStage([lead("a", "email_envoye", 0)]), 3).sequence.map((s) => s.count)).toEqual([0, 0, 0]);
  });

  it("borne l'étape de séquence entre 0 (aucun e-mail) et la longueur de la séquence", () => {
    expect(sequenceStep(0, 3)).toBe(0);
    expect(sequenceStep(2, 3)).toBe(2);
    expect(sequenceStep(5, 3)).toBe(3);
  });
});
