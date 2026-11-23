import { getWebhookService } from "@/composition";

// Porte d'entrée des événements extérieurs (ouvert, cliqué, page visitée, RDV pris).
// La route lit la requête (corps brut + signature), appelle le service, traduit le résultat en code HTTP. Rien d'autre.
const STATUS = { signature: 401, invalid: 400, unavailable: 503 } as const;

// #15 : un événement tient en quelques centaines d'octets. Au-delà de 64 Ko, refus avant tout calcul de signature.
const MAX_BODY_BYTES = 64 * 1024;
const TOO_LARGE = "Événement trop volumineux (64 Ko au plus).";

// Lit le corps brut, en s'arrêtant dès que la limite est dépassée (même si Content-Length est absent ou faux).
// Renvoie null si le corps est trop gros.
async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  // Le corps brut, tel que reçu : c'est lui qui est signé.
  const body = await readBody(request);
  if (body === null) return Response.json({ error: TOO_LARGE }, { status: 413 });
  const result = await (await getWebhookService()).receive(body, request.headers.get("x-webhook-signature"));

  // Un doublon répond 200 aussi : l'expéditeur sait que l'événement est reçu et arrête de le renvoyer.
  if (result.ok) return Response.json({ ok: true, duplicate: result.duplicate });
  return Response.json({ error: result.message }, { status: STATUS[result.reason] });
}
