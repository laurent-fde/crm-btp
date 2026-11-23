// Domaine · séquence d'e-mails : quel e-mail envoyer, quand s'arrêter, quelle étape après l'envoi. Règles pures.
// La longueur de la séquence est un réglage : elle est toujours reçue en argument.

import { STAGES, type Lead, type LeadEvent, type Stage } from "./lead";

export type SequenceStatus = { sent: number; total: number; next: number | null; blockedReason: string | null };

const sentEmails = (events: readonly LeadEvent[]) => events.filter((event) => event.type === "email_envoye");
const sentSteps = (events: readonly LeadEvent[]) => sentEmails(events).map((event) => event.emailStep ?? 0);

// L'e-mail suivant : celui qui suit le plus haut déjà envoyé ; null quand la séquence est finie.
// Un lead en cours suit la longueur actuelle (allongée : il continue ; raccourcie : il s'arrête),
// sauf s'il a déjà reçu le dernier e-mail : il reste terminé, on ne relance pas après un message d'adieu.
export function nextEmailStep(events: readonly LeadEvent[], length: number): number | null {
  if (sentEmails(events).some((event) => event.emailFinal)) return null;
  const next = Math.max(0, ...sentSteps(events)) + 1;
  return next > length ? null : next;
}

// L'e-mail est-il le dernier de la séquence (celui qui la clôt) ?
export function isFinalEmail(step: number, length: number): boolean {
  return step === length;
}

export function sequenceDoneMessage(sent: number): string {
  return `Séquence terminée (${sent} ${sent === 1 ? "e-mail envoyé" : "e-mails envoyés"}).`;
}

// Un lead « Nouveau » passe dans « E-mail envoyé » ; un lead plus avancé ne recule jamais.
export function stageAfterEmail(stage: Stage): Stage {
  return STAGES.indexOf(stage) < STAGES.indexOf("email_envoye") ? "email_envoye" : stage;
}

// Un lead gagné ou perdu ne reçoit plus la séquence.
export function sequenceBlockedReason(stage: Stage): string | null {
  if (stage === "gagne") return "Séquence arrêtée : lead gagné.";
  if (stage === "perdu") return "Séquence arrêtée : lead perdu.";
  return null;
}

export function sequenceStatus(stage: Stage, events: readonly LeadEvent[], length: number): SequenceStatus {
  const blockedReason = sequenceBlockedReason(stage);
  return {
    sent: new Set(sentSteps(events)).size,
    total: length,
    next: blockedReason ? null : nextEmailStep(events, length),
    blockedReason,
  };
}

// Le contenu (fictif) d'un e-mail : le 1er présente l'offre, le dernier clôt la séquence, ceux du milieu relancent.
export function emailTemplate(step: number, length: number, lead: Pick<Lead, "name" | "trade">): { subject: string; body: string } {
  const firstName = lead.name.trim().split(/\s+/)[0];
  const trade = lead.trade ? lead.trade.toLowerCase() : "artisan";
  if (step === 1) {
    return {
      subject: "Plus de chantiers sans démarcher",
      body: `Bonjour ${firstName},\n\nEn tant que ${trade}, combien de devis perdez-vous faute de temps pour relancer ? Je vous montre en 10 minutes comment nos clients artisans remplissent leur planning.`,
    };
  }
  if (step === length) {
    return {
      subject: "Je ne vous relancerai plus",
      body: `Bonjour ${firstName},\n\nDernier message de ma part : si le sujet vous intéresse, prenez un créneau de 15 minutes. Sinon, bonne continuation sur vos chantiers.`,
    };
  }
  return {
    subject: `Relance ${step - 1} : un exemple concret près de chez vous`,
    body: `Bonjour ${firstName},\n\nUn ${trade} de votre région a signé 4 chantiers le mois dernier grâce à nos relances. Je vous laisse le détail sur cette page.`,
  };
}
