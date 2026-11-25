#!/bin/bash
# PreToolUse sur Bash : refuse tout push vers main, et tout push forcé sauf --force-with-lease.
# Seuls les morceaux de la commande qui sont un git push sont vérifiés (séparés par ; & |).
cmd=$(jq -r '.tool_input.command // empty')
pushes=$(printf '%s\n' "$cmd" | tr ';&|' '\n\n\n' | grep -E '(^|[[:space:]])git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]]|$)') || exit 0
if printf '%s\n' "$pushes" | grep -Eq '(^|[[:space:]:+])main([[:space:]]|$)'; then
  echo "Push vers main refusé : on passe toujours par une PR depuis dev." >&2
  exit 2
fi
if printf '%s\n' "$pushes" | grep -Eq '(^|[[:space:]])(-f|--force)([[:space:]]|$)|[[:space:]]\+[^[:space:]]+'; then
  echo "Push forcé refusé : utilise --force-with-lease." >&2
  exit 2
fi
exit 0
