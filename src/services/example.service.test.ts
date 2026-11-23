import { describe, expect, it } from "vitest";
import { createExampleService } from "./example.service";
import type { Clock, ExampleRepository } from "./ports";

describe("service · example.service", () => {
  it("orchestre dépôt, règle et horloge, avec de faux ports (sans vraie base)", async () => {
    const repository: ExampleRepository = {
      findAll: async () => [
        { id: "1", name: "Maçon" },
        { id: "2", name: "Couvreur" },
      ],
    };
    const clock: Clock = { now: () => new Date("2026-11-23T09:00:00.000Z") };

    const result = await createExampleService({ repository, clock }).listExamples();

    expect(result.examples.map((e) => e.name)).toEqual(["Couvreur", "Maçon"]);
    expect(result.listedAt.toISOString()).toBe("2026-11-23T09:00:00.000Z");
  });
});
