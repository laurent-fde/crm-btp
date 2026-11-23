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
    ...(row.email_step != null && { emailStep: Number(row.email_step) }),
    ...(row.email_final != null && { emailFinal: Number(row.email_final) === 1 }),
    ...(row.external_id != null && { externalId: String(row.external_id) }),
    ...(row.received_at != null && { receivedAt: new Date(String(row.received_at)) }),
  };
}

const insertEvent = (event: LeadEvent) => ({
  sql: "INSERT INTO lead_events (id, lead_id, type, occurred_at, email_step, email_final, external_id, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  args: [
    event.id,
    event.leadId,
    event.type,
    event.occurredAt.toISOString(),
    event.emailStep ?? null,
    event.emailFinal === undefined ? null : event.emailFinal ? 1 : 0,
    event.externalId ?? null,
    event.receivedAt?.toISOString() ?? null,
  ],
});

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
          insertEvent(firstEvent),
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
        sql: "SELECT id, lead_id, type, occurred_at, email_step, email_final, external_id, received_at FROM lead_events WHERE lead_id = ? ORDER BY occurred_at, rowid",
        args: [leadId],
      });
      return rows.map(toEvent);
    },

    async findEventByExternalId(externalId) {
      await db.ready;
      const { rows } = await db.client.execute({
        sql: "SELECT id, lead_id, type, occurred_at, email_step, email_final, external_id, received_at FROM lead_events WHERE external_id = ?",
        args: [externalId],
      });
      return rows[0] ? toEvent(rows[0]) : null;
    },

    async lastEventDates(types) {
      await db.ready;
      if (types.length === 0) return {};
      const { rows } = await db.client.execute({
        sql: `SELECT lead_id, MAX(occurred_at) AS last FROM lead_events WHERE type IN (${types.map(() => "?").join(", ")}) GROUP BY lead_id`,
        args: [...types],
      });
      return Object.fromEntries(rows.map((row) => [String(row.lead_id), new Date(String(row.last))]));
    },

    async recordEvent(event, stageChange) {
      await db.ready;
      // Une seule transaction. L'étape ne change que si le lead est encore à « from ».
      const statements = [insertEvent(event)];
      if (stageChange) {
        statements.push({
          sql: "UPDATE leads SET stage = ? WHERE id = ? AND stage = ?",
          args: [stageChange.to, event.leadId, stageChange.from],
        });
      }
      await db.client.batch(statements, "write");
    },

    async recordStageChange(event, stageChange) {
      await db.ready;
      // Une seule transaction : l'étape change si le lead est encore à « from », et l'événement n'est écrit
      // que si cette mise à jour a touché une ligne (changes() = 1).
      const [update] = await db.client.batch(
        [
          { sql: "UPDATE leads SET stage = ? WHERE id = ? AND stage = ?", args: [stageChange.to, event.leadId, stageChange.from] },
          {
            sql: "INSERT INTO lead_events (id, lead_id, type, occurred_at, email_step, email_final, external_id, received_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1",
            args: insertEvent(event).args,
          },
        ],
        "write",
      );
      return update.rowsAffected > 0;
    },
  };
}
