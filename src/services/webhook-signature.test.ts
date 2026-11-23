// @vitest-environment node
import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhook } from "./webhook-signature";

const secret = "secret-de-test";
const body = '{"id":"evt-1","type":"email_ouvert"}';

describe("service · webhook-signature", () => {
  it("signe un corps en HMAC-SHA256 (sha256=<hex>) et reconnaît sa signature", () => {
    const signature = signWebhook(body, secret);

    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(verifyWebhook(body, signature, secret)).toBe(true);
  });

  it("refuse une signature absente, mal formée, d'un autre secret ou d'un corps modifié", () => {
    const signature = signWebhook(body, secret);

    expect(verifyWebhook(body, null, secret)).toBe(false);
    expect(verifyWebhook(body, "", secret)).toBe(false);
    expect(verifyWebhook(body, "sha256=abc", secret)).toBe(false);
    expect(verifyWebhook(body, signWebhook(body, "autre-secret"), secret)).toBe(false);
    expect(verifyWebhook(`${body} `, signature, secret)).toBe(false);
  });
});
