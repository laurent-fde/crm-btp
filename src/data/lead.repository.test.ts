// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Lead, LeadEvent } from "@/services/ports";
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
const created = (lead: Lead): LeadEvent => ({
  id: `event-${lead.id}`,
  leadId: lead.id,
  type: "lead_cree",
  occurredAt: lead.createdAt,
});

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
  const tempUrl = () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-btp-"));
    dirs.push(dir);
    return `file:${join(dir, "crm-btp.db")}`;
  };

  it("écrit un lead puis le relit à l'identique, champs vides compris", async () => {
    const repository = createLeadRepository(open(":memory:"));
    const jeanne: Lead = {
      ...karim,
      id: "lead-2",
      name: "Jeanne Morel",
      company: null,
      trade: null,
      city: null,
      postalCode: null,
      phone: null,
    };

    await repository.insert(karim, created(karim));
    await repository.insert(jeanne, created(jeanne));

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
    expect(all).toContainEqual(karim);
    expect(all).toContainEqual(jeanne);
  });

  it("garde un nom avec apostrophe tel quel (requête paramétrée)", async () => {
    const repository = createLeadRepository(open(":memory:"));

    await repository.insert({ ...karim, name: "Jean d'Ormesson" }, created(karim));

    expect((await repository.findAll())[0].name).toBe("Jean d'Ormesson");
  });

  // Critère 4 (lot 1) : après redémarrage, le lead est toujours dans « Nouveau ».
  it("retrouve le lead dans « Nouveau » après fermeture et réouverture de la base", async () => {
    const url = tempUrl();
    const avant = open(url);
    await createLeadRepository(avant).insert(karim, created(karim));
    avant.client.close();

    const apres = open(url);

    expect(await createLeadRepository(apres).findAll()).toEqual([karim]);
  });

  // Critère 1 (lot 2) : le lead et son « Lead créé » sont écrits ensemble, puis relus.
  it("écrit le lead et son premier événement ensemble, puis relit l'historique du lead", async () => {
    const repository = createLeadRepository(open(":memory:"));

    await repository.insert(karim, created(karim));

    expect(await repository.findById("lead-1")).toEqual(karim);
    expect(await repository.listEvents("lead-1")).toEqual([created(karim)]);
    expect(await repository.listEvents("autre")).toEqual([]);
  });

  it("n'écrit rien si l'événement ne peut pas être écrit (tout ou rien)", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));

    // Même identifiant d'événement : l'écriture échoue, le 2ᵉ lead ne doit pas apparaître.
    await expect(repository.insert({ ...karim, id: "lead-2" }, created(karim))).rejects.toThrow();

    expect(await repository.findById("lead-2")).toBeNull();
  });

  it("ne trouve rien pour un identifiant inconnu", async () => {
    const repository = createLeadRepository(open(":memory:"));

    expect(await repository.findById("inconnu")).toBeNull();
  });

  // Critère 2 (lot 2) : la modification est toujours là après redémarrage.
  // Revue PR #9 : seuls les 7 champs de la fiche changent ; l'étape et la date de création ne bougent pas.
  it("modifie les 7 champs de la fiche sans toucher à l'étape ni à la date, retrouvés après réouverture", async () => {
    const url = tempUrl();
    const avant = open(url);
    await createLeadRepository(avant).insert({ ...karim, stage: "ouvert" }, created(karim));
    const details = {
      name: "Karim B.",
      company: null,
      trade: "Électricien",
      city: "Villeurbanne",
      postalCode: "69100",
      email: "karim@exemple.fr",
      phone: null,
    };
    expect(await createLeadRepository(avant).updateDetails("lead-1", details)).toBe(true);
    avant.client.close();

    const apres = open(url);

    expect(await createLeadRepository(apres).findById("lead-1")).toEqual({
      ...karim,
      ...details,
      stage: "ouvert",
      createdAt: karim.createdAt,
    });
  });

  it("signale qu'aucun lead n'a été modifié pour un identifiant inconnu", async () => {
    const repository = createLeadRepository(open(":memory:"));

    expect(
      await repository.updateDetails("inconnu", {
        name: "X",
        company: null,
        trade: null,
        city: null,
        postalCode: null,
        email: "x@exemple.fr",
        phone: null,
      }),
    ).toBe(false);
  });
});
