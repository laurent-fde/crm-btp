// Données · adaptateur qui implémente le port LeadRepository avec la base libsql.
// Aucune règle métier : lit et écrit, sans rien décider. Requêtes toujours paramétrées.

import type { Row } from "@libsql/client";
import type { Lead, LeadEvent, LeadEventType, LeadRepository, Stage } from "@/services/ports";
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

function toEvent(row: Row): LeadEvent {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    type: String(row.type) as LeadEventType,
    occurredAt: new Date(String(row.occurred_at)),
  };
}

export function createLeadRepository(db: Database): LeadRepository {
  return {
    async insert(lead, firstEvent) {
      await db.ready;
      // Une seule transaction : le lead et son premier événement, ou rien.
      await db.client.batch(
        [
          {
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
          },
          {
            sql: "INSERT INTO lead_events (id, lead_id, type, occurred_at) VALUES (?, ?, ?, ?)",
            args: [firstEvent.id, firstEvent.leadId, firstEvent.type, firstEvent.occurredAt.toISOString()],
          },
        ],
        "write",
      );
    },

    async findAll() {
      await db.ready;
      const { rows } = await db.client.execute(
        "SELECT id, name, company, trade, city, postal_code, email, phone, stage, created_at FROM leads ORDER BY created_at DESC",
      );
      return rows.map(toLead);
    },

    async findById(id) {
      await db.ready;
      const { rows } = await db.client.execute({
        sql: "SELECT id, name, company, trade, city, postal_code, email, phone, stage, created_at FROM leads WHERE id = ?",
        args: [id],
      });
      return rows[0] ? toLead(rows[0]) : null;
    },

    async updateDetails(id, details) {
      await db.ready;
      // Les 7 champs de la fiche seulement : l'étape et la date de création ne sont jamais réécrites.
      const { rowsAffected } = await db.client.execute({
        sql: "UPDATE leads SET name = ?, company = ?, trade = ?, city = ?, postal_code = ?, email = ?, phone = ? WHERE id = ?",
        args: [details.name, details.company, details.trade, details.city, details.postalCode, details.email, details.phone, id],
      });
      return rowsAffected > 0;
    },

    async listEvents(leadId) {
      await db.ready;
      const { rows } = await db.client.execute({
        sql: "SELECT id, lead_id, type, occurred_at FROM lead_events WHERE lead_id = ? ORDER BY occurred_at, rowid",
        args: [leadId],
      });
      return rows.map(toEvent);
    },
  };
}
