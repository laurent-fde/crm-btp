import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSettings = vi.fn();
const refresh = vi.fn();
vi.mock("@/composition", () => ({ getSettingsService: () => ({ updateSettings }) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

import { updateSettingsAction } from "./settings.action";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("présentation · settings.action", () => {
  beforeEach(() => {
    updateSettings.mockReset();
    refresh.mockReset();
  });

  it("transmet la saisie au service, puis redessine", async () => {
    updateSettings.mockResolvedValue({ ok: true, settings: { sequenceLength: 5 } });

    const state = await updateSettingsAction(null, form({ sequenceLength: "5" }));

    expect(updateSettings).toHaveBeenCalledWith({ sequenceLength: "5" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ ok: true });
  });

  it("renvoie l'erreur et la saisie, sans redessiner", async () => {
    updateSettings.mockResolvedValue({ ok: false, errors: { sequenceLength: "Entre 1 et 10 e-mails" } });

    const state = await updateSettingsAction(null, form({ sequenceLength: "12" }));

    expect(state).toEqual({
      ok: false,
      errors: { sequenceLength: "Entre 1 et 10 e-mails" },
      values: { sequenceLength: "12" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
