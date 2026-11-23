// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead, Stage } from "@/services/ports";
import { createFakeClock, createFakeIds, createFakeLeadRepository } from "@/services/testing/fakes";
import { signWebhook } from "@/services/webhook-signature";
import { createWebhookService } from "@/services/webhook.service";

// La route est testée avec le vrai service webhook, branché sur de faux dépôts (aucune vraie base).
const secret = "secret-de-test";
let fake: ReturnType<typeof createFakeLeadRepository>;
vi.mock("@/composition", () => ({
  getWebhookService: async () =>
    createWebhookService({ repository: fake.repository, ids: createFakeIds("event"), secret, clock: createFakeClock() }),
}));
const { POST } = await import("./route");

const karim: Lead = {
  id: "lead-k",
  name: "Karim Benali",
  company: null,
  trade: "Électricien",
  city: "Lyon",
  postalCode: null,
  email: "karim@exemple.fr",
  phone: null,
  stage: "ouvert",
  createdAt: new Date("2026-11-20T08:00:00.000Z"),
};

const setStage = (stage: Stage) => {
  fake = createFakeLeadRepository([{ ...karim, stage }]);
};
const body = (fields: Record<string, unknown> = {}) =>
  JSON.stringify({ id: "evt-1", type: "lien_clique", leadId: "lead-k", occurredAt: "2026-11-23T10:00:00+01:00", ...fields });
const post = (raw: string, signature: string | null = signWebhook(raw, secret)) =>
  POST(
    new Request("https://crm-btp.example/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(signature ? { "X-Webhook-Signature": signature } : {}) },
      body: raw,
    }),
  );

describe("présentation · route POST /api/webhooks", () => {
  beforeEach(() => setStage("ouvert"));

  // Critère 1 : « Ouvert » + « lien cliqué » bien signé → « Lien cliqué ».
  it("répond 200 et fait passer un lead « Ouvert » dans « Lien cliqué »", async () => {
    const response = await post(body());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: false });
    expect(fake.leads[0].stage).toBe("lien_clique");
  });

  // Critère 2 : non signé ou mal signé → 401, aucun lead ne bouge.
  it.each([
    ["non signé", null],
    ["mal signé", signWebhook(body(), "mauvais-secret")],
  ])("refuse un webhook %s (401) sans rien modifier", async (_, signature) => {
    const response = await post(body(), signature);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Signature absente ou invalide." });
    expect(fake.leads[0].stage).toBe("ouvert");
    expect(fake.events).toEqual([]);
  });

  // Critère 3 : même identifiant reçu 2 fois → compté une fois.
  it("ne compte qu'une fois un événement reçu deux fois (200 puis 200 « duplicate »)", async () => {
    const first = await post(body());
    const second = await post(body());

    expect(await first.json()).toEqual({ ok: true, duplicate: false });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ ok: true, duplicate: true });
    expect(fake.events).toHaveLength(1);
    expect(fake.leads[0].stage).toBe("lien_clique");
  });

  // Critère 4 : « RDV pris » signé → « Gagné ».
  it("fait passer le lead dans « Gagné » sur un RDV pris", async () => {
    const response = await post(body({ type: "rdv_pris" }));

    expect(response.status).toBe(200);
    expect(fake.leads[0].stage).toBe("gagne");
  });

  // Critère 5 : mal formé (lead inconnu, type inconnu) → 400, rien ne change.
  it.each([
    ["lead inconnu", body({ leadId: "inconnu" }), "Lead inconnu."],
    ["type inconnu", body({ type: "email_supprime" }), "Événement mal formé."],
  ])("refuse un événement mal formé (%s) en 400 sans rien modifier", async (_, raw, error) => {
    const response = await post(raw);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(fake.leads[0].stage).toBe("ouvert");
    expect(fake.events).toEqual([]);
  });

  it("répond 503 si la base est en panne", async () => {
    fake.repository.recordEvent = async () => {
      throw new Error("base injoignable");
    };

    const response = await post(body());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Enregistrement impossible pour le moment." });
  });

  // #15 : un corps démesuré est refusé avant tout calcul de signature, sans appeler le service.
  it("refuse en 413 un corps de plus de 64 Ko, sans rien modifier", async () => {
    const raw = body({ id: "x".repeat(70 * 1024) });

    const response = await post(raw);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Événement trop volumineux (64 Ko au plus)." });
    expect(fake.leads[0].stage).toBe("ouvert");
    expect(fake.events).toEqual([]);
  });

  it("accepte un corps de 64 Ko tout juste (il passe au service)", async () => {
    const raw = "x".repeat(64 * 1024);

    const response = await post(raw);

    expect(response.status).toBe(400); // mal formé, mais lu et transmis au service
  });

  it("refuse en 413 sans lire le corps quand Content-Length annonce plus de 64 Ko", async () => {
    let read = false;
    const stream = new ReadableStream({
      pull(controller) {
        read = true;
        controller.close();
      },
    }, { highWaterMark: 0 }); // le flux ne lit rien tant qu'on ne le lui demande pas
    const request = new Request("https://crm-btp.example/api/webhooks", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    Object.defineProperty(request, "headers", { value: new Headers({ "content-length": String(100 * 1024) }) });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(read).toBe(false);
  });
});
