import { describe, expect, it } from "vitest";
import { createClockService } from "./clock.service";
import type { LeadEvent } from "./ports";
import { createFakeClock, createFakeClockOffsetRepository, createFakeLeadRepository } from "./testing/fakes";

const DAY = 86_400_000;

function setup(offsetMs = 0, events: LeadEvent[] = []) {
  const offsets = createFakeClockOffsetRepository(offsetMs);
  const leads = createFakeLeadRepository([], events).repository;
  const service = createClockService({ offsets: offsets.repository, realClock: createFakeClock("2026-11-23T09:00:00.000Z"), leads });
  return { ...offsets, service };
}

describe("service · clock.service", () => {
  it("donne l'heure réelle tant que l'horloge n'a pas été avancée", async () => {
    const { service } = setup();

    expect(await service.getStatus()).toEqual({ now: new Date("2026-11-23T09:00:00.000Z"), offsetDays: 0 });
  });

  it("avance l'horloge de 1 jour puis de 7 jours, et garde le décalage", async () => {
    const { service, values } = setup();

    expect(await service.advance("1")).toEqual({ ok: true, status: { now: new Date("2026-11-24T09:00:00.000Z"), offsetDays: 1 } });
    expect(await service.advance(" 7 ")).toEqual({ ok: true, status: { now: new Date("2026-12-01T09:00:00.000Z"), offsetDays: 8 } });
    expect(values.at(-1)).toBe(8 * DAY);
  });

  // Revue #14 : l'avance passe par une seule opération (pas de lecture puis écriture), pour ne pas perdre un clic.
  it("ajoute l'avance en une seule opération", async () => {
    const { service, repository } = setup();
    repository.load = async () => {
      throw new Error("ne doit pas relire avant d'avancer");
    };

    expect(await service.advance("7")).toEqual({ ok: true, status: { now: new Date("2026-11-30T09:00:00.000Z"), offsetDays: 7 } });
  });

  it.each(["0", "366", "1.5", "-1", "abc", ""])("refuse d'avancer de « %s » sans rien changer", async (saisie) => {
    const { service, values } = setup();

    expect(await service.advance(saisie)).toEqual({ ok: false, message: "Entre 1 et 365 jours." });
    expect(values).toEqual([]);
  });

  it("revient à aujourd'hui", async () => {
    const { service } = setup(8 * DAY);

    expect(await service.reset()).toEqual({ ok: true, status: { now: new Date("2026-11-23T09:00:00.000Z"), offsetDays: 0 } });
  });

  it("renvoie un refus si l'enregistrement échoue", async () => {
    const { service, repository } = setup();
    repository.advanceBy = async () => {
      throw new Error("base injoignable");
    };

    expect(await service.advance("1")).toEqual({ ok: false, message: "Enregistrement impossible pour le moment. Réessaie dans un instant." });
  });

  // #17, option B : le retour à aujourd'hui reste possible, mais l'app dit combien d'événements sont datés après sa date.
  describe("événements datés dans le futur", () => {
    const at = (iso: string, id: string): LeadEvent => ({ id, leadId: "lead-m", type: "email_envoye", emailStep: 1, occurredAt: new Date(iso) });
    const events = [at("2026-11-23T08:00:00.000Z", "passe"), at("2026-11-27T09:00:00.000Z", "j4"), at("2026-12-04T09:00:00.000Z", "j11")];

    it("compte les événements datés après la date de l'app, une fois revenu à aujourd'hui", async () => {
      const { service } = setup(11 * DAY, events);
      expect(await service.futureEvents()).toBe(0);

      await service.reset();

      expect(await service.futureEvents()).toBe(2);
    });

    it("ne compte que ceux qui dépassent la date simulée", async () => {
      const { service } = setup(7 * DAY, events);

      expect(await service.futureEvents()).toBe(1);
    });

    // Revue de 2435430 : un seul service dans ce test, celui dont la base ne répond pas.
    it("renvoie 0 si la base ne répond pas (l'avertissement n'empêche pas d'afficher l'en-tête)", async () => {
      const leads = createFakeLeadRepository([], events).repository;
      leads.countEventsAfter = async () => {
        throw new Error("base injoignable");
      };
      const service = createClockService({ offsets: createFakeClockOffsetRepository().repository, realClock: createFakeClock(), leads });

      expect(await service.futureEvents()).toBe(0);
    });
  });
});
