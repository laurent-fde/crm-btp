// Service · réglages : lire et modifier les réglages de l'app. Valide toute saisie.

import { z } from "zod";
import { SEQUENCE_LENGTH_MAX, SEQUENCE_LENGTH_MIN, withDefaults, type Settings } from "./domain/settings";
import type { SettingsRepository } from "./ports";

export type SettingsInput = { sequenceLength?: string };
export type SettingsField = keyof SettingsInput;
export type UpdateSettingsResult =
  | { ok: true; settings: Settings }
  | { ok: false; errors: Partial<Record<SettingsField, string>>; formError?: string };

const LENGTH_MESSAGE = `Entre ${SEQUENCE_LENGTH_MIN} et ${SEQUENCE_LENGTH_MAX} e-mails`;
const SAVE_FAILED = "Enregistrement impossible pour le moment. Réessaie dans un instant.";

const settingsSchema = z.object({
  sequenceLength: z
    .string(LENGTH_MESSAGE)
    .trim()
    .regex(/^\d+$/, LENGTH_MESSAGE)
    .transform(Number)
    .pipe(z.number().min(SEQUENCE_LENGTH_MIN, LENGTH_MESSAGE).max(SEQUENCE_LENGTH_MAX, LENGTH_MESSAGE)),
});

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
        if (fieldErrors.sequenceLength?.[0]) errors.sequenceLength = fieldErrors.sequenceLength[0];
        return { ok: false, errors };
      }
      try {
        await repository.save(parsed.data);
      } catch {
        return { ok: false, errors: {}, formError: SAVE_FAILED };
      }
      return { ok: true, settings: parsed.data };
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
