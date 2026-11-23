// Composition : le seul fichier qui branche les vrais adaptateurs (src/data/) aux services.
// Ce n'est pas une couche : c'est le câblage. La présentation obtient ses services ici.

import "server-only";
import { getDatabase } from "@/data/db";
import { createLeadRepository } from "@/data/lead.repository";
import { randomIds } from "@/data/random-id";
import { createSettingsRepository } from "@/data/settings.repository";
import { createSimulatedEmailSender } from "@/data/simulated-email-sender";
import { resolveWebhookSecret } from "@/data/webhook-secret";
import { systemClock } from "@/data/system-clock";
import { createLeadService, getSuggestedTrades } from "@/services/lead.service";
import { createSequenceService } from "@/services/sequence.service";
import { createSettingsService } from "@/services/settings.service";
import { createSimulationService } from "@/services/simulation.service";
import { createWebhookService } from "@/services/webhook.service";

export function getLeadService() {
  const db = getDatabase();
  return createLeadService({
    repository: createLeadRepository(db),
    clock: systemClock,
    ids: randomIds,
    settings: createSettingsRepository(db),
  });
}

export function getSettingsService() {
  return createSettingsService({ repository: createSettingsRepository(getDatabase()) });
}

// Envoi de la séquence : par le faux fournisseur d'e-mails en V1 (le vrai se branchera ici seulement).
export function getSequenceService() {
  const db = getDatabase();
  return createSequenceService({
    repository: createLeadRepository(db),
    emailSender: createSimulatedEmailSender(db, systemClock),
    settings: createSettingsRepository(db),
    clock: systemClock,
    ids: randomIds,
  });
}

// Les actions du destinataire : la porte d'entrée webhook (signée avec le secret partagé)…
export function getWebhookService() {
  return createWebhookService({
    repository: createLeadRepository(getDatabase()),
    ids: randomIds,
    secret: resolveWebhookSecret(process.env),
  });
}

// … et la simulation depuis l'app, qui signe et passe par cette même porte.
export function getSimulationService() {
  return createSimulationService({
    webhook: getWebhookService(),
    secret: resolveWebhookSecret(process.env),
    clock: systemClock,
    ids: { next: () => `sim-${randomIds.next()}` },
  });
}

// Options du formulaire de lead : n'ouvre pas la base (utilisable dans l'en-tête de la page, prérendu).
export function getLeadFormOptions() {
  return { trades: getSuggestedTrades() };
}
