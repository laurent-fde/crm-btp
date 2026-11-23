import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, withDefaults } from "./settings";

describe("domaine · settings", () => {
  it("prend 3 e-mails par défaut", () => {
    expect(DEFAULT_SETTINGS).toEqual({ sequenceLength: 3 });
    expect(withDefaults({})).toEqual({ sequenceLength: 3 });
  });

  // Revue PR #10 : une valeur aberrante relue en base ne casse pas la séquence.
  it.each([Number.NaN, 0, 11, 2.5, -1])("remplace une longueur aberrante (%s) par la valeur par défaut", (valeur) => {
    expect(withDefaults({ sequenceLength: valeur })).toEqual({ sequenceLength: 3 });
  });

  it("garde les réglages enregistrés", () => {
    expect(withDefaults({ sequenceLength: 5 })).toEqual({ sequenceLength: 5 });
  });
});
