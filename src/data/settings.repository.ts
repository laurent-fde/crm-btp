// Données · adaptateur qui implémente le port SettingsRepository : une ligne par réglage (clé → valeur).
// Aucune valeur par défaut ici : elles sont dans le domaine.

import type { Settings, SettingsRepository } from "@/services/ports";
import type { Database } from "./db";

// Le nom de chaque réglage dans la table settings.
const KEYS: Record<keyof Settings, string> = { sequenceLength: "sequence_length", lostDelayDays: "lost_delay_days" };
const ENTRIES = Object.entries(KEYS) as [keyof Settings, string][];

export function createSettingsRepository(db: Database): SettingsRepository {
  return {
    async load() {
      await db.ready;
      const { rows } = await db.client.execute({
        sql: `SELECT key, value FROM settings WHERE key IN (${ENTRIES.map(() => "?").join(", ")})`,
        args: ENTRIES.map(([, key]) => key),
      });
      const saved: Partial<Settings> = {};
      for (const [field, key] of ENTRIES) {
        const row = rows.find((r) => String(r.key) === key);
        if (row) saved[field] = Number(row.value);
      }
      return saved;
    },

    // #18 : une requête (upsert) par champ reçu, sans relire : deux enregistrements simultanés
    // de champs différents ne s'écrasent pas.
    async save(changes) {
      const statements = ENTRIES.filter(([field]) => changes[field] !== undefined).map(([field, key]) => ({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        args: [key, String(changes[field])],
      }));
      if (statements.length === 0) return;
      await db.ready;
      await db.client.batch(statements, "write");
    },
  };
}
