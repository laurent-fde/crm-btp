// Ports : les interfaces dont le service a besoin. Le service les définit,
// la couche données les implémente, la composition (src/composition.ts) les branche.

import type { Lead, LeadEvent, LeadEventType, Stage } from "./domain/lead";

export type { Lead, LeadEvent, LeadEventType, Stage };

// Les 7 champs de la fiche, les seuls qu'une modification écrit (jamais l'étape ni la date de création).
export type LeadDetails = Pick<Lead, "name" | "company" | "trade" | "city" | "postalCode" | "email" | "phone">;

// L'heure actuelle. Horloge système en prod ; horloge qu'on avance à la main en test et en simulation.
export interface Clock {
  now(): Date;
}

// Fabrique les identifiants : aléatoires en prod, prévisibles en test.
export interface IdGenerator {
  next(): string;
}

export interface LeadRepository {
  // Écrit le lead et son premier événement ensemble (tout ou rien).
  insert(lead: Lead, firstEvent: LeadEvent): Promise<void>;
  findAll(): Promise<Lead[]>;
  findById(id: string): Promise<Lead | null>;
  // Écrit les 7 champs de la fiche. Renvoie false si aucun lead n'a cet identifiant.
  updateDetails(id: string, details: LeadDetails): Promise<boolean>;
  listEvents(leadId: string): Promise<LeadEvent[]>;
}
