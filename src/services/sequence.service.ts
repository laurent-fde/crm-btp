// Service · séquence d'e-mails : envoyer l'e-mail suivant à un lead, par le fournisseur d'e-mails.

import {
  emailTemplate,
  isFinalEmail,
  nextEmailStep,
  sequenceBlockedReason,
  sequenceDoneMessage,
  sequenceStatus,
  stageAfterEmail,
} from "./domain/sequence";
import { withDefaults } from "./domain/settings";
import type { Clock, EmailSender, IdGenerator, LeadRepository, SettingsRepository } from "./ports";

export type SequenceServiceDeps = {
  repository: LeadRepository;
  emailSender: EmailSender;
  settings: SettingsRepository;
  clock: Clock;
  ids: IdGenerator;
};

export type SendEmailResult = { ok: true; step: number } | { ok: false; message: string };

const NOT_FOUND = "Ce lead n'existe pas ou plus.";
const SEND_FAILED = "Envoi impossible pour le moment. Réessaie dans un instant.";
const RECORD_FAILED = "L'e-mail est parti mais n'a pas pu être enregistré. Recharge la fiche.";

export function createSequenceService({ repository, emailSender, settings, clock, ids }: SequenceServiceDeps) {
  return {
    async sendNextEmail(leadId: string): Promise<SendEmailResult> {
      if (!leadId.trim()) return { ok: false, message: NOT_FOUND };

      let lead, events, length;
      try {
        lead = await repository.findById(leadId);
        if (!lead) return { ok: false, message: NOT_FOUND };
        events = await repository.listEvents(leadId);
        // La longueur réglée au moment de l'envoi.
        length = withDefaults(await settings.load()).sequenceLength;
      } catch {
        return { ok: false, message: SEND_FAILED };
      }

      const blocked = sequenceBlockedReason(lead.stage);
      if (blocked) return { ok: false, message: blocked };
      const step = nextEmailStep(events, length);
      if (!step) return { ok: false, message: sequenceDoneMessage(sequenceStatus(lead.stage, events, length).sent) };

      // 1. Le fournisseur envoie. En cas d'échec, rien n'est enregistré.
      const { subject, body } = emailTemplate(step, length, lead);
      try {
        await emailSender.send({ leadId, step, to: lead.email, subject, body });
      } catch {
        return { ok: false, message: SEND_FAILED };
      }

      // 2. L'envoi et le changement d'étape sont enregistrés ensemble.
      const nextStage = stageAfterEmail(lead.stage);
      try {
        await repository.recordEmailSent(
          {
            id: ids.next(),
            leadId,
            type: "email_envoye",
            emailStep: step,
            emailFinal: isFinalEmail(step, length),
            occurredAt: clock.now(),
          },
          nextStage === lead.stage ? null : { from: lead.stage, to: nextStage },
        );
      } catch {
        return { ok: false, message: RECORD_FAILED };
      }
      return { ok: true, step };
    },
  };
}

export type SequenceService = ReturnType<typeof createSequenceService>;
