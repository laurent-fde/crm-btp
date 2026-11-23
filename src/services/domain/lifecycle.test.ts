import { describe, expect, it } from "vitest";
import type { LeadEvent } from "./lead";
import { lostSince } from "./lifecycle";

const DAY = 86_400_000;
const finalAt = new Date("2026-11-23T09:00:00.000Z");
const at = (days: number) => new Date(finalAt.getTime() + days * DAY);
const event = (type: LeadEvent["type"], occurredAt: Date, extra: Partial<LeadEvent> = {}): LeadEvent => ({
  id: `${type}-${occurredAt.getTime()}`,
  leadId: "lead-k",
  type,
  occurredAt,
  ...extra,
});
// Toute la séquence (3 e-mails), le dernier envoyé à finalAt.
const sequence: LeadEvent[] = [
  event("lead_cree", at(-10)),
  event("email_envoye", at(-6), { emailStep: 1, emailFinal: false }),
  event("email_envoye", at(-3), { emailStep: 2, emailFinal: false }),
  event("email_envoye", finalAt, { emailStep: 3, emailFinal: true }),
];

describe("domaine · lifecycle · lostSince", () => {
  // Critère 1 : tous les e-mails, aucune action, délai de 7 jours écoulé → Perdu, à la date d'échéance.
  it("dit qu'un lead sans action est perdu 7 jours après le dernier e-mail, pas avant", () => {
    expect(lostSince("email_envoye", sequence, new Date(at(7).getTime() - 1), 7)).toBeNull();
    expect(lostSince("email_envoye", sequence, at(7), 7)).toEqual(at(7));
    expect(lostSince("email_envoye", sequence, at(30), 7)).toEqual(at(7));
  });

  // Critère 2 : une action reçue après le dernier e-mail garde le lead en vie.
  it.each(["email_ouvert", "lien_clique", "page_visitee"] as const)("garde en vie un lead qui a eu « %s » après le dernier e-mail", (type) => {
    expect(lostSince("ouvert", [...sequence, event(type, at(2))], at(30), 7)).toBeNull();
  });

  // Choix validé au plan : seules les actions après le dernier e-mail comptent.
  it("compte le délai même si le lead avait agi avant le dernier e-mail", () => {
    const events = [...sequence.slice(0, 2), event("email_ouvert", at(-5)), ...sequence.slice(2)];

    expect(lostSince("ouvert", events, at(7), 7)).toEqual(at(7));
  });

  // Critère 3 : le délai est un réglage.
  it("suit le délai réglé (3 jours)", () => {
    expect(lostSince("email_envoye", sequence, at(2.9), 3)).toBeNull();
    expect(lostSince("email_envoye", sequence, at(3), 3)).toEqual(at(3));
  });

  it("ne perd pas un lead qui n'a pas reçu le dernier e-mail de la séquence", () => {
    expect(lostSince("email_envoye", sequence.slice(0, 3), at(30), 7)).toBeNull();
  });

  it("ne touche ni un lead gagné ni un lead déjà perdu", () => {
    expect(lostSince("gagne", sequence, at(30), 7)).toBeNull();
    expect(lostSince("perdu", sequence, at(30), 7)).toBeNull();
  });

  // Revue #14 : une action reçue au même instant que le dernier e-mail compte.
  it("garde en vie un lead dont l'action arrive au même instant que le dernier e-mail", () => {
    expect(lostSince("ouvert", [...sequence, event("email_ouvert", finalAt)], at(30), 7)).toBeNull();
  });

  // Revue #14 : un vrai webhook garde la date de l'expéditeur (heure réelle) alors que l'horloge de l'app est avancée.
  // C'est la date de réception, à l'horloge de l'app, qui compte.
  it("compte la date de réception d'une action, pas la date donnée par l'expéditeur", () => {
    const action = event("email_ouvert", at(-5), { receivedAt: at(1) });

    expect(lostSince("ouvert", [...sequence, action], at(30), 7)).toBeNull();
  });

  // Revue #14 : un lead revenu de « Perdu » par une action ne repasse pas dans « Perdu » au rendu suivant.
  it("ne refait pas passer dans « Perdu » un lead revenu par une action", () => {
    const events = [...sequence, event("lead_perdu", at(7)), event("lien_clique", at(-2), { receivedAt: at(9) })];

    expect(lostSince("lien_clique", events, at(10), 7)).toBeNull();
  });
});
