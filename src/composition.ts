// Composition : le seul fichier qui branche les vrais adaptateurs (src/data/) aux services.
// Ce n'est pas une couche : c'est le câblage. La présentation obtient ses services ici.

import "server-only";
import { getDatabase } from "@/data/db";
import { createLeadRepository } from "@/data/lead.repository";
import { randomIds } from "@/data/random-id";
import { systemClock } from "@/data/system-clock";
import { createLeadService, getSuggestedTrades } from "@/services/lead.service";

export function getLeadService() {
  return createLeadService({ repository: createLeadRepository(getDatabase()), clock: systemClock, ids: randomIds });
}

// Options du formulaire de lead : n'ouvre pas la base (utilisable dans l'en-tête de la page, prérendu).
export function getLeadFormOptions() {
  return { trades: getSuggestedTrades() };
}
