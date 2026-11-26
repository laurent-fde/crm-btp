# Règle 00 · Principes communs (toujours applicable)

Cette règle s'applique à **tout** le code, à chaque tâche. `INTENT.md` reste la source de vérité ;
les règles de couche (`presentation.md`, `service.md`, `donnees.md`) précisent ce qu'elle impose.

## 1. Avant de coder
1. Relire `INTENT.md`, puis le lot ou l'issue en cours, et la section « Pièges » de `CLAUDE.md`.
2. Relire la règle de **chaque couche** que la tâche va toucher.
3. Vérifier que la branche courante est `dev`.
4. Avant d'utiliser l'API d'une librairie, lire sa doc à jour : `node_modules/next/dist/docs/` pour
   Next, le MCP Context7 pour le reste. Les API changent ; la mémoire du modèle date.
5. Une demande contredit une règle : **s'arrêter et le signaler**. Ne jamais contourner une règle en silence.

## 2. Zéro God file, zéro spaghetti
Des plafonds, pas des objectifs. Vérifiés par `pnpm lint` (hors tests et composants `ui/` générés).

| Mesure | Limite |
|---|---|
| Lignes par fichier (hors blancs et commentaires) | ≤ 250 |
| Lignes par fonction, composant compris | ≤ 60 |
| Complexité cyclomatique | ≤ 8 |
| Profondeur d'imbrication | ≤ 3 |
| Paramètres par fonction | ≤ 3 (un composant reçoit un seul objet) |

- Les fichiers listés en « Dette » dans `eslint.config.mjs` dépassaient déjà un plafond : un fichier
  touché par un lot en sort s'il devient conforme ; la liste ne s'allonge jamais.
- Pas de valeur magique : une constante métier a un nom (`MAX_BODY_BYTES = 64 * 1024`).
- Pas de nouveau fichier `utils`, `helpers`, `common` ou `misc` fourre-tout (`presentation/lib/utils.ts`
  reste réservé à `cn()` de shadcn). Pas de code mort ni commenté.

## 3. Tests
- TDD : le test d'abord, vu **rouge pour la bonne raison** (une assertion, pas une erreur d'import), puis le code.
- Chaque test est à côté du fichier testé. Les tests d'acceptation d'un lot, qui traversent les couches,
  sont dans `src/lots/lot-N.test.ts`, commités avant le code du lot.
- Chaque bug corrigé a un test qui le reproduit, dans le même commit.
- Jamais de `it.skip`, `.only`, `eslint-disable` ou `@ts-expect-error` sans accord écrit de Laurent sur la même ligne.

## 4. Capitaliser
Une erreur corrigée qui pourrait revenir s'ajoute à « Pièges » dans `CLAUDE.md` (symptôme, cause, parade).
Un choix structurant avec des options écartées devient un ADR (skill `decision-context`).

## Comment vérifier
- `pnpm verifier` est vert et `pnpm lint` n'affiche d'avertissement que pour les fichiers en dette.
- `git grep -nE "it\.skip|\.only\(|eslint-disable|ts-expect-error" -- src` ne renvoie que des lignes avec l'accord écrit.
