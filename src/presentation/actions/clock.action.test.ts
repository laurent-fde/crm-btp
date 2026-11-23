import { beforeEach, describe, expect, it, vi } from "vitest";

const advance = vi.fn();
const reset = vi.fn();
const markLostLeads = vi.fn();
const refresh = vi.fn();
vi.mock("@/composition", () => ({
  getClockService: async () => ({ advance, reset }),
  getLifecycleService: async () => ({ markLostLeads }),
}));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

import { changeClockAction } from "./clock.action";

const form = (intent: string) => {
  const data = new FormData();
  data.set("intent", intent);
  return data;
};

describe("présentation · clock.action · changeClockAction", () => {
  beforeEach(() => {
    [advance, reset, markLostLeads, refresh].forEach((mock) => mock.mockReset());
    markLostLeads.mockResolvedValue({ ok: true, lost: [] });
  });

  // Critère 1 : avancer l'horloge, puis vérifier les leads perdus avec la nouvelle date, puis redessiner.
  it("avance l'horloge, vérifie les leads perdus, puis redessine", async () => {
    advance.mockResolvedValue({ ok: true, status: { now: new Date(), offsetDays: 7 } });

    expect(await changeClockAction(null, form("7"))).toEqual({ ok: true });

    expect(advance).toHaveBeenCalledWith("7");
    expect(markLostLeads).toHaveBeenCalledOnce();
    expect(advance.mock.invocationCallOrder[0]).toBeLessThan(markLostLeads.mock.invocationCallOrder[0]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie le refus sans rien vérifier ni redessiner", async () => {
    advance.mockResolvedValue({ ok: false, message: "Entre 1 et 365 jours." });

    expect(await changeClockAction(null, form("0"))).toEqual({ ok: false, message: "Entre 1 et 365 jours." });
    expect(markLostLeads).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("revient à aujourd'hui, puis redessine", async () => {
    reset.mockResolvedValue({ ok: true, status: { now: new Date(), offsetDays: 0 } });

    expect(await changeClockAction(null, form("reset"))).toEqual({ ok: true });
    expect(advance).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
