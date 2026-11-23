// Composition : le seul fichier qui branche les vrais adaptateurs (src/data/) aux services.
// Ce n'est pas une couche : c'est le câblage. La présentation obtient ses services ici.

import "server-only";
import { getDatabase } from "@/data/db";
import { createExampleRepository } from "@/data/example.repository";
import { systemClock } from "@/data/system-clock";
import { createExampleService } from "@/services/example.service";

export function getExampleService() {
  return createExampleService({ repository: createExampleRepository(getDatabase()), clock: systemClock });
}
