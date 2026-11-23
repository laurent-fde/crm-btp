// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Lead, LeadEvent, Stage } from "./ports";
import { createFakeIds, createFakeLeadRepository } from "./testing/fakes";
import { signWebhook } from "./webhook-signature";
import { createWebhookService } from "./webhook.service";

const secret = "secret-de-test";
const karim: Lead = {
  id: "lead-k",
  name: "Karim Benali",
  company: null,
  trade: "Électricien",
  city: "Lyon",
  postalCode: null,
  email: "karim@exemple.fr",
  phone: null,
  stage: "email_envoye",
  createdAt: new Date("2026-11-20T08:00:00.000Z"),
};

function setup(stage: Stage = "email_envoye", events: LeadEvent[] = []) {
  const fake = createFakeLeadRepository([{ ...karim, stage }], events);
  const service = createWebhookService({ repository: fake.repository, ids: createFakeIds("event"), secret });
  return { ...fake, service };
}

const payload = (fields: Record<string, unknown> = {}) =>
  JSON.stringify({ id: "evt-1", type: "email_ouvert", leadId: "lead-k", occurredAt: "2026-11-23T09:00:00.000Z", ...fields });
const signed = (body: string) => [body, signWebhook(body, secret)] as const;

describe("service · webhook.service · receive", () => {
  // Critère 1 (lot 4) : « E-mail envoyé » + ouvert → « Ouvert », l'événement est dans l'historique.
  it("fait passer un lead « E-mail envoyé » dans « Ouvert » et garde l'événement", async () => {
    const { service, leads, events } = setup();

    const result = await service.receive(...signed(payload()));

    expect(result).toEqual({ ok: true, duplicate: false });
    expect(leads[0].stage).toBe("ouvert");
    expect(events).toEqual([
      {
        id: "event-1",
        leadId: "lead-k",
        type: "email_ouvert",
        occurredAt: new Date("2026-11-23T09:00:00.000Z"),
        externalId: "evt-1",
      },
    ]);
  });

  // Critère 2 (lot 4) : « Page visitée » + ouvert → reste « Page visitée », l'événement est gardé.
  it("ne fait pas reculer un lead « Page visitée », mais garde l'événement", async () => {
    const { service, leads, events } = setup("page_visitee");

    await service.receive(...signed(payload()));

    expect(leads[0].stage).toBe("page_visitee");
    expect(events).toHaveLength(1);
  });

  // Critère 3 (lot 4) : « RDV pris » → « Gagné ».
  it("fait passer le lead dans « Gagné » sur un RDV pris", async () => {
    const { service, leads } = setup("lien_clique");

    await service.receive(...signed(payload({ type: "rdv_pris" })));

    expect(leads[0].stage).toBe("gagne");
  });

  it("fait revenir un lead perdu à l'étape de son action", async () => {
    const { service, leads } = setup("perdu");

    await service.receive(...signed(payload({ type: "lien_clique" })));

    expect(leads[0].stage).toBe("lien_clique");
  });

  it("refuse un événement non signé ou mal signé, sans rien modifier", async () => {
    const { service, leads, events } = setup();

    for (const signature of [null, "sha256=00", signWebhook(payload(), "autre-secret")]) {
      expect(await service.receive(payload(), signature)).toEqual({
        ok: false,
        reason: "signature",
        message: "Signature absente ou invalide.",
      });
    }
    expect(leads[0].stage).toBe("email_envoye");
    expect(events).toEqual([]);
  });

  it("ne compte qu'une fois un événement déjà reçu (même identifiant)", async () => {
    const { service, leads, events } = setup();

    await service.receive(...signed(payload()));
    const second = await service.receive(...signed(payload({ type: "lien_clique" })));

    expect(second).toEqual({ ok: true, duplicate: true });
    expect(events).toHaveLength(1);
    expect(leads[0].stage).toBe("ouvert");
  });

  it.each([
    ["lead inconnu", payload({ leadId: "inconnu" }), "Lead inconnu."],
    ["type inconnu", payload({ type: "email_supprime" }), "Événement mal formé."],
    ["date absente", payload({ occurredAt: undefined }), "Événement mal formé."],
    ["JSON illisible", "{pas du json", "Événement mal formé."],
  ])("refuse un événement mal formé (%s), sans rien modifier", async (_cas, body, message) => {
    const { service, leads, events } = setup();

    expect(await service.receive(...signed(body))).toEqual({ ok: false, reason: "invalid", message });
    expect(leads[0].stage).toBe("email_envoye");
    expect(events).toEqual([]);
  });

  it("renvoie un refus « indisponible » si la base est en panne", async () => {
    const { service, repository } = setup();
    repository.recordEvent = async () => {
      throw new Error("base injoignable");
    };

    expect(await service.receive(...signed(payload()))).toEqual({
      ok: false,
      reason: "unavailable",
      message: "Enregistrement impossible pour le moment.",
    });
  });
});

describe("service · webhook.service · date de l'événement", () => {
  it("date l'événement avec l'heure fournie par l'expéditeur", async () => {
    const fake = createFakeLeadRepository([karim]);
    const service = createWebhookService({ repository: fake.repository, ids: createFakeIds(), secret });

    await service.receive(...signed(payload({ occurredAt: "2026-11-22T07:30:00.000Z" })));

    expect(fake.events[0].occurredAt).toEqual(new Date("2026-11-22T07:30:00.000Z"));
  });
});
