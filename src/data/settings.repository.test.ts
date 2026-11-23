// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "./db";
import { createSettingsRepository } from "./settings.repository";

describe("données · settings.repository", () => {
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

  it("ne renvoie rien tant qu'aucun réglage n'est enregistré", async () => {
    expect(await createSettingsRepository(open(":memory:")).load()).toEqual({});
  });

  it("enregistre la longueur de la séquence, retrouvée après réouverture et remplacée au réglage suivant", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-btp-"));
    dirs.push(dir);
    const url = `file:${join(dir, "crm-btp.db")}`;
    const avant = open(url);
    await createSettingsRepository(avant).save({ sequenceLength: 5, lostDelayDays: 7 });
    await createSettingsRepository(avant).save({ sequenceLength: 4, lostDelayDays: 7 });
    avant.client.close();

    expect(await createSettingsRepository(open(url)).load()).toEqual({ sequenceLength: 4, lostDelayDays: 7 });
  });

  // Lot 6 : le délai avant « Perdu », enregistré à côté de la longueur.
  it("enregistre aussi le délai avant « Perdu », retrouvé après réouverture", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-btp-"));
    dirs.push(dir);
    const url = `file:${join(dir, "crm-btp.db")}`;
    const avant = open(url);
    await createSettingsRepository(avant).save({ sequenceLength: 5, lostDelayDays: 3 });
    avant.client.close();

    expect(await createSettingsRepository(open(url)).load()).toEqual({ sequenceLength: 5, lostDelayDays: 3 });
  });
});
