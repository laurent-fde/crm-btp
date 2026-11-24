// Service · horloge de l'app : avancer le temps pour la démo (+1 jour, +7 jours), ou revenir à aujourd'hui.
// L'horloge simulée = l'heure réelle + un décalage enregistré.

import { z } from "zod";
import type { Clock, ClockOffsetRepository, LeadRepository } from "./ports";

export type ClockStatus = { now: Date; offsetDays: number };
export type ClockResult = { ok: true; status: ClockStatus } | { ok: false; message: string };

const DAY_MS = 86_400_000;
const DAYS_MESSAGE = "Entre 1 et 365 jours.";
const SAVE_FAILED = "Enregistrement impossible pour le moment. Réessaie dans un instant.";

const daysSchema = z.string().trim().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(365));

type ClockDeps = {
  offsets: ClockOffsetRepository;
  realClock: Clock;
  leads: Pick<LeadRepository, "countEventsAfter">;
};

export function createClockService({ offsets, realClock, leads }: ClockDeps) {
  const status = (offsetMs: number): ClockStatus => ({
    now: new Date(realClock.now().getTime() + offsetMs),
    offsetDays: Math.round(offsetMs / DAY_MS),
  });

  const save = async (offsetMs: number): Promise<ClockResult> => {
    try {
      await offsets.save(offsetMs);
      return { ok: true, status: status(offsetMs) };
    } catch {
      return { ok: false, message: SAVE_FAILED };
    }
  };

  return {
    async getStatus(): Promise<ClockStatus> {
      return status(await offsets.load());
    },

    async advance(days: string): Promise<ClockResult> {
      const parsed = daysSchema.safeParse(days);
      if (!parsed.success) return { ok: false, message: DAYS_MESSAGE };
      try {
        return { ok: true, status: status(await offsets.advanceBy(parsed.data * DAY_MS)) };
      } catch {
        return { ok: false, message: SAVE_FAILED };
      }
    },

    // #17, option B : revenir à aujourd'hui ne touche pas aux événements créés pendant l'avance.
    // Ils restent datés dans le futur, et l'app le signale avec ce nombre.
    async reset(): Promise<ClockResult> {
      return save(0);
    },

    // Nombre d'événements datés après la date de l'app. 0 si la base ne répond pas : simple avertissement.
    async futureEvents(): Promise<number> {
      try {
        const { now } = status(await offsets.load());
        return await leads.countEventsAfter(now);
      } catch {
        return 0;
      }
    },
  };
}

export type ClockService = ReturnType<typeof createClockService>;
