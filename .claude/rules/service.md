---
paths:
  - "src/services/**"
---
# Couche service

Domaine, ports et cas d'usage (`src/services/`).

- `domain/` : règles métier pures (étape suivante, avancer seulement vers l'avant, doublon, lead perdu après le délai). Elles reçoivent tout en argument, y compris l'heure (`now`). N'importent que `domain/`.
- `ports.ts` : les interfaces dont le service a besoin (dépôts, `Clock`, `EmailSender`). Le service les définit, la couche données les implémente.
- `*.service.ts` : cas d'usage. Reçoivent leurs ports en paramètre (`createLeadService({ repository, clock })`). N'importent ni `@/data`, ni `@/composition`, ni React, ni `next/*`.
- Toute entrée (formulaire, action, webhook) est validée ici par un schéma Zod, avec `safeParse` (jamais `parse`) et `z.flattenError` pour les erreurs par champ. Un refus n'est pas une panne : `{ ok: false, errors }`, pas d'exception.
- L'heure vient uniquement de `clock.now()`. Jamais `new Date()` sans argument, ni `Date.now()`.
- Le service ne lit jamais `process.env` : le secret du webhook lui est passé en paramètre par la composition.
- Un webhook non signé ou mal signé est refusé. Un événement déjà reçu (même identifiant) ne compte qu'une fois.
- Tests écrits AVANT le code : la sortie rouge d'abord, puis le code qui la fait passer. Domaine : testé sans rien simuler. Service : avec de faux ports (fausse horloge qu'on avance), jamais une vraie base.

✅ `isLost(lastEmailAt, lastEventAt, now, delayDays)` dans `domain/`, testé avec des dates fixes
❌ `if (Date.now() - lead.lastEmailAt > 7 * 86400000)` dans un service

✅ `leadSchema.safeParse(input)` puis `return { ok: false, errors: z.flattenError(result.error).fieldErrors }`
❌ Le nom vérifié seulement par `required` dans le formulaire

## Comment vérifier
- `pnpm lint` passe : il refuse `@/data`, `@/composition`, React et `next` ici, et tout import hors de `domain/` dans `domain/`.
- `grep -rnE "new Date\(\)|Date\.now\(|process\.env" src/services --include='*.ts' | grep -v '\.test\.ts'` ne renvoie rien.
- Chaque `*.service.ts` et chaque fichier de `domain/` a son test à côté, et `pnpm test` passe.
- La sortie rouge de `pnpm test` a été montrée avant le code (elle figure dans la PR).
