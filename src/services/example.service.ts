// Service : cas d'usage. Orchestre les règles du domaine et les ports, reçus en paramètre.
// Ne connaît ni la base ni l'interface.

import { sortByName } from "./domain/example";
import type { Clock, Example, ExampleRepository } from "./ports";

export type ExampleServiceDeps = { repository: ExampleRepository; clock: Clock };

export function createExampleService({ repository, clock }: ExampleServiceDeps) {
  return {
    async listExamples(): Promise<{ examples: Example[]; listedAt: Date }> {
      return { examples: sortByName(await repository.findAll()), listedAt: clock.now() };
    },
  };
}

export type ExampleService = ReturnType<typeof createExampleService>;
