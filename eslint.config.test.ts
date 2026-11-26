// @vitest-environment node
// Cliquet de la dette ESLint (.claude/rules/00-principes.md) : la liste des fichiers dispensés des
// plafonds ne fait que diminuer. Un fichier nettoyé en sort : baisse alors PLAFOND_DETTE ici.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PLAFOND_DETTE = 9;

function fichiersEnDette(): string[] {
  const config = readFileSync(path.join(import.meta.dirname, "eslint.config.mjs"), "utf8");
  const bloc = /\/\/ Dette[\s\S]*?files: \[([\s\S]*?)\]/.exec(config);
  if (!bloc) throw new Error("bloc « Dette » introuvable dans eslint.config.mjs");
  return [...bloc[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("dette ESLint", () => {
  it(`ne dépasse pas ${PLAFOND_DETTE} fichiers`, () => {
    expect(fichiersEnDette().length).toBeLessThanOrEqual(PLAFOND_DETTE);
  });

  it("ne liste que des fichiers de src/ qui existent", () => {
    for (const fichier of fichiersEnDette()) {
      expect(fichier.startsWith("src/")).toBe(true);
      expect(() => readFileSync(path.join(import.meta.dirname, fichier))).not.toThrow();
    }
  });
});
