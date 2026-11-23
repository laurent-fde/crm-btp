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

  const email1: LeadEvent = {
    id: "email-1",
    leadId: "lead-1",
    type: "email_envoye",
    emailStep: 1,
    occurredAt: new Date("2026-11-24T09:00:00.000Z"),
  };

  // Critère 1 (lot 3) : l'événement « E-mail 1 envoyé » et le passage dans « E-mail envoyé » sont écrits ensemble.
  it("écrit l'envoi et le changement d'étape ensemble, puis relit l'événement avec son numéro", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));

    await repository.recordEvent(email1, { from: "nouveau", to: "email_envoye" });

    expect((await repository.findById("lead-1"))?.stage).toBe("email_envoye");
    expect(await repository.listEvents("lead-1")).toEqual([created(karim), email1]);
  });

  // Revue PR #10 : la mention « dernier e-mail » est gardée dans l'historique.
  it("garde la mention « dernier e-mail » de l'envoi", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));
    const dernier: LeadEvent = { ...email1, emailFinal: true };

    await repository.recordEvent(dernier, null);

    expect((await repository.listEvents("lead-1")).at(-1)).toEqual(dernier);
  });

  it("ne change pas l'étape si le lead a avancé entre-temps", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert({ ...karim, stage: "ouvert" }, created(karim));

    await repository.recordEvent(email1, { from: "nouveau", to: "email_envoye" });

    expect((await repository.findById("lead-1"))?.stage).toBe("ouvert");
    expect(await repository.listEvents("lead-1")).toHaveLength(2);
  });

  it("refuse d'enregistrer deux fois le même e-mail de la séquence, sans rien écrire", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));
    await repository.recordEvent(email1, null);

    await expect(
      repository.recordEvent({ ...email1, id: "email-1-bis" }, { from: "nouveau", to: "email_envoye" }),
    ).rejects.toThrow();

    expect(await repository.listEvents("lead-1")).toHaveLength(2);
    expect((await repository.findById("lead-1"))?.stage).toBe("nouveau");
  });

  const ouvert: LeadEvent = {
    id: "action-1",
    leadId: "lead-1",
    type: "email_ouvert",
    occurredAt: new Date("2026-11-25T09:00:00.000Z"),
    externalId: "evt-1",
  };

  // Lot 4 : l'action reçue garde l'identifiant de l'expéditeur, retrouvable pour le dédoublonnage.
  it("garde l'identifiant de l'expéditeur et retrouve l'événement par cet identifiant", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));

    await repository.recordEvent(ouvert, { from: "nouveau", to: "ouvert" });

    expect(await repository.findEventByExternalId("evt-1")).toEqual(ouvert);
    expect(await repository.findEventByExternalId("evt-2")).toBeNull();
    expect((await repository.findById("lead-1"))?.stage).toBe("ouvert");
  });

  it("refuse le même événement de l'expéditeur deux fois, sans rien écrire", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));
    await repository.recordEvent(ouvert, null);

    await expect(repository.recordEvent({ ...ouvert, id: "action-2" }, { from: "nouveau", to: "ouvert" })).rejects.toThrow();

    expect(await repository.listEvents("lead-1")).toHaveLength(2);
    expect((await repository.findById("lead-1"))?.stage).toBe("nouveau");
  });

  // Critère 4 (lot 4) : la date de la dernière action de chaque lead, pour le badge « Chaud ».
  it("donne la date du dernier événement de chaque lead, pour les types demandés", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));
    await repository.insert({ ...karim, id: "lead-2" }, { ...created(karim), id: "c2", leadId: "lead-2" });
    await repository.recordEvent(ouvert, null);
    await repository.recordEvent(
      { id: "action-2", leadId: "lead-1", type: "lien_clique", occurredAt: new Date("2026-11-26T09:00:00.000Z"), externalId: "evt-2" },
      null,
    );

    expect(await repository.lastEventDates(["email_ouvert", "lien_clique", "page_visitee"])).toEqual({
      "lead-1": new Date("2026-11-26T09:00:00.000Z"),
    });
  });

  // Lot 6 : passer dans « Perdu ». L'événement n'est écrit que si l'étape change vraiment.
  describe("recordStageChange", () => {
    const perdu: LeadEvent = { id: "perdu-1", leadId: "lead-1", type: "lead_perdu", occurredAt: new Date("2026-11-30T09:00:00.000Z") };

    // Critère 4 : un lead « Perdu » le reste après redémarrage.
    it("change l'étape et écrit l'événement ensemble, retrouvés après réouverture", async () => {
      const url = tempUrl();
      const avant = open(url);
      const repository = createLeadRepository(avant);
      await repository.insert({ ...karim, stage: "email_envoye" }, created(karim));

      expect(await repository.recordStageChange(perdu, { from: "email_envoye", to: "perdu" })).toBe(true);
      avant.client.close();

      const apres = createLeadRepository(open(url));
      expect((await apres.findById("lead-1"))?.stage).toBe("perdu");
      expect((await apres.listEvents("lead-1")).at(-1)).toEqual(perdu);
    });

    it("n'écrit rien si le lead a changé d'étape entre-temps", async () => {
      const repository = createLeadRepository(open(":memory:"));
      await repository.insert({ ...karim, stage: "lien_clique" }, created(karim));

      expect(await repository.recordStageChange(perdu, { from: "email_envoye", to: "perdu" })).toBe(false);

      expect((await repository.findById("lead-1"))?.stage).toBe("lien_clique");
      expect(await repository.listEvents("lead-1")).toHaveLength(1);
    });
  });

  // Revue #14 : la date de réception d'une action (horloge de l'app) est gardée.
  it("garde la date de réception d'une action", async () => {
    const repository = createLeadRepository(open(":memory:"));
    await repository.insert(karim, created(karim));
    const action: LeadEvent = {
      id: "action-1",
      leadId: "lead-1",
      type: "email_ouvert",
      occurredAt: new Date("2026-11-23T09:00:00.000Z"),
      receivedAt: new Date("2026-11-30T09:00:00.000Z"),
      externalId: "evt-r",
    };

    await repository.recordEvent(action, null);

    expect((await repository.listEvents("lead-1")).at(-1)).toEqual(action);
  });
});
