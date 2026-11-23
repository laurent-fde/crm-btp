import { describe, expect, it } from "vitest";
import { createClockService } from "./clock.service";
import { createFakeClock, createFakeClockOffsetRepository } from "./testing/fakes";

const DAY = 86_400_000;

function setup(offsetMs = 0) {
  const offsets = createFakeClockOffsetRepository(offsetMs);
  const service = createClockService({ offsets: offsets.repository, realClock: createFakeClock("2026-11-23T09:00:00.000Z") });
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
});
