// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Clock } from "@/services/ports";
import { openDatabase, type Database } from "./db";
import { createLeadRepository } from "./lead.repository";
import { createSimulatedEmailSender } from "./simulated-email-sender";

const clock: Clock = { now: () => new Date("2026-11-23T09:00:00.000Z") };

describe("données · simulated-email-sender", () => {
  const opened: Database[] = [];
  afterEach(() => opened.splice(0).forEach((db) => db.client.close()));

  // Critère 4 (lot 3) : le faux fournisseur enregistre l'envoi, sans rien expédier.
  it("garde chaque envoi dans sent_emails et renvoie un identifiant de message", async () => {
    const db = openDatabase(":memory:");
    opened.push(db);
    await createLeadRepository(db).insert(
      {
        id: "lead-1",
        name: "Karim",
        company: null,
        trade: null,
        city: null,
        postalCode: null,
        email: "karim@exemple.fr",
        phone: null,
        stage: "nouveau",
        createdAt: clock.now(),
      },
      { id: "c", leadId: "lead-1", type: "lead_cree", occurredAt: clock.now() },
    );
    const sender = createSimulatedEmailSender(db, clock);

    const { messageId } = await sender.send({
      leadId: "lead-1",
      step: 1,
      to: "karim@exemple.fr",
      subject: "Objet",
      body: "Bonjour Karim",
    });

    expect(messageId).toMatch(/^sim-/);
    const { rows } = await db.client.execute("SELECT * FROM sent_emails");
    expect(rows.map((r) => ({ ...r }))).toEqual([
      {
        message_id: messageId,
        lead_id: "lead-1",
        step: 1,
        recipient: "karim@exemple.fr",
        subject: "Objet",
        body: "Bonjour Karim",
        sent_at: "2026-11-23T09:00:00.000Z",
      },
    ]);
  });
});
