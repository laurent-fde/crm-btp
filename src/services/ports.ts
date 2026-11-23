// Ports : les interfaces dont le service a besoin. Le service les définit,
// la couche données les implémente, la composition (src/composition.ts) les branche.

import type { Lead, Stage } from "./domain/lead";

export type { Lead, Stage };

// L'heure actuelle. Horloge système en prod ; horloge qu'on avance à la main en test et en simulation.
export interface Clock {
  now(): Date;
}

// Fabrique les identifiants : aléatoires en prod, prévisibles en test.
export interface IdGenerator {
  next(): string;
}

export interface LeadRepository {
  insert(lead: Lead): Promise<void>;
  findAll(): Promise<Lead[]>;
}
