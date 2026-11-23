// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Lead } from "./ports";
import { createSimulationService } from "./simulation.service";
import { createFakeClock, createFakeIds, createFakeLeadRepository } from "./testing/fakes";
import { verifyWebhook } from "./webhook-signature";
import { createWebhookService } from "./webhook.service";

const secret = "secret-de-test";
const karim: Lead = {
  id: "lead-k",
  name: "Karim Benali",
  company: null,
  trade: null,
  city: null,
  postalCode: null,
  email: "karim@exemple.fr",
  phone: null,
  stage: "email_envoye",
  createdAt: new Date("2026-11-20T08:00:00.000Z"),
};

function setup(id = karim.id) {
  const fake = createFakeLeadRepository([{ ...karim, id }]);
  const webhook = createWebhookService({ repository: fake.repository, ids: createFakeIds("event"), secret, clock: createFakeClock("2026-11-23T09:00:00.000Z") });
  const received: { body: string; signature: string | null }[] = [];
  const spy = {
    receive: (body: string, signature: string | null) => {
      received.push({ body, signature });
      return webhook.receive(body, signature);
    },
  };
  const service = createSimulationService({
    webhook: spy,
    secret,
    clock: createFakeClock("2026-11-23T09:00:00.000Z"),
    ids: createFakeIds("sim"),
  });
  return { ...fake, received, service };
}

describe("service · simulation.service · simulateAction", () => {
  // Lot 4 : la simulation fabrique un événement signé et prend le même chemin qu'un vrai webhook.
  it("fabrique un événement signé avec le secret partagé et le fait passer par le webhook", async () => {
    const { service, received, leads, events } = setup();

    expect(await service.simulateAction("lead-k", "email_ouvert")).toEqual({ ok: true });

    expect(received).toHaveLength(1);
    expect(verifyWebhook(received[0].body, received[0].signature, secret)).toBe(true);
    expect(JSON.parse(received[0].body)).toEqual({
      id: "sim-1",
      type: "email_ouvert",
      leadId: "lead-k",
      occurredAt: "2026-11-23T09:00:00.000Z",
    });
    expect(leads[0].stage).toBe("ouvert");
    expect(events[0].occurredAt).toEqual(new Date("2026-11-23T09:00:00.000Z"));
  });

  // Critère 3 (lot 4) par la simulation.
  it("fait passer le lead dans « Gagné » quand je simule « RDV pris »", async () => {
    const { service, leads } = setup();

    await service.simulateAction("lead-k", "rdv_pris");

    expect(leads[0].stage).toBe("gagne");
  });

  it("chaque simulation est un nouvel événement (pas pris pour un doublon)", async () => {
    const { service, events } = setup();

    await service.simulateAction("lead-k", "email_ouvert");
    await service.simulateAction("lead-k", "email_ouvert");

    expect(events).toHaveLength(2);
  });

  it("renvoie le message du webhook en cas de refus", async () => {
    const { service } = setup();

    expect(await service.simulateAction("inconnu", "email_ouvert")).toEqual({ ok: false, message: "Lead inconnu." });
    expect(await service.simulateAction("lead-k", "email_supprime")).toEqual({ ok: false, message: "Action inconnue." });
    expect(await service.simulateAction("x".repeat(201), "email_ouvert")).toEqual({ ok: false, message: "Lead inconnu." });
    expect(await service.simulateAction("  ", "email_ouvert")).toEqual({ ok: false, message: "Lead inconnu." });
  });

  // Revue #12 : la limite est de 200 caractères, inclus.
  it("accepte un identifiant de lead de 200 caractères", async () => {
    const { service } = setup("x".repeat(200));

    expect(await service.simulateAction("x".repeat(200), "email_ouvert")).toEqual({ ok: true });
  });
});
