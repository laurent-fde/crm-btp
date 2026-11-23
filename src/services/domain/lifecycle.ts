// Domaine · cycle de vie d'un lead : quand il passe dans « Perdu ». Règle pure, l'heure est reçue en argument.

import { ACTION_TYPES, type LeadEvent, type LeadEventType, type Stage } from "./lead";

const DAY_MS = 86_400_000;
const isAction = (type: LeadEventType) => (ACTION_TYPES as readonly string[]).includes(type);

// La date à laquelle le lead est devenu « Perdu », ou null s'il ne l'est pas (encore).
// Perdu : le dernier e-mail de la séquence est parti, aucune action n'a suivi, et le délai est écoulé.
// Une action reçue après le dernier e-mail garde le lead en vie ; « Gagné » et « Perdu » ne sont jamais touchés.
export function lostSince(stage: Stage, events: readonly LeadEvent[], now: Date, delayDays: number): Date | null {
  if (stage === "gagne" || stage === "perdu") return null;
  const finals = events.filter((event) => event.type === "email_envoye" && event.emailFinal);
  if (finals.length === 0) return null;
  const finalAt = Math.max(...finals.map((event) => event.occurredAt.getTime()));
  // Une action compte à sa réception (horloge de l'app) : un vrai webhook garde la date de l'expéditeur,
  // à l'heure réelle, même quand l'horloge de l'app est avancée.
  const actedAt = (event: LeadEvent) => (event.receivedAt ?? event.occurredAt).getTime();
  if (events.some((event) => isAction(event.type) && actedAt(event) >= finalAt)) return null;
  const deadline = finalAt + delayDays * DAY_MS;
  return now.getTime() >= deadline ? new Date(deadline) : null;
}
