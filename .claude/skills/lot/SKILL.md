---
name: lot
description: Traiter un lot de lots.md selon le process du projet : plan versionné et validé, test d'acceptation commité d'abord, TDD, preuves (smoke, captures), vérificateurs, puis PR. Utiliser quand l'utilisateur tape « /lot N » ou demande de traiter un lot.
---

# lot · notre façon de développer un lot

Ce skill définit le process du projet. Il s'applique à chaque lot, sans le redire.
Argument : le numéro du lot ($ARGUMENTS).

## 1. Préparer
- Travaille sur la branche dev, à jour avec main : `git checkout dev && git pull origin main`.
- Lis le lot $ARGUMENTS dans `lots.md` et son issue, puis `INTENT.md`, la section « Pièges » de `CLAUDE.md`, les règles de `.claude/rules/` et les ADR de `docs/decisions/` qui touchent le lot.
- Note le commit de départ (`git rev-parse --short HEAD`) : c'est le dernier état vert, il sert aux vérificateurs.

## 2. Planifier, puis attendre ma validation
Écris le plan dans `docs/plan/lot-$ARGUMENTS.md` :
- l'issue, le commit de départ ;
- les tâches, couche par couche : présentation, service, données ;
- un tableau « critère → test(s) qui le prouvent → couche » ; chaque critère d'acceptation y figure ;
- les écrans touchés et les états à capturer (vide, rempli, erreur ; clair, sombre, mobile) ;
- ce que le smoke doit ajouter (page dans `PAGES`, parcours écriture → relecture) ;
- ce qui est flou ou impossible à tester, signalé.

STOP : montre-moi le plan et attends ma validation avant d'écrire du code.

## 3. Test d'acceptation d'abord
- Écris `src/lots/lot-$ARGUMENTS.test.ts` : un test par critère, en « Étant donné… quand… alors… », de bout en bout (vrais services et vrais adaptateurs sur une base libsql en mémoire, comme `src/composition.test.ts`).
- Lance-le : il échoue **pour la bonne raison** (une assertion, une fonction absente ; pas une erreur de syntaxe). Garde cette sortie rouge.
- Commite-le seul : `test(lot-$ARGUMENTS): critères d'acceptation`. Il ne se modifie plus sans mon accord : c'est le contrat du lot.

## 4. Exécuter en TDD, couche par couche
- Pour chaque couche : tests unitaires d'abord (rouges), puis le code, jusqu'au vert. Chaque test à côté de son fichier.
- Domaine sans rien simuler ; service avec de faux ports ; données sur vraie base ; présentation par ses composants.
- Ajoute les pages et le parcours du lot à `scripts/smoke.mjs`.
- Un piège de framework ou de plateforme rencontré : ajoute-le à « Pièges » dans `CLAUDE.md`.
- Un choix structurant avec options écartées : propose un ADR (skill `decision-context`).

## 5. Vérifier
- `pnpm build`, `pnpm verifier` et `pnpm smoke` passent. `pnpm lint` n'avertit que pour les fichiers en dette (et un fichier en dette touché par le lot en sort s'il devient conforme).
- Si le lot touche `src/app/`, `src/presentation/` ou `globals.css` : lance `pnpm dev`, ouvre chaque écran touché avec le MCP Playwright, en clair ET en sombre (bouton ☀️/🌙) et en largeur mobile. Regarde la console (erreurs, avertissements Next) et la mise en page (rien de coupé, pas de défilement inutile). Range les captures dans `docs/plan/captures/lot-$ARGUMENTS/` (`<ecran>-<etat>-<clair|sombre|mobile>.png`). Une seule fois, quand tout est vert.
- Lance en parallèle les sous-agents `revue` (diff `<départ>..HEAD`), `non-regression` (plage `<départ>..HEAD`) et, si le lot touche une entrée externe (formulaire, action, webhook, variable d'env), `securite`.
- Corrige les constats bloquants et importants ; les autres vont en issue (skill `backlog`). Note dans le plan le verdict de chaque vérificateur.
- Commit du lot : `feat(lot-$ARGUMENTS): <titre du lot>` (le test d'acceptation reste dans son commit à part).

## 6. Ouvrir la PR
- Ouvre la PR de dev vers main (`gh pr create`) : le hook refuse s'il reste des fichiers non commités, puis rejoue build, lint, types, tests et smoke. Donne-moi le lien.
- Dans le corps : `Closes #N`, les critères cochés avec le test de chaque critère, la sortie rouge puis la sortie verte, le verdict des vérificateurs, un lien vers `docs/plan/lot-$ARGUMENTS.md` et ses captures.

## Mode enchaînement (« enchaîne les lots restants »)
- Traite les lots dans l'ordre de `lots.md`, chacun avec les étapes 1 à 5 : plan écrit mais sans arrêt pour le valider, puis deux commits par lot (`test(lot-N)` puis `feat(lot-N)`).
- Arrête-toi seulement sur une anomalie majeure : critère impossible ou contradictoire, test qui ne peut pas passer sans sortir du lot, migration qui casse des données, règle de `.claude/rules/` impossible à tenir.
- À la fin, une seule PR pour tous les lots, avec un récap par lot : critères et leurs tests, sortie rouge, verdict des vérificateurs ; puis une sortie verte finale.

## Règles
- Ne sors pas du lot. Une idée hors lot : signale-la ou crée une issue, ne la code pas.
- Ne fusionne jamais : la fusion est à moi (le harnais le bloque).
- Commits au format du skill `git-conventional` : `test(lot-N)`, `feat(lot-N)`, et pour une correction `fix(lot-N)`.
