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
- Proxy : `src/proxy.ts`, le verrou d'accès facultatif de la démo (mot de passe `APP_PASSWORD` ; sans lui, l'app est ouverte) avant toute page ou action ; le webhook en est exclu. Seule exception : il importe `@/data/access-gate` (et rien d'autre de `src/data/`), pour ne pas charger la base. ESLint le vérifie.
- Composition : `src/composition.ts`, le seul fichier qui branche les vrais adaptateurs aux services (`getXService()`). Ce n'est pas une couche, c'est le câblage.
- L'heure passe toujours par le port `Clock`, jamais `new Date()` dans le domaine ou le service : c'est ce qui permet de simuler le passage du temps.
- Changer de base (SQLite → Turso) ou de fournisseur d'e-mails ne modifie que `src/data/` (et au plus `src/composition.ts`).
- `pnpm lint` bloque les imports interdits entre couches.
Chaque test est à côté du fichier testé (`*.test.ts`).

## Design system
- B · Atelier (brique et crème, formes arrondies), choisi parmi 3 propositions dans `design-options.html`.
- Thème dans `src/app/globals.css` : `:root` pour le clair, `.dark` pour le sombre. Toute couleur est une variable du thème, jamais une valeur en dur.
- Couleurs d'étape : `stage-nouveau`, `stage-envoye`, `stage-ouvert`, `stage-clique`, `stage-visite`, `stage-gagne`, `stage-perdu` ; lead chaud : `hot` / `hot-foreground` (ex. `text-stage-clique`, `bg-hot`).
- Chaque écran fonctionne en clair ET en sombre.
- Composants shadcn dans `src/presentation/components/ui/` (`pnpm dlx shadcn@latest add <composant>`). Boutons et badges en forme de pilule.
- Polices : Fraunces (titres h1-h3), Source Sans 3 (texte), JetBrains Mono (dates, codes).

## Git
- On travaille sur dev. Jamais de commit direct sur main.
- Un seul commit par lot : feat(lot-N): <titre du lot>.
- Les PR vont de dev vers main.

## Secrets
- Les valeurs vont dans .env.local, ignoré par Git (.gitignore exclut .env*).
- .env.example (versionné) liste les variables sans valeur : toute nouvelle variable y est ajoutée.
- Ne lis jamais .env ni .env.local.
