// Ports : les interfaces dont le service a besoin. Le service les définit,
// la couche données les implémente, la composition (src/composition.ts) les branche.

import type { Lead, LeadEvent, LeadEventType, Stage } from "./domain/lead";
import type { Settings } from "./domain/settings";

export type { Lead, LeadEvent, LeadEventType, Settings, Stage };

// Les 7 champs de la fiche, les seuls qu'une modification écrit (jamais l'étape ni la date de création).
export type LeadDetails = Pick<Lead, "name" | "company" | "trade" | "city" | "postalCode" | "email" | "phone">;

// L'heure actuelle. Horloge système en prod ; horloge qu'on avance à la main en test et en simulation.
export interface Clock {
  now(): Date;
}

// Fournisseur d'e-mails : un faux qui enregistre l'envoi en V1, le vrai le remplacera sans toucher au service.
export type EmailMessage = { leadId: string; step: number; to: string; subject: string; body: string };
export interface EmailSender {
  send(message: EmailMessage): Promise<{ messageId: string }>;
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
  // Écrit un événement (envoi d'e-mail, action du destinataire) et, s'il y en a un, le changement d'étape,
  // ensemble (tout ou rien).
  // L'étape ne change que si le lead est encore à « from » : une avancée faite entre-temps n'est pas écrasée.
  recordEvent(event: LeadEvent, stageChange: { from: Stage; to: Stage } | null): Promise<void>;
  // L'événement reçu avec cet identifiant d'expéditeur, s'il existe (dédoublonnage des webhooks).
  findEventByExternalId(externalId: string): Promise<LeadEvent | null>;
  // Pour chaque lead, la date de son dernier événement parmi ces types.
  lastEventDates(types: readonly LeadEventType[]): Promise<Record<string, Date>>;
}

// Réglages de l'app : seulement ce qui a été enregistré (les valeurs par défaut sont dans le domaine).
export interface SettingsRepository {
  load(): Promise<Partial<Settings>>;
  save(settings: Settings): Promise<void>;
}
