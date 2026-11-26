# ADR 002 — 3 couches, cœur métier séparé, câblage unique dans composition.ts

- Status: accepted
- Date: 2026-11-23 (écrit a posteriori le 2026-11-26, d'après le commit 7eca6b7)
- Scope: framing

## Context
`INTENT.md` impose 3 couches (présentation, service, données), une base que seule la couche données
touche, et un fournisseur d'e-mails remplaçable. Le code est écrit par un agent, lot par lot : une règle
qui ne repose que sur la discipline finit par céder.

## Decision
- Présentation : `src/app/` et `src/presentation/`. Service : `src/services/` avec `domain/` (règles
  pures), `ports.ts` (interfaces) et `*.service.ts` (cas d'usage). Données : `src/data/` (adaptateurs).
- Le service définit ses ports, la couche données les implémente, `src/composition.ts` est le seul
  fichier qui branche les deux.
- `pnpm lint` (ESLint `no-restricted-imports`) bloque tout import qui viole ce sens.

## Considered options
- La présentation appelle directement la couche données — rejected because `INTENT.md` exige que le
  webhook et l'écran passent par le même service, qui valide.
- Couches tenues par convention seulement, sans lint — rejected because un agent qui travaille vite
  contourne une règle qu'aucun outil ne vérifie (reconstitué a posteriori).

## Consequences
Changer de base ou de fournisseur d'e-mails ne touche que `src/data/` et `composition.ts`. Le domaine se
teste sans rien simuler, le service avec de faux ports. En contrepartie, chaque nouveau besoin passe par
un port et une ligne de câblage, et `src/proxy.ts` demande une exception documentée dans le lint.
