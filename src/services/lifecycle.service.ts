// Service · cycle de vie : fait passer dans « Perdu » les leads restés sans action après le dernier e-mail.
// Lancé après chaque avance de l'horloge et à chaque affichage du tableau.

import { lostSince } from "./domain/lifecycle";
import { withDefaults } from "./domain/settings";
import type { Clock, IdGenerator, LeadRepository, SettingsRepository } from "./ports";

export type MarkLostResult = { ok: true; lost: string[] } | { ok: false; message: string };

const CHECK_FAILED = "Vérification des leads perdus impossible pour le moment.";

export function createLifecycleService({
  repository,
  settings,
  clock,
  ids,
}: {
  repository: LeadRepository;
  settings: SettingsRepository;
  clock: Clock;
  ids: IdGenerator;
}) {
  return {
    async markLostLeads(): Promise<MarkLostResult> {
      try {
        const { lostDelayDays } = withDefaults(await settings.load());
        const now = clock.now();
        const lost: string[] = [];
        for (const lead of await repository.findAll()) {
          if (lead.stage === "nouveau" || lead.stage === "gagne" || lead.stage === "perdu") continue;
          const since = lostSince(lead.stage, await repository.listEvents(lead.id), now, lostDelayDays);
          if (!since) continue;
          // L'événement est daté du moment où le délai a expiré ; rien n'est écrit si le lead a bougé entre-temps.
          const event = { id: ids.next(), leadId: lead.id, type: "lead_perdu" as const, occurredAt: since };
          if (await repository.recordStageChange(event, { from: lead.stage, to: "perdu" })) lost.push(lead.id);
        }
        return { ok: true, lost };
      } catch {
        return { ok: false, message: CHECK_FAILED };
      }
    },
  };
}

export type LifecycleService = ReturnType<typeof createLifecycleService>;
