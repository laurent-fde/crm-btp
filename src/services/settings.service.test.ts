import { describe, expect, it } from "vitest";
import { createSettingsService } from "./settings.service";
import { createFakeSettingsRepository } from "./testing/fakes";

describe("service · settings.service", () => {
  it("renvoie les réglages par défaut tant que rien n'est enregistré", async () => {
    const { repository } = createFakeSettingsRepository();

    expect(await createSettingsService({ repository }).getSettings()).toEqual({ sequenceLength: 3 });
  });

  // Revue PR #10 : « abc » en base (relu NaN) donne la valeur par défaut.
  it("revient à la valeur par défaut si la base contient une longueur aberrante", async () => {
    const { repository } = createFakeSettingsRepository({ sequenceLength: Number.NaN });

    expect(await createSettingsService({ repository }).getSettings()).toEqual({ sequenceLength: 3 });
  });

  it("enregistre une nouvelle longueur de séquence", async () => {
    const { repository, values } = createFakeSettingsRepository();
    const service = createSettingsService({ repository });

    const result = await service.updateSettings({ sequenceLength: " 5 " });

    expect(result).toEqual({ ok: true, settings: { sequenceLength: 5 } });
    expect(values).toEqual({ sequenceLength: 5 });
    expect(await service.getSettings()).toEqual({ sequenceLength: 5 });
  });

  it.each(["0", "11", "2.5", "abc", ""])("refuse « %s » sans rien enregistrer", async (saisie) => {
    const { repository, values } = createFakeSettingsRepository();

    const result = await createSettingsService({ repository }).updateSettings({ sequenceLength: saisie });

    expect(result).toEqual({ ok: false, errors: { sequenceLength: "Entre 1 et 10 e-mails" } });
    expect(values).toEqual({});
  });

  it("renvoie un message général si l'enregistrement échoue", async () => {
    const { repository } = createFakeSettingsRepository();
    repository.save = async () => {
      throw new Error("base injoignable");
    };

    expect(await createSettingsService({ repository }).updateSettings({ sequenceLength: "4" })).toEqual({
      ok: false,
      errors: {},
      formError: "Enregistrement impossible pour le moment. Réessaie dans un instant.",
    });
  });
});
