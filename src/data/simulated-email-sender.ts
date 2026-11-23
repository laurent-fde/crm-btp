// Données · faux fournisseur d'e-mails (V1) : implémente le port EmailSender sans rien expédier.
// Chaque envoi est gardé dans la table sent_emails ; le vrai fournisseur le remplacera dans la composition.

import { randomUUID } from "node:crypto";
import type { Clock, EmailSender } from "@/services/ports";
import type { Database } from "./db";

export function createSimulatedEmailSender(db: Database, clock: Clock): EmailSender {
  return {
    async send(message) {
      await db.ready;
      const messageId = `sim-${randomUUID()}`;
      await db.client.execute({
        sql: "INSERT INTO sent_emails (message_id, lead_id, step, recipient, subject, body, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          messageId,
          message.leadId,
          message.step,
          message.to,
          message.subject,
          message.body,
          clock.now().toISOString(),
        ],
      });
      return { messageId };
    },
  };
}
