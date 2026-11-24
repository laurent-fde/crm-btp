# ADR 001 — libsql : SQLite en local, Turso en ligne

- Status: accepted
- Date: 2026-11-22
- Scope: framing

## Context
Démo hébergée sur Vercel, dont le disque ne dure pas : un fichier SQLite y perdrait les leads.
En local, aucun compte ni service à lancer.

## Decision
`@libsql/client`, ouvert une seule fois dans `src/data/db.ts` : fichier SQLite en local,
Turso dès que `DATABASE_URL` est définie. Migrations numérotées dans `db.ts`,
suivies par la table `schema_migrations` (Turso refuse `PRAGMA user_version`).

## Considered options
- SQLite seul, fichier sur Vercel — rejected because le disque n'est pas durable.

## Consequences
Même SQL en local et en ligne. Changer de base ne touche que `src/data/` (et `src/composition.ts`).
Sur Vercel, une `DATABASE_URL` manquante fait planter l'app au lieu de perdre des données.
