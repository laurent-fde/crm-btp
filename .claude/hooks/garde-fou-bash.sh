#!/bin/bash
# PreToolUse sur Bash : refuse, avant leur exécution, les commandes qui ne se rattrapent pas
# ou qui exposent des secrets. Double les règles « deny » de settings.json, qui comparent le
# texte exact de la commande et se contournent (« bash -c … », « cat » au lieu de Read).
# Sortie 2 : la commande est refusée et l'agent lit la raison.
entree=$(cat)
cmd=$(printf '%s' "$entree" | jq -r '.tool_input.command // empty')
dossier=$(printf '%s' "$entree" | jq -r '.cwd // empty')

refuser() {
  echo "Commande bloquée par le garde-fou du projet : $1" >&2
  echo "Si c'est vraiment voulu, demande à Laurent de la lancer lui-même." >&2
  exit 2
}

# Push : seuls les morceaux qui sont un git push sont vérifiés (séparés par ; & |).
pushes=$(printf '%s\n' "$cmd" | tr ';&|' '\n\n\n' | grep -E '(^|[[:space:]])git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]]|$)')
if [ -n "$pushes" ]; then
  printf '%s\n' "$pushes" | grep -Eq '(^|[[:space:]:+])main([[:space:]]|$)' \
    && refuser "push vers main, on passe toujours par une PR depuis dev."
  printf '%s\n' "$pushes" | grep -Eq '(^|[[:space:]])(-f|--force)([[:space:]]|$)|[[:space:]]\+[^[:space:]]+' \
    && refuser "push forcé, utilise --force-with-lease."
fi

# Commit sur main : main ne reçoit que des PR fusionnées par Laurent.
# La branche est lue dans le dossier où la commande tourne (champ cwd du hook).
if printf '%s\n' "$cmd" | tr ';&|' '\n\n\n' | grep -Eq '(^|[[:space:]])git([[:space:]]+-[^[:space:]]+)*[[:space:]]+commit([[:space:]]|$)'; then
  branche=$(git -C "${dossier:-$PWD}" branch --show-current 2>/dev/null)
  [ "$branche" = "main" ] && refuser "commit sur main, passe sur dev (git switch dev)."
fi

# Suppression récursive et forcée, même cachée dans « bash -c » ou avec les options séparées.
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])rm[[:space:]]+(-[[:alpha:]]*r[[:alpha:]]*f|-[[:alpha:]]*f[[:alpha:]]*r|(-[[:alpha:]]+[[:space:]]+)*-r[[:space:]]+(-[[:alpha:]]+[[:space:]]+)*-f|(-[[:alpha:]]+[[:space:]]+)*-f[[:space:]]+(-[[:alpha:]]+[[:space:]]+)*-r)([[:space:]]|$)' \
  && refuser "suppression récursive forcée (rm -rf)."

# Lecture d'un fichier de secrets par une commande (.env.example reste lisible).
# .env doit commencer un chemin (après un espace, / , un guillemet ou =) : « process.env » passe.
sans_exemple=$(printf '%s' "$cmd" | sed 's/\.env\.example//g')
printf '%s' "$sans_exemple" | grep -Eq '(^|[^[:alnum:]_])(cat|less|more|head|tail|grep|rg|sed|awk|source|bat|strings|cp|base64|xxd|od)[[:space:]](.*[[:space:]/"'"'"'=])?\.env(\.[[:alnum:]]+)?([[:space:]"'"'"']|$)' \
  && refuser "lecture d'un fichier de secrets (.env)."

# Fusion d'une PR : elle appartient à Laurent.
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])gh[[:space:]]+pr[[:space:]]+merge([[:space:]]|$)' \
  && refuser "fusion d'une PR."

exit 0
