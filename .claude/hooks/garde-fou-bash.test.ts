// @vitest-environment node
// Prouve que le garde-fou bloque ce qui ne se rattrape pas et laisse passer le travail normal.
// Un changement du script qui casse un cas échoue ici, au lieu de passer en silence.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const SCRIPT = path.join(import.meta.dirname, "garde-fou-bash.sh");
const depots = mkdtempSync(path.join(tmpdir(), "garde-fou-"));
afterAll(() => rmSync(depots, { recursive: true, force: true }));

function depotSurBranche(branche: string): string {
  const dossier = path.join(depots, branche);
  execFileSync("git", ["init", "-q", "-b", branche, dossier]);
  return dossier;
}

function lancer(command: string, cwd = depots) {
  const sortie = spawnSync("bash", [SCRIPT], {
    input: JSON.stringify({ cwd, tool_input: { command } }),
    encoding: "utf8",
  });
  return { code: sortie.status, raison: sortie.stderr };
}

const BLOQUEES: [string, string][] = [
  ["git push origin main", "push vers main"],
  ["git push origin dev:main", "push vers main"],
  ["git push --force origin dev", "push forcé"],
  ["git push -f origin dev", "push forcé"],
  ["git push origin +dev", "push forcé"],
  ["rm -rf node_modules", "rm -rf"],
  ["rm -fr build", "rm -rf"],
  ["rm -r -f build", "rm -rf"],
  ['bash -c "rm -rf /tmp/x"', "rm -rf"],
  ["cat .env.local", ".env"],
  ["grep TOKEN .env", ".env"],
  ["source .env && pnpm dev", ".env"],
  ["cat ./.env", ".env"],
  ['head "config/.env.local"', ".env"],
  ["gh pr merge 12 --squash", "fusion"],
  // Contournements relevés par la revue de la PR 31.
  ["rm -Rf build", "rm -rf"],
  ["rm --recursive --force build", "rm -rf"],
  ["rm -r --force build", "rm -rf"],
  ['bash -c "git push --force origin dev"', "push forcé"],
  ["git push -fu origin dev", "push forcé"],
  ["git push origin HEAD:refs/heads/main", "push vers main"],
  ["cat .env.development.local", ".env"],
  ["cat .env*", ".env"],
  ["cp .env.local /tmp/copie", ".env"],
  ["while read l; do echo $l; done < .env", ".env"],
  // Contournements relevés par l'agent securite sur la PR 31.
  ["git push --all origin", "push vers main"],
  ["git push --mirror origin", "push vers main"],
  ['git switch main && git commit -m "x"', "passage sur main"],
  ["git checkout main; git push", "passage sur main"],
  ["git log -1 -p --output=.claude/settings.json", "--output"],
  ["git show HEAD --output x.txt", "--output"],
  ["git worktree remove --force .claude/worktrees/fix-25", "worktree"],
  ["nl .env.local", ".env"],
  ["diff .env.local /dev/null", ".env"],
  [`node -p "require('fs').readFileSync('.env.local','utf8')"`, ".env"],
];

const AUTORISEES = [
  "git push origin dev",
  "git push --force-with-lease origin dev",
  "rm -r build",
  "rm fichier.txt",
  "cat .env.example",
  'grep -rn "process.env" src',
  "grep -rln process\\.env src",
  "gh pr view 12",
  "echo main",
  "pnpm verifier",
  "cp .env.example .env.local",
  "git push -u origin dev",
  "git push origin feature/main-menu",
  "git log origin/main",
  "rm -f fichier.txt",
  "grep -rn main src",
  'git switch -c essai && git commit -m "x"',
  "git worktree list",
  "git worktree remove .claude/worktrees/fini",
  "git log -1 -p",
  "ls .env.example",
];

describe("garde-fou-bash", () => {
  it.each(BLOQUEES)("bloque « %s » (%s)", (command, motif) => {
    const { code, raison } = lancer(command);
    expect(code).toBe(2);
    expect(raison).toContain(motif);
  });

  it.each(AUTORISEES)("laisse passer « %s »", (command) => {
    expect(lancer(command).code).toBe(0);
  });

  it("bloque un commit quand la branche est main", () => {
    const { code, raison } = lancer('git commit -m "x"', depotSurBranche("main"));
    expect(code).toBe(2);
    expect(raison).toContain("commit sur main");
  });

  it("laisse passer un commit sur dev", () => {
    expect(lancer('git add -A && git commit -m "x"', depotSurBranche("dev")).code).toBe(0);
  });

  it("laisse passer « git -C <dépôt sur une autre branche> commit »", () => {
    expect(lancer(`git -C ${depotSurBranche("main-vise")} commit -m "x"`).code).toBe(0);
  });

  it("bloque « git -C <dossier> push origin main »", () => {
    expect(lancer("git -C ../autre push origin main").code).toBe(2);
  });

  it("contrôle la branche du dossier visé par -C", () => {
    const depot = path.join(depots, "vise");
    execFileSync("git", ["init", "-q", "-b", "main", depot]);
    const { code, raison } = lancer(`git -C ${depot} commit -m "x"`);
    expect(code).toBe(2);
    expect(raison).toContain("commit sur main");
  });

  it("refuse une entrée illisible au lieu de tout laisser passer", () => {
    const sortie = spawnSync("bash", [SCRIPT], { input: "pas du json", encoding: "utf8" });
    expect(sortie.status).toBe(2);
    expect(sortie.stderr).toContain("illisible");
  });
});
