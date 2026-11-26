# ADR 003 — Design system B · Atelier

- Status: accepted
- Date: 2026-11-23 (écrit a posteriori le 2026-11-26, d'après le commit 9e8a179)
- Scope: framing

## Context
Une démo montrée à des artisans du bâtiment, avec composants shadcn. Chaque écran doit exister en clair
et en sombre, et les 7 étapes d'un lead doivent se distinguer d'un coup d'œil.

## Decision
B · Atelier : brique et crème, formes arrondies, boutons et badges en pilule. Polices Fraunces (titres),
Source Sans 3 (texte), JetBrains Mono (dates, codes). Thème dans `src/app/globals.css` (`:root` clair,
`.dark` sombre), avec une couleur par étape (`stage-*`) et une pour le lead chaud (`hot`).

## Considered options
Les trois propositions sont dans `design-options.html` :
- A · Chantier (jaune signalisation et ardoise, angles nets) — rejected : choix de Laurent, raison non consignée.
- C · Plan (bleu plan, quadrillage, dense) — rejected : choix de Laurent, raison non consignée.

## Consequences
Aucune couleur en dur hors `globals.css` : la règle présentation et l'agent `revue` le vérifient. Changer
de direction visuelle ne touche que le thème, pas les composants.
