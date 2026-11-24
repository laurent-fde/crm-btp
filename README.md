# CRM-BTP

Démo d'un mini CRM de suivi de leads froids : des artisans et entreprises du bâtiment, à qui l'on envoie une séquence d'e-mails. Chaque action du destinataire (e-mail ouvert, lien cliqué, page visitée, RDV pris) arrive par un **webhook signé** et fait avancer le lead, sans saisie à la main.

En ligne : https://crm-btp-pi.vercel.app (données fictives).

Étapes d'un lead : Nouveau → E-mail envoyé → Ouvert → Lien cliqué → Page visitée → Gagné (RDV pris), ou Perdu. Un lead n'avance que vers l'avant, et chaque événement reste dans son historique. Seule exception : une action reçue sur un lead Perdu le remet à l'étape de cette action.

Pour la démo, l'horloge de l'app s'avance depuis l'en-tête (+1 jour, +7 jours, retour à aujourd'hui) : un lead qui a reçu toute la séquence sans aucune action passe dans « Perdu » après le délai réglé (7 jours par défaut, dans « Réglages »). La date simulée est conservée après redémarrage.

Revenir à aujourd'hui ne touche pas aux événements créés pendant l'avance : ils gardent leur date simulée, et un lead passé dans « Perdu » y reste. L'en-tête affiche alors combien d'événements sont datés après la date de l'app, et la fiche d'un lead les marque « Daté dans le futur ».

## Lancer en local

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

En local, la base est un fichier SQLite (`.data/crm-btp.db`), créé au premier lancement. Aucune variable n'est nécessaire.

| Commande | Rôle |
|---|---|
| `pnpm test` | tests (Vitest) |
| `pnpm typecheck` | vérification des types |
| `pnpm lint` | ESLint, dont les imports interdits entre couches |
| `pnpm build` / `pnpm start` | construire puis lancer l'app |

## Variables d'environnement

Elles sont listées, sans valeur, dans `.env.example`. En local, mets les tiennes dans `.env.local` (ignoré par Git).

| Variable | En local | En ligne (Vercel) |
|---|---|---|
| `DATABASE_URL` | vide : SQLite | adresse de la base Turso (`libsql://…`) |
| `DATABASE_AUTH_TOKEN` | vide | jeton Turso |
| `WEBHOOK_SECRET` | vide : secret de développement `secret-de-developpement-local` | secret partagé avec l'expéditeur des webhooks |
| `APP_PASSWORD` | vide : pas de verrou | facultatif : mot de passe sur toute l'app (sauf le webhook) |

## Envoyer un webhook

`POST /api/webhooks`, corps JSON, signé en HMAC-SHA256 avec `WEBHOOK_SECRET`. La signature, `sha256=<hex>`, va dans l'en-tête `X-Webhook-Signature`, et elle est calculée sur le corps exact envoyé.

```json
{ "id": "evt-1", "type": "lien_clique", "leadId": "<id du lead>", "occurredAt": "2026-11-23T10:00:00+01:00" }
```

- `id` : identifiant unique de l'événement chez l'expéditeur. Un événement renvoyé avec le même `id` n'est compté qu'une fois.
- `type` : `email_ouvert`, `lien_clique`, `page_visitee` ou `rdv_pris`.
- `leadId` : l'identifiant du lead. Il se lit dans l'adresse de sa fiche : `/?lead=<id>`.
- `occurredAt` : date ISO 8601 avec fuseau. Mets la date du moment : l'historique classe les événements à cette date, et le badge « Chaud » ne vaut que pour une action de moins de 48 h.

Essai avec `curl` (en local, avec le secret de développement ; si tu as défini `WEBHOOK_SECRET` dans `.env.local`, mets cette valeur à la place) :

```bash
WEBHOOK_SECRET=secret-de-developpement-local
BODY='{"id":"evt-1","type":"lien_clique","leadId":"<id du lead>","occurredAt":"2026-11-23T10:00:00+01:00"}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')"
curl -i -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  --data-raw "$BODY"
```

Pour la version en ligne, remplace l'adresse par `https://crm-btp-pi.vercel.app/api/webhooks`, et le secret par le `WEBHOOK_SECRET` de production (Vercel → projet → Settings → Environment Variables).

| Réponse | Quand |
|---|---|
| `200 {"ok":true,"duplicate":false}` | événement enregistré, le lead avance (s'il n'est pas déjà plus loin) |
| `200 {"ok":true,"duplicate":true}` | événement déjà reçu : rien ne change |
| `401` | signature absente ou fausse |
| `400` | événement mal formé, ou lead inconnu |
| `413` | corps de plus de 64 Ko : refusé avant toute vérification |
| `503` | base momentanément indisponible : renvoie plus tard |
| `500` | configuration incomplète en ligne (`WEBHOOK_SECRET` ou `DATABASE_URL` manquant) : l'app refuse de tourner sans |

## Architecture

3 couches, avec un cœur métier séparé :

- `src/app/` et `src/presentation/` : présentation (pages, actions, composants). Le webhook (`src/app/api/webhooks/route.ts`) est une porte d'entrée comme l'écran.
- `src/services/` : domaine (règles pures), ports (interfaces) et cas d'usage, qui valident toute saisie.
- `src/data/` : adaptateurs (base libsql/Turso, horloge, faux fournisseur d'e-mails).
- `src/composition.ts` : le câblage entre services et adaptateurs.

Stack : Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn, libsql (SQLite en local, Turso en ligne), Vitest. Déployé sur Vercel.
