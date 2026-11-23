---
paths:
  - "src/app/**"
  - "src/presentation/**"
---
# Couche présentation

Pages et webhook (`src/app/`), actions, composants et providers (`src/presentation/`).

- Obtient ses services par `@/composition` (`getLeadService()`), jamais par `@/data` ni `@libsql`. Les types viennent de `@/services/…` (`import type`).
- `src/proxy.ts` (verrou par mot de passe) est une porte d'entrée hors couches : il n'importe que `@/data/access-gate` et `next/server`, et traduit un refus en `401`. Sans `APP_PASSWORD`, il laisse tout passer. Le webhook reste exclu de son matcher.
- Aucune règle métier : ni validation, ni décision d'étape, ni calcul de délai.
- Le webhook (`src/app/api/webhooks/`) est une porte d'entrée comme l'écran : il lit la requête (corps brut + signature), appelle le service, traduit le résultat en code HTTP. Rien d'autre.
- N'utilise que les composants du design system (`src/presentation/components/ui/`). Composant manquant : `pnpm dlx shadcn@latest add <composant>`.
- Aucune couleur en dur : uniquement les variables du thème (`bg-primary`, `text-muted-foreground`, `text-stage-clique`, `bg-hot`…). Une étape s'affiche toujours avec sa couleur `stage-*`.
- Chaque écran fonctionne en clair ET en sombre.
- Chaque champ a un `<Label htmlFor>`, et son message d'erreur est relié au champ (`aria-invalid`, `aria-describedby`).

✅ `<Badge className="bg-stage-clique/15 text-stage-clique">Lien cliqué</Badge>`
❌ `<span className="bg-teal-100 text-teal-700">Lien cliqué</span>`

✅ Dans le webhook : `const result = await getWebhookService().receive(body, signature)`, puis `401` si la signature est refusée
❌ Dans le webhook : vérifier la signature ou faire avancer le lead dans la route

## Comment vérifier
- `pnpm lint` passe : il refuse tout import de `@/data` ou `@libsql/*` ici.
- `grep -rnE "#[0-9a-fA-F]{3,6}|rgb\(|oklch\(|-(red|green|blue|teal|orange|amber|zinc|slate|gray|neutral|stone)-[0-9]|-(black|white)\b" src/app src/presentation --include='*.tsx'` ne renvoie rien.
- L'écran est lisible en clair et en sombre (bouton ☀️/🌙), vérifié dans le navigateur aux moments importants seulement :
  - à la fin d'un lot qui touche l'écran, avant la PR ;
  - après un changement du thème (`globals.css`) ou un nouveau composant shadcn ;
  - quand on corrige un bug visuel.
