// Données : adaptateur qui implémente le port ExampleRepository avec la base libsql.
// Aucune règle métier : lit et écrit, sans rien décider.

import type { Example, ExampleRepository } from "@/services/ports";
import type { Database } from "./db";

export function createExampleRepository(db: Database): ExampleRepository {
  return {
    async findAll(): Promise<Example[]> {
      await db.ready;
      const { rows } = await db.client.execute("SELECT '1' AS id, 'Exemple' AS name");
      return rows.map((r) => ({ id: String(r.id), name: String(r.name) }));
    },
  };
}
