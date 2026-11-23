import { getWebhookService } from "@/composition";

// Porte d'entrée des événements extérieurs (ouvert, cliqué, page visitée, RDV pris).
// La route lit la requête (corps brut + signature), appelle le service, traduit le résultat en code HTTP. Rien d'autre.
const STATUS = { signature: 401, invalid: 400, unavailable: 503 } as const;

export async function POST(request: Request) {
  // Le corps brut, tel que reçu : c'est lui qui est signé.
  const body = await request.text();
  const result = await getWebhookService().receive(body, request.headers.get("x-webhook-signature"));

  // Un doublon répond 200 aussi : l'expéditeur sait que l'événement est reçu et arrête de le renvoyer.
  if (result.ok) return Response.json({ ok: true, duplicate: result.duplicate });
  return Response.json({ error: result.message }, { status: STATUS[result.reason] });
}
