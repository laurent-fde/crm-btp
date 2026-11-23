// Données : adaptateur qui implémente le port Clock avec l'heure du système.

import type { Clock } from "@/services/ports";

export const systemClock: Clock = { now: () => new Date() };

// L'horloge simulée de l'app : une horloge décalée (le temps continue de s'écouler).
export function withOffset(clock: Clock, offsetMs: number): Clock {
  return { now: () => new Date(clock.now().getTime() + offsetMs) };
}
