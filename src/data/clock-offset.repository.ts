// Données · adaptateur qui implémente le port ClockOffsetRepository : le décalage de l'horloge,
// rangé dans la table settings (clé clock_offset_ms). Conservé après redémarrage.

import type { ClockOffsetRepository } from "@/services/ports";
import type { Database } from "./db";

const KEY = "clock_offset_ms";

export function createClockOffsetRepository(db: Database): ClockOffsetRepository {
  return {
    async load() {
      await db.ready;
      const { rows } = await db.client.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [KEY] });
      const offset = rows[0] ? Number(rows[0].value) : 0;
      return Number.isFinite(offset) ? offset : 0;
    },

    async save(offsetMs) {
      await db.ready;
      await db.client.execute({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        args: [KEY, String(offsetMs)],
      });
    },

    async advanceBy(ms) {
      await db.ready;
      // Une seule requête : la base ajoute l'avance à la valeur enregistrée (aucun clic perdu).
      const { rows } = await db.client.execute({
        sql: `INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT (key) DO UPDATE SET value = CAST(settings.value AS INTEGER) + CAST(excluded.value AS INTEGER)
              RETURNING value`,
        args: [KEY, String(ms)],
      });
      return Number(rows[0].value);
    },
  };
}
