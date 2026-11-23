// Ports : les interfaces dont le service a besoin. Le service les définit,
// la couche données les implémente, la composition (src/composition.ts) les branche.

import type { Example } from "./domain/example";

export type { Example };

// L'heure actuelle. Horloge système en prod ; horloge qu'on avance à la main en test et en simulation.
export interface Clock {
  now(): Date;
}

export interface ExampleRepository {
  findAll(): Promise<Example[]>;
}
