#!/bin/bash
# PreToolUse sur Bash : refuse, avant leur exécution, les commandes qui ne se rattrapent pas
# ou qui exposent des secrets. Double les règles « deny » de settings.json, qui comparent le
# texte exact de la commande et se contournent (« bash -c … », « cat » au lieu de Read).
# Sortie 2 : la commande est refusée et l'agent lit la raison. Dans le doute (jq absent,
# entrée illisible), on refuse : un garde-fou qui laisse tout passer en panne ne protège rien.

refuser() {
  echo "Commande bloquée par le garde-fou du projet : $1" >&2
  echo "Si c'est vraiment voulu, demande à Laurent de la lancer lui-même." >&2
  exit 2
}

command -v jq >/dev/null 2>&1 || refuser "jq est introuvable, le garde-fou ne peut pas lire la commande."
entree=$(cat)
cmd=$(printf '%s' "$entree" | jq -er '.tool_input.command | strings' 2>/dev/null) \
  || refuser "entrée du hook illisible."
dossier=$(printf '%s' "$entree" | jq -r '.cwd // empty' 2>/dev/null)

# Une ligne par commande simple : les guillemets, parenthèses et accents graves deviennent des
# espaces (« bash -c "git push -f" » redevient « git push -f »), puis on coupe sur ; & | et les
# retours à la ligne.
segments=$(printf '%s\n' "$cmd" | tr "\"'\`()" '     ' | tr ';&|' '\n\n\n')

# Vrai si une ligne de $segments contient le motif $1 ET le motif $2.
deux_motifs() {
  printf '%s\n' "$segments" | grep -E "$1" | grep -Eq "$2"
}

# Options globales de git avant la sous-commande, y compris celles qui prennent un argument (-C dossier, -c clé=valeur).
GIT='(^|[[:space:]/])git([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|-[^[:space:]]+))*[[:space:]]+'
OPTION_COURTE='(^|[[:space:]])-[[:alpha:]]*'
FIN='([[:space:]]|$)'

# Push vers main (aussi « HEAD:main », « refs/heads/main ») et push forcé (« -f », « -fu »,
# « --force », « +branche ») ; « --force-with-lease » reste permis.
deux_motifs "${GIT}push${FIN}" "(^|[[:space:]:+/])main${FIN}|[[:space:]]--(all|mirror)${FIN}" \
  && refuser "push vers main, on passe toujours par une PR depuis dev."
# Passer sur main puis commiter ou pousser dans la même commande échapperait au contrôle de branche.
SUR_MAIN="${GIT}(switch|checkout)([[:space:]]+-[^[:space:]]+)*[[:space:]]+main${FIN}"
printf '%s\n' "$segments" | grep -Eq "$SUR_MAIN" \
  && printf '%s\n' "$segments" | grep -Eq "${GIT}(commit|push|merge|cherry-pick|rebase)${FIN}" \
  && refuser "passage sur main suivi d'un commit ou d'un push, reste sur dev."
deux_motifs "${GIT}push${FIN}" "${OPTION_COURTE}f[[:alpha:]]*${FIN}|[[:space:]]--force${FIN}|[[:space:]]\+[^[:space:]]+" \
  && refuser "push forcé, utilise --force-with-lease."

# Commit sur main : main ne reçoit que des PR fusionnées par Laurent.
# La branche est lue dans le dossier où la commande tourne (champ cwd du hook).
# Un « git -C <dossier> commit » est contrôlé dans le dossier qu'il vise.
commits=$(printf '%s\n' "$segments" | grep -E "${GIT}commit${FIN}")
if [ -n "$commits" ]; then
  while IFS= read -r ligne; do
    cible=$(printf '%s\n' "$ligne" | sed -nE 's/.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*/\1/p')
    case "$cible" in /*) ;; "") cible="${dossier:-$PWD}" ;; *) cible="${dossier:-$PWD}/$cible" ;; esac
    branche=$(git -C "$cible" branch --show-current 2>/dev/null)
    [ "$branche" = "main" ] && refuser "commit sur main, passe sur dev (git switch dev)."
  done <<< "$commits"
fi

# Commandes de lecture qui écrivent en douce, ou suppriment du travail non commité.
deux_motifs "${GIT}(log|show|diff|format-patch)${FIN}" "[[:space:]]--output(=|[[:space:]]|$)" \
  && refuser "--output écrit dans un fichier ; lis la sortie sans l'écrire."
deux_motifs "${GIT}worktree[[:space:]]+(remove|prune)${FIN}" "${OPTION_COURTE}f[[:alpha:]]*${FIN}|[[:space:]]--force${FIN}" \
  && refuser "suppression forcée d'un worktree (perte du travail non commité)."

# Suppression récursive ET forcée, quelle que soit l'écriture : -rf, -Rf, -r -f, --recursive --force.
RM='(^|[[:space:]/])rm[[:space:]]'
printf '%s\n' "$segments" | grep -E "$RM" \
    | grep -E "${OPTION_COURTE}[rR][[:alpha:]]*${FIN}|[[:space:]]--recursive${FIN}" \
    | grep -Eq "${OPTION_COURTE}f[[:alpha:]]*${FIN}|[[:space:]]--force${FIN}" \
  && refuser "suppression récursive forcée (rm -rf)."

# Fichier de secrets : toute commande qui cite .env, .env.local, .env.development.local, .env*...
# quelle que soit la commande (cat, nl, node -p, « < .env »…). .env.example reste permis ;
# « process.env » n'est pas un chemin. Pour cp et mv, seule la source compte (le dernier argument
# est la destination) : « cp .env.example .env.local » passe.
ENV_FICHIER='(^|[[:space:]/=<,])\.env([.*,][^[:space:]]*)?([[:space:]]|$)'
sources=$(printf '%s\n' "$segments" \
  | sed -E 's#\.env\.example([[:space:],]|$)#\1#g' \
  | sed -E '/(^|[[:space:]/])(cp|mv)[[:space:]]/ s#[[:space:]]+[^[:space:]]+[[:space:]]*$##')
printf '%s\n' "$sources" | grep -Eq "$ENV_FICHIER" \
  && refuser "accès à un fichier de secrets (.env)."

# Fusion d'une PR : elle appartient à Laurent.
printf '%s\n' "$segments" | grep -Eq '(^|[[:space:]])gh[[:space:]]+pr[[:space:]]+merge([[:space:]]|$)' \
  && refuser "fusion d'une PR."

exit 0
