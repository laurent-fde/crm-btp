// Service · réglages : lire et modifier les réglages de l'app. Valide toute saisie.

import { z } from "zod";
import {
  LOST_DELAY_MAX,
  LOST_DELAY_MIN,
  SEQUENCE_LENGTH_MAX,
  SEQUENCE_LENGTH_MIN,
  withDefaults,
  type Settings,
} from "./domain/settings";
import type { SettingsRepository } from "./ports";

// Un champ absent garde sa valeur enregistrée.
export type SettingsInput = { sequenceLength?: string; lostDelayDays?: string };
export type SettingsField = keyof SettingsInput;
export type UpdateSettingsResult =
  | { ok: true; settings: Settings }
  | { ok: false; errors: Partial<Record<SettingsField, string>>; formError?: string };

const LENGTH_MESSAGE = `Entre ${SEQUENCE_LENGTH_MIN} et ${SEQUENCE_LENGTH_MAX} e-mails`;
const DELAY_MESSAGE = `Entre ${LOST_DELAY_MIN} et ${LOST_DELAY_MAX} jours`;
const SAVE_FAILED = "Enregistrement impossible pour le moment. Réessaie dans un instant.";

const integerBetween = (min: number, max: number, message: string) =>
  z.string(message).trim().regex(/^\d+$/, message).transform(Number).pipe(z.number().min(min, message).max(max, message));

const settingsSchema = z.object({
  sequenceLength: integerBetween(SEQUENCE_LENGTH_MIN, SEQUENCE_LENGTH_MAX, LENGTH_MESSAGE).optional(),
  lostDelayDays: integerBetween(LOST_DELAY_MIN, LOST_DELAY_MAX, DELAY_MESSAGE).optional(),
});

const FIELDS: SettingsField[] = ["sequenceLength", "lostDelayDays"];

export function createSettingsService({ repository }: { repository: SettingsRepository }) {
  return {
    async getSettings(): Promise<Settings> {
      return withDefaults(await repository.load());
    },

    async updateSettings(input: SettingsInput): Promise<UpdateSettingsResult> {
      const parsed = settingsSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
        const errors: Partial<Record<SettingsField, string>> = {};
        for (const field of FIELDS) if (fieldErrors[field]?.[0]) errors[field] = fieldErrors[field][0];
        return { ok: false, errors };
      }
      try {
        // #18 : on n'écrit que les champs reçus, puis on relit l'état enregistré (qui inclut
        // une éventuelle modification simultanée d'un autre champ).
        await repository.save(stripUndefined(parsed.data));
        return { ok: true, settings: withDefaults(await repository.load()) };
      } catch {
        return { ok: false, errors: {}, formError: SAVE_FAILED };
      }
    },
  };
}

const stripUndefined = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

export type SettingsService = ReturnType<typeof createSettingsService>;
