// @vitest-environment node
// Composition · câblage réel de l'horloge (#19) : le décalage enregistré est relu à chaque service créé.
// Vraie base libsql en mémoire, vrais adaptateurs, vrais services : seul `server-only` est neutralisé.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase, type Database } from "@/data/db";
import {
  getClockService,
  getLeadService,
  getLifecycleService,
  getSequenceService,
} from "./composition";

vi.mock("server-only", () => ({}));

// getDatabase() garde sa connexion dans globalThis.crmBtpDb : on y place une base neuve pour chaque test.
const globalForDb = globalThis as unknown as { crmBtpDb?: Database };

describe("composition · horloge de l'app", () => {
  beforeEach(() => {
    globalForDb.crmBtpDb = openDatabase(":memory:");
  });
  afterEach(() => {
    globalForDb.crmBtpDb?.client.close();
    delete globalForDb.crmBtpDb;
  });

  // Lead dont la séquence (3 e-mails par défaut) est terminée, à la date réelle.
  async function leadWithFinishedSequence() {
    const added = await (await getLeadService()).addLead({ name: "Paul Martin", email: "paul@exemple.fr" });
    if (!added.ok) throw new Error("ajout du lead refusé");
    const sequence = await getSequenceService();
    for (let step = 1; step <= 3; step++) {
      expect(await sequence.sendNextEmail(added.lead.id)).toEqual({ ok: true, step });
    }
    return added.lead.id;
  }

  async function stageOf(id: string) {
    const detail = await (await getLeadService()).getLeadDetail(id);
    if (!detail.ok) throw new Error("lead introuvable");
    return detail.lead.stage;
  }

  it("sans avance de l'horloge, le lead n'est pas perdu", async () => {
    const id = await leadWithFinishedSequence();

    expect(await (await getLifecycleService()).markLostLeads()).toEqual({ ok: true, lost: [] });
    expect(await stageOf(id)).toBe("email_envoye");
  });

  it("après une avance de 8 jours, le service de cycle de vie voit la nouvelle date : le lead passe dans « Perdu »", async () => {
    const id = await leadWithFinishedSequence();

    expect((await (await getClockService()).advance("8")).ok).toBe(true);

    expect(await (await getLifecycleService()).markLostLeads()).toEqual({ ok: true, lost: [id] });
    expect(await stageOf(id)).toBe("perdu");
  });
});
