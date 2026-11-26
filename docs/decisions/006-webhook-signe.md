# ADR 006 — Webhook signé HMAC-SHA256, simulation par le même chemin

- Status: accepted
- Date: 2026-11-23 (écrit a posteriori le 2026-11-26, d'après les commits des lots 4 et 5)
- Scope: story lot-4, lot-5

## Context
`INTENT.md` : un webhook n'est accepté que s'il est signé avec le secret partagé, un même événement reçu
deux fois ne compte qu'une fois, et la simulation depuis l'app prend le même chemin que le vrai.

## Decision
- `POST /api/webhooks` lit le corps brut (64 Ko au plus, refus 413 avant la signature, #15) et l'en-tête
  `X-Webhook-Signature: sha256=<hex>`, HMAC-SHA256 du corps avec `WEBHOOK_SECRET`, comparé à durée constante.
- Le service webhook valide l'événement (Zod), ignore un doublon par son identifiant externe (index
  unique), fait avancer le lead. Réponses : 200 (doublon compris), 401, 400, 413, 503.
- La simulation fabrique un événement signé et appelle ce même service.
- Le webhook est exclu du verrou `APP_PASSWORD` : sa signature le protège.

## Considered options
- Une simulation qui modifie la base directement — rejected because `INTENT.md` exige le même chemin
  que le vrai webhook.
- Un webhook non signé — rejected because exigé par `INTENT.md`.

## Consequences
Un doublon répond 200 pour que l'expéditeur arrête de renvoyer. Sur Vercel, un `WEBHOOK_SECRET` manquant
fait planter au lieu d'accepter le secret de développement.
