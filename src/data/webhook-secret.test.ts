import { describe, expect, it } from "vitest";
import { DEV_WEBHOOK_SECRET, resolveWebhookSecret } from "./webhook-secret";

describe("données · webhook-secret", () => {
  it("prend WEBHOOK_SECRET quand il est défini", () => {
    expect(resolveWebhookSecret({ WEBHOOK_SECRET: "abc123" })).toBe("abc123");
  });

  it("prend un secret de développement en local quand il manque (ou est vide)", () => {
    expect(resolveWebhookSecret({})).toBe(DEV_WEBHOOK_SECRET);
    expect(resolveWebhookSecret({ WEBHOOK_SECRET: "" })).toBe(DEV_WEBHOOK_SECRET);
  });

  it("refuse de démarrer sur un déploiement Vercel sans secret", () => {
    expect(() => resolveWebhookSecret({ VERCEL_ENV: "production" })).toThrow(/WEBHOOK_SECRET manquant/);
    expect(() => resolveWebhookSecret({ VERCEL_ENV: "preview" })).toThrow(/WEBHOOK_SECRET manquant/);
  });
});
