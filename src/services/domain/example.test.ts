import { describe, expect, it } from "vitest";
import { sortByName } from "./example";

describe("domaine · example", () => {
  it("applique une règle pure, sans base ni horloge", () => {
    const examples = [
      { id: "2", name: "Électricien" },
      { id: "1", name: "Maçon" },
      { id: "3", name: "Couvreur" },
    ];

    expect(sortByName(examples).map((e) => e.name)).toEqual(["Couvreur", "Électricien", "Maçon"]);
  });
});
