// Données · adaptateur qui implémente le port IdGenerator avec des UUID aléatoires.

import { randomUUID } from "node:crypto";
import type { IdGenerator } from "@/services/ports";

export const randomIds: IdGenerator = { next: () => randomUUID() };
