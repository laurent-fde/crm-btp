# CRM-BTP

Une démo de mini CRM de suivi de leads froids (artisans du bâtiment), pilotée par webhooks, construite lot par lot.

@AGENTS.md

## Avant tout travail
- Lis INTENT.md avant tout travail.
- Lis les règles du projet dans .claude/rules/ (une par couche).

## Commandes
- `pnpm dev` : lancer l'app en local
- `pnpm build` : construire l'app
- `pnpm start` : lancer l'app construite
- `pnpm lint` : vérifier le code avec ESLint (bloque aussi les imports interdits entre couches)
- `pnpm test` : lancer les tests (Vitest)
- `pnpm typecheck` : vérifier les types TypeScript

## Stack
- Next.js 16 (App Router, dossier `src/app/`), React 19, TypeScript, Tailwind CSS 4.
- Gestionnaire de paquets : pnpm.

## Architecture
3 couches, avec un cœur métier séparé : le service définit ses besoins (ports), la couche données les implémente.
- Présentation : `src/app/` (pages, plus tard `api/webhooks/`) et `src/presentation/` (actions, composants, providers). Obtient ses services par `@/composition`, jamais par `@/data`. Un webhook est une porte d'entrée comme l'écran.
- Service : `src/services/`.
  - `domain/` : règles métier pures (étape suivante, doublon, lead perdu…). Aucune dépendance : ni base, ni date système, ni interface.
  - `ports.ts` : les interfaces dont le service a besoin (dépôts, `Clock`, plus tard `EmailSender`).
  - `*.service.ts` : cas d'usage. Reçoivent leurs ports en paramètre (`createXService({ repository, clock })`) et valident toute saisie.
- Données : `src/data/`. Adaptateurs vers l'extérieur : base libsql, horloge système, fournisseur d'e-mails. N'importe du service que `@/services/ports`.
- Composition : `src/composition.ts`, le seul fichier qui branche les vrais adaptateurs aux services (`getXService()`). Ce n'est pas une couche, c'est le câblage.
- L'heure passe toujours par le port `Clock`, jamais `new Date()` dans le domaine ou le service : c'est ce qui permet de simuler le passage du temps.
- Changer de base (SQLite → Turso) ou de fournisseur d'e-mails ne modifie que `src/data/` (et au plus `src/composition.ts`).
- `pnpm lint` bloque les imports interdits entre couches.
- Les fichiers `.claude/rules/` viennent de Pipeline et seront réécrits (étape règles) : en cas de contradiction, cette section fait foi.
Chaque test est à côté du fichier testé (`*.test.ts`).

## Design system
À définir (étape design system).

## Git
- On travaille sur dev. Jamais de commit direct sur main.
- Un seul commit par lot : feat(lot-N): <titre du lot>.
- Les PR vont de dev vers main.

## Secrets
- Les valeurs vont dans .env.local, ignoré par Git (.gitignore exclut .env*).
- .env.example (versionné) liste les variables sans valeur : toute nouvelle variable y est ajoutée.
- Ne lis jamais .env ni .env.local.
