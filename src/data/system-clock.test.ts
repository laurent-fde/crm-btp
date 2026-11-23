import { describe, expect, it } from "vitest";
import { systemClock } from "./system-clock";

describe("données · system-clock", () => {
  it("donne l'heure du système", () => {
    const before = Date.now();
    const now = systemClock.now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
