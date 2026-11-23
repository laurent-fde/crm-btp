// Service · signature des webhooks : HMAC-SHA256 du corps brut avec le secret partagé, écrite « sha256=<hex> ».

import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhook(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

// Comparaison à durée constante : on ne révèle pas, par le temps de réponse, combien de caractères sont justes.
export function verifyWebhook(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signWebhook(body, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
