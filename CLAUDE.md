# CRM-BTP

Une démo de mini CRM de suivi de leads froids (artisans du bâtiment), pilotée par webhooks, construite lot par lot.

@AGENTS.md

## Avant tout travail
- Lis INTENT.md avant tout travail.
- Lis les règles du projet dans .claude/rules/ : `00-principes.md` toujours, puis une par couche.

## Commandes
- `pnpm dev` : lancer l'app en local
- `pnpm build` : construire l'app (à lancer avant `pnpm smoke`)
- `pnpm verifier` : lint, types et tests d'un coup
- `pnpm smoke` : vrai serveur sur base temporaire : pages, webhook signé reçu puis affiché, refus 401 et 413, zéro erreur serveur
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
- Deux commits par lot : `test(lot-N): critères d'acceptation` (le contrat, commité avant le code), puis `feat(lot-N): <titre du lot>`.
- Les PR vont de dev vers main.

## Secrets
- .env.example (versionné) liste les variables sans valeur : toute nouvelle variable y est ajoutée.
- Ne lis jamais .env ni .env.local.

## Pièges propres à ce repo
Une erreur corrigée qui pourrait revenir s'ajoute ici, en une puce : symptôme, cause, parade.

- **Heure lue pendant le prérendu (#25)** : Next affiche « unstable value new Date()
  while prerendering ». Cause : une page lit l'horloge (ex. `markLostLeads()`) sans
  `await connection()`. Parade : `await connection()` avant tout appel qui lit l'heure.
- **Horloge simulée figée (#19)** : dans `composition.ts`, `appClock()` est recalculée
  à chaque service créé, jamais gardée dans une constante. Sinon une avance de
  l'horloge est ignorée. Verrou : `src/composition.test.ts`.
- **Retour à aujourd'hui (#17)** : les événements créés pendant une avance gardent leur
  date simulée. Revenir à aujourd'hui doit les signaler (`future`, `futureEvents`), et
  un lead « Perdu » le reste.
- **Mise à jour partielle (#18)** : n'écrire que les champs reçus, une requête par clé
  (upsert). Jamais `load()` puis `save()` de tout l'objet : deux enregistrements
  simultanés s'écrasent.
- **CSP (#16)** : pas de nonce, pour garder le rendu statique partiel. Toute nouvelle
  source externe (script, police, image) s'ajoute à la CSP de `next.config.ts`, sinon
  le navigateur la bloque, et seule la console le montre.
- **Webhook volumineux (#15)** : lire le corps avec la limite de 64 Ko AVANT de
  vérifier la signature. Ne jamais se fier à `Content-Length`.
- **`cacheComponents` actif** : pas de `export const dynamic = "force-dynamic"`
  (la doc Next 16 dit de le retirer). Les données non mises en cache tournent
  déjà à chaque requête.
- **Turso refuse `PRAGMA user_version`** : les migrations sont suivies dans la table
  `schema_migrations` (ADR 001).

## Décisions
- Les décisions d'architecture sont dans docs/decisions/. Lis l'ADR concerné avant de changer une brique.
