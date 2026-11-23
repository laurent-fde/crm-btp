import { describe, expect, it, vi } from "vitest";

vi.mock("@/composition", () => ({
  getExampleService: () => ({
    listExamples: async () => ({ examples: [{ id: "1", name: "Exemple" }], listedAt: new Date() }),
  }),
}));

import { listExamplesAction } from "./example.action";

describe("présentation · example.action", () => {
  it("renvoie ce que donne le service (composition remplacée par un faux)", async () => {
    expect(await listExamplesAction()).toEqual([{ id: "1", name: "Exemple" }]);
  });
});
