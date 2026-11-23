// Données : adaptateur qui implémente le port Clock avec l'heure du système.

import type { Clock } from "@/services/ports";

export const systemClock: Clock = { now: () => new Date() };
