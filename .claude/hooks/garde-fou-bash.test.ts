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
});
