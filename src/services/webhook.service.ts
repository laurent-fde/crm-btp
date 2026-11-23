// Service · webhook : la porte d'entrée des actions du destinataire (vrai webhook ou simulation, même chemin).
// Vérifie la signature, valide l'événement, ignore un doublon, fait avancer le lead.

import { z } from "zod";
import { ACTION_TYPES, actionTargetStage, advanceStage } from "./domain/lead";
import type { IdGenerator, LeadRepository } from "./ports";
import { verifyWebhook } from "./webhook-signature";

export type WebhookServiceDeps = { repository: LeadRepository; ids: IdGenerator; secret: string };

// reason : « signature » (401), « invalid » (400), « unavailable » (503) pour la route HTTP du lot 5.
export type ReceiveResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; reason: "signature" | "invalid" | "unavailable"; message: string };

const SIGNATURE_REFUSED = "Signature absente ou invalide.";
const MALFORMED = "Événement mal formé.";
const UNKNOWN_LEAD = "Lead inconnu.";
const UNAVAILABLE = "Enregistrement impossible pour le moment.";

const eventSchema = z.object({
  id: z.string().trim().min(1).max(200),
  type: z.enum(ACTION_TYPES),
  leadId: z.string().trim().min(1).max(200),
  occurredAt: z.iso.datetime({ offset: true }),
});

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export function createWebhookService({ repository, ids, secret }: WebhookServiceDeps) {
  return {
    async receive(body: string, signature: string | null): Promise<ReceiveResult> {
      if (!verifyWebhook(body, signature, secret)) return { ok: false, reason: "signature", message: SIGNATURE_REFUSED };

      const parsed = eventSchema.safeParse(parseJson(body));
      if (!parsed.success) return { ok: false, reason: "invalid", message: MALFORMED };
      const { id: externalId, type, leadId, occurredAt } = parsed.data;

      try {
        if (await repository.findEventByExternalId(externalId)) return { ok: true, duplicate: true };
        const lead = await repository.findById(leadId);
        if (!lead) return { ok: false, reason: "invalid", message: UNKNOWN_LEAD };

        const next = advanceStage(lead.stage, actionTargetStage(type));
        try {
          await repository.recordEvent(
            { id: ids.next(), leadId, type, occurredAt: new Date(occurredAt), externalId },
            next === lead.stage ? null : { from: lead.stage, to: next },
          );
        } catch (error) {
          // Le même événement reçu deux fois en même temps : la base n'en garde qu'un.
          if (await repository.findEventByExternalId(externalId)) return { ok: true, duplicate: true };
          throw error;
        }
        return { ok: true, duplicate: false };
      } catch {
        return { ok: false, reason: "unavailable", message: UNAVAILABLE };
      }
    },
  };
}

export type WebhookService = ReturnType<typeof createWebhookService>;
