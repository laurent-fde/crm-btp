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
- `pnpm test src/services/lead.service.test.ts` : un seul fichier de test
- `pnpm typecheck` : vérifier les types TypeScript

## Stack
- Next.js 16 (App Router, dossier `src/app/`), React 19, TypeScript, Tailwind CSS 4.

## Architecture
3 couches, avec un cœur métier séparé. Les consignes de chaque couche sont dans .claude/rules/
et se chargent quand on touche ses fichiers.
- Présentation : `src/app/` (pages, `api/webhooks/`) et `src/presentation/` (actions, composants, providers).
- Service : `src/services/` (`domain/`, `ports.ts`, `*.service.ts`).
- Données : `src/data/` (base libsql, horloge système, faux fournisseur d'e-mails).
- Proxy : `src/proxy.ts`, verrou d'accès facultatif (`APP_PASSWORD`), hors couches ; le webhook en est exclu.
- Composition : `src/composition.ts`, le seul câblage entre adaptateurs et services.
- `pnpm lint` bloque les imports interdits entre couches. Chaque test est à côté du fichier testé (`*.test.ts`).

## Design system
- B · Atelier (brique et crème, formes arrondies), choisi parmi 3 propositions dans `design-options.html`.
- Thème dans `src/app/globals.css` : `:root` pour le clair, `.dark` pour le sombre.
- Couleurs d'étape : `stage-nouveau`, `stage-envoye`, `stage-ouvert`, `stage-clique`, `stage-visite`, `stage-gagne`, `stage-perdu` ; lead chaud : `hot` / `hot-foreground` (ex. `text-stage-clique`, `bg-hot`).
- Boutons et badges en forme de pilule.
- Polices : Fraunces (titres h1-h3), Source Sans 3 (texte), JetBrains Mono (dates, codes).

## Git
- On travaille sur dev. Jamais de commit direct sur main.
- Un seul commit par lot : feat(lot-N): <titre du lot>.
- Les PR vont de dev vers main.

## Secrets
- .env.example (versionné) liste les variables sans valeur : toute nouvelle variable y est ajoutée.
- Ne lis jamais .env ni .env.local.

## Décisions
- Les décisions d'architecture sont dans docs/decisions/. Lis l'ADR concerné avant de changer une brique.
