import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, withDefaults } from "./settings";

describe("domaine · settings", () => {
  it("prend 3 e-mails et 7 jours avant « Perdu » par défaut", () => {
    expect(DEFAULT_SETTINGS).toEqual({ sequenceLength: 3, lostDelayDays: 7 });
    expect(withDefaults({})).toEqual({ sequenceLength: 3, lostDelayDays: 7 });
  });

  // Revue PR #10 : une valeur aberrante relue en base ne casse pas la séquence.
  it.each([Number.NaN, 0, 11, 2.5, -1])("remplace une longueur aberrante (%s) par la valeur par défaut", (valeur) => {
    expect(withDefaults({ sequenceLength: valeur })).toEqual({ sequenceLength: 3, lostDelayDays: 7 });
  });

  it.each([Number.NaN, 0, 91, 1.5, -1])("remplace un délai aberrant (%s) par la valeur par défaut", (valeur) => {
    expect(withDefaults({ lostDelayDays: valeur })).toEqual({ sequenceLength: 3, lostDelayDays: 7 });
  });

  it("garde les réglages enregistrés", () => {
    expect(withDefaults({ sequenceLength: 5, lostDelayDays: 3 })).toEqual({ sequenceLength: 5, lostDelayDays: 3 });
  });
});
