// Service · simulation : fabrique une action du destinataire, la signe avec le secret partagé
// et la fait passer par le webhook, exactement comme un vrai événement.

import { ACTION_TYPES, type ActionType } from "./domain/lead";
import type { Clock, IdGenerator } from "./ports";
import { signWebhook } from "./webhook-signature";
import type { WebhookService } from "./webhook.service";

export type SimulationServiceDeps = {
  webhook: Pick<WebhookService, "receive">;
  secret: string;
  clock: Clock;
  ids: IdGenerator;
};

export type SimulateResult = { ok: true } | { ok: false; message: string };

const isAction = (type: string): type is ActionType => (ACTION_TYPES as readonly string[]).includes(type);

export function createSimulationService({ webhook, secret, clock, ids }: SimulationServiceDeps) {
  return {
    async simulateAction(leadId: string, type: string): Promise<SimulateResult> {
      if (!isAction(type)) return { ok: false, message: "Action inconnue." };
      // Un identifiant neuf à chaque simulation : ce n'est pas un doublon.
      const body = JSON.stringify({ id: ids.next(), type, leadId, occurredAt: clock.now().toISOString() });
      const result = await webhook.receive(body, signWebhook(body, secret));
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
  };
}

export type SimulationService = ReturnType<typeof createSimulationService>;
