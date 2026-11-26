# ADR 007 — Verrou facultatif APP_PASSWORD (HTTP Basic) dans src/proxy.ts

- Status: accepted
- Date: 2026-11-23 (écrit a posteriori le 2026-11-26, d'après les commits 5ce0153 et 1494d52)
- Scope: framing

## Context
La démo est en ligne sur Vercel avec des données fictives. L'authentification et le multi-utilisateur
sont hors périmètre de `INTENT.md`, mais on veut pouvoir fermer l'accès.

## Decision
`src/proxy.ts` demande un mot de passe unique (`APP_PASSWORD`) en HTTP Basic sur toute l'app, sauf le
webhook et les fichiers de Next. L'identifiant saisi est ignoré. Sans `APP_PASSWORD`, l'app est ouverte,
en local comme en ligne. Le proxy n'importe que `@/data/access-gate` (exception documentée dans le lint).

## Considered options
- Des comptes utilisateurs — rejected because hors périmètre de `INTENT.md`.
- Un mot de passe obligatoire, avec une réponse 503 s'il manque sur Vercel (commit 5ce0153) — rejected
  le même jour (commit 1494d52) : les données sont fictives, ajouter la variable suffit pour fermer.

## Consequences
Ouvrir ou fermer la démo se fait dans les variables Vercel, sans déploiement de code. Ce n'est pas une
sécurité de comptes : un seul secret partagé.
