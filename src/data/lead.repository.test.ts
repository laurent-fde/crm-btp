// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Lead } from "@/services/ports";
import { openDatabase, type Database } from "./db";
import { createLeadRepository } from "./lead.repository";

const karim: Lead = {
  id: "lead-1",
  name: "Karim Benali",
  company: "Benali Élec",
  trade: "Électricien",
  city: "Lyon",
  postalCode: "69003",
  email: "karim.benali@exemple.fr",
  phone: "06 12 34 56 78",
  stage: "nouveau",
  createdAt: new Date("2026-11-23T09:00:00.000Z"),
};

describe("données · lead.repository", () => {
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

  it("écrit un lead puis le relit à l'identique, champs vides compris", async () => {
    const repository = createLeadRepository(open(":memory:"));
    const jeanne: Lead = { ...karim, id: "lead-2", name: "Jeanne Morel", company: null, trade: null, city: null, postalCode: null, phone: null };

    await repository.insert(karim);
    await repository.insert(jeanne);

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
    expect(all).toContainEqual(karim);
    expect(all).toContainEqual(jeanne);
  });

  it("garde un nom avec apostrophe tel quel (requête paramétrée)", async () => {
    const repository = createLeadRepository(open(":memory:"));

    await repository.insert({ ...karim, name: "Jean d'Ormesson" });

    expect((await repository.findAll())[0].name).toBe("Jean d'Ormesson");
  });

  // Critère 4 : après redémarrage, le lead est toujours dans « Nouveau ».
  it("retrouve le lead dans « Nouveau » après fermeture et réouverture de la base", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-btp-"));
    dirs.push(dir);
    const url = `file:${join(dir, "crm-btp.db")}`;
    const avant = open(url);
    await createLeadRepository(avant).insert(karim);
    avant.client.close();

    const apres = open(url);

    expect(await createLeadRepository(apres).findAll()).toEqual([karim]);
  });
});
