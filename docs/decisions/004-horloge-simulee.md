# ADR 004 — Horloge de l'app : heure réelle + décalage enregistré

- Status: accepted
- Date: 2026-11-23 (écrit a posteriori le 2026-11-26, d'après le commit 07ac196)
- Scope: story lot-6

## Context
`INTENT.md` demande de voir un lead passer dans « Perdu » sans attendre 7 jours. Les règles métier
(« Perdu », lead « chaud » sur 48 h) dépendent de l'heure.

## Decision
- Le service ne lit l'heure que par le port `Clock` (`clock.now()`), jamais `new Date()`.
- L'horloge de l'app = l'heure système + un décalage en millisecondes, enregistré dans la table `settings` (clé `clock_offset_ms`, `withOffset` dans
  `src/data/system-clock.ts`). Le temps continue de s'écouler, la date simulée survit au redémarrage.
- `composition.ts` relit le décalage à chaque service créé (`appClock()`), verrouillé par
  `src/composition.test.ts` (#19).

## Considered options
- Une date simulée figée — rejected because le temps doit continuer de s'écouler pendant la démo
  (commentaire de `withOffset`).
- Antidater les leads et événements en base — rejected because cela fausse l'historique au lieu de
  simuler le temps (reconstitué a posteriori).

## Consequences
Toutes les règles de temps se testent avec une fausse horloge. Revenir à aujourd'hui laisse des
événements datés dans le futur : ils sont signalés (#17). Une page qui lit l'heure doit
`await connection()` avant (#25, voir « Pièges » dans `CLAUDE.md`).
