import { describe, expect, it } from "vitest";
import type { LeadEvent } from "./lead";
import {
  emailTemplate,
  isFinalEmail,
  nextEmailStep,
  sequenceBlockedReason,
  sequenceDoneMessage,
  sequenceStatus,
  stageAfterEmail,
} from "./sequence";

const sent = (step: number): LeadEvent => ({
  id: `e${step}`,
  leadId: "lead-1",
  type: "email_envoye",
  emailStep: step,
  occurredAt: new Date(`2026-11-2${step}T09:00:00.000Z`),
});
const sentFinal = (step: number): LeadEvent => ({ ...sent(step), emailFinal: true });
const created: LeadEvent = { id: "c", leadId: "lead-1", type: "lead_cree", occurredAt: new Date("2026-11-20T09:00:00.000Z") };

describe("domaine · sequence", () => {
  // Critère 2 (lot 3) : après les e-mails 1 et 2, le suivant est le 3.
  it("donne l'e-mail suivant de la séquence", () => {
    expect(nextEmailStep([created], 3)).toBe(1);
    expect(nextEmailStep([created, sent(1)], 3)).toBe(2);
    expect(nextEmailStep([created, sent(2), sent(1)], 3)).toBe(3);
  });

  // Critère 3 (lot 3) : quand tous les e-mails sont partis, plus rien à envoyer.
  it("ne propose plus rien quand tous les e-mails de la séquence sont partis", () => {
    expect(nextEmailStep([created, sent(1), sent(2), sent(3)], 3)).toBeNull();
  });

  // Séquence réglable : la longueur décide de la fin.
  it("suit la longueur réglée, même pour un lead en cours de séquence", () => {
    expect(nextEmailStep([created, sent(1), sent(2), sent(3)], 5)).toBe(4);
    expect(nextEmailStep([created, sent(1), sent(2)], 2)).toBeNull();
    expect(nextEmailStep([created, sent(1), sent(2), sent(3)], 2)).toBeNull();
  });

  // Revue PR #10 : un lead qui a reçu le dernier e-mail reste terminé, même si la séquence est allongée ensuite.
  it("ne relance pas un lead qui a déjà reçu le dernier e-mail, même après un allongement", () => {
    expect(nextEmailStep([created, sent(1), sent(2), sentFinal(3)], 5)).toBeNull();
    expect(sequenceStatus("email_envoye", [created, sent(1), sent(2), sentFinal(3)], 5)).toEqual({
      sent: 3,
      total: 5,
      next: null,
      blockedReason: null,
    });
  });

  it("dit si un e-mail est le dernier de la séquence", () => {
    expect(isFinalEmail(3, 3)).toBe(true);
    expect(isFinalEmail(2, 3)).toBe(false);
    expect(isFinalEmail(1, 1)).toBe(true);
  });

  it("annonce la fin de la séquence avec le nombre d'e-mails réellement envoyés", () => {
    expect(sequenceDoneMessage(3)).toBe("Séquence terminée (3 e-mails envoyés).");
    expect(sequenceDoneMessage(1)).toBe("Séquence terminée (1 e-mail envoyé).");
  });

  // Critère 1 (lot 3) : un lead « Nouveau » passe dans « E-mail envoyé » ; un lead plus avancé ne recule pas.
  it("fait passer un lead « Nouveau » dans « E-mail envoyé », sans jamais faire reculer un lead plus avancé", () => {
    expect(stageAfterEmail("nouveau")).toBe("email_envoye");
    expect(stageAfterEmail("email_envoye")).toBe("email_envoye");
    expect(stageAfterEmail("ouvert")).toBe("ouvert");
    expect(stageAfterEmail("page_visitee")).toBe("page_visitee");
  });

  it("arrête la séquence pour un lead gagné ou perdu", () => {
    expect(sequenceBlockedReason("gagne")).toBe("Séquence arrêtée : lead gagné.");
    expect(sequenceBlockedReason("perdu")).toBe("Séquence arrêtée : lead perdu.");
    expect(sequenceBlockedReason("nouveau")).toBeNull();
    expect(sequenceBlockedReason("ouvert")).toBeNull();
  });

  it("résume où en est la séquence", () => {
    expect(sequenceStatus("nouveau", [created], 3)).toEqual({ sent: 0, total: 3, next: 1, blockedReason: null });
    expect(sequenceStatus("ouvert", [created, sent(1), sent(2), sent(3)], 3)).toEqual({
      sent: 3,
      total: 3,
      next: null,
      blockedReason: null,
    });
    expect(sequenceStatus("email_envoye", [created, sent(1)], 5)).toEqual({ sent: 1, total: 5, next: 2, blockedReason: null });
    expect(sequenceStatus("gagne", [created, sent(1)], 3)).toEqual({
      sent: 1,
      total: 3,
      next: null,
      blockedReason: "Séquence arrêtée : lead gagné.",
    });
  });

  it("prépare un premier e-mail, des relances et un dernier e-mail, au prénom du lead", () => {
    const lead = { name: "Karim Benali", trade: "Électricien" };
    const objets = [1, 2, 3, 4, 5].map((step) => emailTemplate(step, 5, lead).subject);

    expect(objets[0]).toBe("Plus de chantiers sans démarcher");
    expect(objets[4]).toBe("Je ne vous relancerai plus");
    expect(new Set(objets).size).toBe(5);
    expect(emailTemplate(1, 3, lead).body).toContain("Bonjour Karim");
    expect(emailTemplate(3, 3, lead).subject).toBe("Je ne vous relancerai plus");
  });

  // Revue PR #10 : une séquence d'un seul e-mail envoie la présentation de l'offre.
  it("envoie la présentation quand la séquence ne compte qu'un e-mail", () => {
    expect(emailTemplate(1, 1, { name: "Karim", trade: null }).subject).toBe("Plus de chantiers sans démarcher");
  });
});
