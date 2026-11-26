#!/bin/bash
# PreToolUse sur Bash : avant « gh pr create », lance lint, types et tests.
# Un échec bloque la création de la PR (sortie 2) et renvoie la fin de la sortie à l'agent.
cmd=$(jq -r '.tool_input.command // empty')
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])gh[[:space:]]+pr[[:space:]]+create([[:space:]]|$)' || exit 0

cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 1

verifier() {
  local nom="$1"
  shift
  local sortie
  if ! sortie=$("$@" 2>&1); then
    {
      echo "PR bloquée : « $nom » est en échec. Corrige la cause, commite, puis relance gh pr create."
      printf '%s\n' "$sortie" | tail -n 40
    } >&2
    exit 2
  fi
}

verifier "pnpm lint" pnpm lint
verifier "pnpm typecheck" pnpm typecheck
verifier "pnpm test" pnpm test
exit 0
