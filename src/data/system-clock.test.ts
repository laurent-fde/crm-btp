import { describe, expect, it } from "vitest";
import { systemClock, withOffset } from "./system-clock";

describe("données · system-clock", () => {
  it("donne l'heure du système", () => {
    const before = Date.now();
    const now = systemClock.now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  // Lot 6 : l'horloge simulée = l'heure réelle + le décalage enregistré (le temps continue de s'écouler).
  it("ajoute le décalage à une horloge", () => {
    const real = { now: () => new Date("2026-11-23T09:00:00.000Z") };

    expect(withOffset(real, 7 * 86_400_000).now()).toEqual(new Date("2026-11-30T09:00:00.000Z"));
  });
});
