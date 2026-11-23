---
paths:
  - "src/data/**"
  - "src/composition.ts"
---
# Couche données (et composition)

Adaptateurs vers l'extérieur (`src/data/`) et câblage (`src/composition.ts`).

- Les adaptateurs implémentent les ports de `@/services/ports` (base libsql, horloge système, fournisseur d'e-mails). Ils n'importent du service que `@/services/ports`.
- Seule couche qui parle à la base : `@libsql/client` n'est importé que dans `src/data/`, et ouvert une seule fois dans `db.ts`.
- Changer le schéma = ajouter une migration à la fin de la liste de `db.ts`, jamais modifier une migration existante.
- Requêtes toujours paramétrées (`args`), jamais de texte collé dans le SQL.
- Aucune règle métier : lit et écrit, sans rien décider. Une garantie d'intégrité (par exemple un événement unique) est aussi posée en base (contrainte `UNIQUE`).
- Le fournisseur d'e-mails est derrière le port `EmailSender` : en V1, un faux qui enregistre l'envoi ; le vrai le remplacera sans toucher au service.
- `process.env` n'est lu que dans `src/data/` et `src/composition.ts`. Toute nouvelle variable va dans `.env.example`, sans valeur.
- `src/composition.ts` est le seul fichier qui importe à la fois les adaptateurs et les services. Il commence par `import "server-only"`.
- Tests sur une vraie base libsql en mémoire (`openDatabase(":memory:")`) ou sur un fichier temporaire.

✅ `client.execute({ sql: "SELECT * FROM leads WHERE id = ?", args: [id] })`
❌ `` client.execute(`SELECT * FROM leads WHERE id = '${id}'`) ``

## Comment vérifier
- `pnpm lint` passe : il refuse ici tout import du service autre que `@/services/ports`, et tout import de `@/presentation`.
- `grep -rln "@libsql/client" src | grep -v "^src/data/"` ne renvoie rien.
- `grep -rn 'execute(`' src/data | grep '\${'` ne renvoie rien (pas de SQL collé).
- `grep -rln "process.env" src | grep -vE "^src/(data/|composition\.ts)"` ne renvoie rien.
