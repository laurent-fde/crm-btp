#!/bin/bash
# PreToolUse sur Bash : avant « gh pr create », rejoue toute la vérification du projet.
# Ordre imposé par Next 16 : le build génère les types de routes dont dépendent les types et les tests.
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

# Des fichiers non commités seraient vérifiés ici mais absents de la PR : le vert mentirait.
restes=$(git status --porcelain)
if [ -n "$restes" ]; then
  {
    echo "PR bloquée : des fichiers ne sont pas commités. Commite-les (ou retire-les), puis relance gh pr create."
    printf '%s\n' "$restes" | head -n 20
  } >&2
  exit 2
fi

verifier "pnpm build" pnpm build
verifier "pnpm lint" pnpm lint
verifier "pnpm typecheck" pnpm typecheck
verifier "pnpm test" pnpm test
verifier "pnpm smoke" pnpm smoke
exit 0
