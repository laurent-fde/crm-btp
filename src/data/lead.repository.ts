// Données · adaptateur qui implémente le port LeadRepository avec la base libsql.
// Aucune règle métier : lit et écrit, sans rien décider. Requêtes toujours paramétrées.

import type { Row } from "@libsql/client";
import type { Lead, LeadRepository, Stage } from "@/services/ports";
import type { Database } from "./db";

const text = (value: unknown) => (value == null ? null : String(value));

function toLead(row: Row): Lead {
  return {
    id: String(row.id),
    name: String(row.name),
    company: text(row.company),
    trade: text(row.trade),
    city: text(row.city),
    postalCode: text(row.postal_code),
    email: String(row.email),
    phone: text(row.phone),
    stage: String(row.stage) as Stage,
    createdAt: new Date(String(row.created_at)),
  };
}

export function createLeadRepository(db: Database): LeadRepository {
  return {
    async insert(lead) {
      await db.ready;
      await db.client.execute({
        sql: "INSERT INTO leads (id, name, company, trade, city, postal_code, email, phone, stage, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          lead.id,
          lead.name,
          lead.company,
          lead.trade,
          lead.city,
          lead.postalCode,
          lead.email,
          lead.phone,
          lead.stage,
          lead.createdAt.toISOString(),
        ],
      });
    },

    async findAll() {
      await db.ready;
      const { rows } = await db.client.execute(
        "SELECT id, name, company, trade, city, postal_code, email, phone, stage, created_at FROM leads ORDER BY created_at DESC",
      );
      return rows.map(toLead);
    },
  };
}
