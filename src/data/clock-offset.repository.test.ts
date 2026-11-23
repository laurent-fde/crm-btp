// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClockOffsetRepository } from "./clock-offset.repository";
import { openDatabase, type Database } from "./db";

const DAY = 86_400_000;

describe("données · clock-offset.repository", () => {
  const opened: Database[] = [];
  const dirs: string[] = [];
  afterEach(() => {
    opened.splice(0).forEach((db) => db.client.close());
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });
  const open = (url: string) => {
    const db = openDatabase(url);
    opened.push(db);
    return db;
  };

  it("ne décale rien tant que l'horloge n'a pas été avancée", async () => {
    expect(await createClockOffsetRepository(open(":memory:")).load()).toBe(0);
  });

  // Critère 4 : la date simulée est conservée après redémarrage.
  it("garde le décalage de l'horloge après fermeture et réouverture de la base", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-btp-"));
    dirs.push(dir);
    const url = `file:${join(dir, "crm-btp.db")}`;
    const avant = open(url);
    await createClockOffsetRepository(avant).save(1 * DAY);
    await createClockOffsetRepository(avant).save(8 * DAY);
    avant.client.close();

    expect(await createClockOffsetRepository(open(url)).load()).toBe(8 * DAY);
  });

  it("revient à 0 si la valeur relue est aberrante", async () => {
    const db = open(":memory:");
    await db.ready;
    await db.client.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ["clock_offset_ms", "abc"] });

    expect(await createClockOffsetRepository(db).load()).toBe(0);
  });

  // Revue #14 : deux avances en même temps s'additionnent (aucune n'est perdue).
  it("ajoute une avance au décalage enregistré, même lancées en même temps", async () => {
    const repository = createClockOffsetRepository(open(":memory:"));

    expect(await repository.advanceBy(1 * DAY)).toBe(1 * DAY);
    await Promise.all([repository.advanceBy(7 * DAY), repository.advanceBy(7 * DAY)]);

    expect(await repository.load()).toBe(15 * DAY);
  });
});
