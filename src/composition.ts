// Composition : le seul fichier qui branche les vrais adaptateurs (src/data/) aux services.
// Ce n'est pas une couche : c'est le câblage. La présentation obtient ses services ici.

import "server-only";
import { createClockOffsetRepository } from "@/data/clock-offset.repository";
import { getDatabase } from "@/data/db";
import { createLeadRepository } from "@/data/lead.repository";
import { randomIds } from "@/data/random-id";
import { createSettingsRepository } from "@/data/settings.repository";
import { createSimulatedEmailSender } from "@/data/simulated-email-sender";
import { resolveWebhookSecret } from "@/data/webhook-secret";
import { systemClock, withOffset } from "@/data/system-clock";
import { createClockService } from "@/services/clock.service";
import { createLeadService, getSuggestedTrades } from "@/services/lead.service";
import { createLifecycleService } from "@/services/lifecycle.service";
import { createSequenceService } from "@/services/sequence.service";
import { createSettingsService } from "@/services/settings.service";
import { createSimulationService } from "@/services/simulation.service";
import { createWebhookService } from "@/services/webhook.service";

// L'horloge de l'app : l'heure réelle + le décalage enregistré (lot 6, simulation du passage du temps).
// Lue à chaque appel, pour que tous les services voient la même date simulée.
async function appClock() {
  return withOffset(systemClock, await createClockOffsetRepository(getDatabase()).load());
}

export async function getLeadService() {
  const db = getDatabase();
  return createLeadService({
    repository: createLeadRepository(db),
    clock: await appClock(),
    ids: randomIds,
    settings: createSettingsRepository(db),
  });
}

export function getSettingsService() {
  return createSettingsService({ repository: createSettingsRepository(getDatabase()) });
}

// Envoi de la séquence : par le faux fournisseur d'e-mails en V1 (le vrai se branchera ici seulement).
export async function getSequenceService() {
  const db = getDatabase();
  const clock = await appClock();
  return createSequenceService({
    repository: createLeadRepository(db),
    emailSender: createSimulatedEmailSender(db, clock),
    settings: createSettingsRepository(db),
    clock,
    ids: randomIds,
  });
}

// Les actions du destinataire : la porte d'entrée webhook (signée avec le secret partagé)…
// La réception est datée à l'horloge de l'app (lot 6).
export async function getWebhookService() {
  return createWebhookService({
    repository: createLeadRepository(getDatabase()),
    ids: randomIds,
    secret: resolveWebhookSecret(process.env),
    clock: await appClock(),
  });
}

// … et la simulation depuis l'app, qui signe et passe par cette même porte.
export async function getSimulationService() {
  return createSimulationService({
    webhook: await getWebhookService(),
    secret: resolveWebhookSecret(process.env),
    clock: await appClock(),
    ids: { next: () => `sim-${randomIds.next()}` },
  });
}

// Le passage du temps : avancer l'horloge de l'app ou revenir à aujourd'hui…
export async function getClockService() {
  return createClockService({ offsets: createClockOffsetRepository(getDatabase()), realClock: systemClock });
}

// … et les leads qui passent dans « Perdu » à la date de l'app.
export async function getLifecycleService() {
  const db = getDatabase();
  return createLifecycleService({
    repository: createLeadRepository(db),
    settings: createSettingsRepository(db),
    clock: await appClock(),
    ids: randomIds,
  });
}

// Options du formulaire de lead : n'ouvre pas la base (utilisable dans l'en-tête de la page, prérendu).
export function getLeadFormOptions() {
  return { trades: getSuggestedTrades() };
}
