// Données · adaptateur qui implémente le port SettingsRepository : une ligne par réglage (clé → valeur).
// Aucune valeur par défaut ici : elles sont dans le domaine.

import type { Settings, SettingsRepository } from "@/services/ports";
import type { Database } from "./db";

export function createSettingsRepository(db: Database): SettingsRepository {
  return {
    async load() {
      await db.ready;
      const { rows } = await db.client.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: ["sequence_length"],
      });
      const saved: Partial<Settings> = {};
      if (rows[0]) saved.sequenceLength = Number(rows[0].value);
      return saved;
    },

    async save(settings) {
      await db.ready;
      await db.client.execute({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        args: ["sequence_length", String(settings.sequenceLength)],
      });
    },
  };
}
