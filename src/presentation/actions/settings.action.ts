"use server";

// Présentation · action des réglages. Passe par le service (via la composition), jamais par la base.

import { refresh } from "next/cache";
import { getSettingsService } from "@/composition";
import type { SettingsField } from "@/services/settings.service";

export type SettingsState =
  | { ok: true }
  | {
      ok: false;
      errors: Partial<Record<SettingsField, string>>;
      formError?: string;
      values?: Partial<Record<SettingsField, string>>;
    }
  | null;

export async function updateSettingsAction(_previous: SettingsState, formData: FormData): Promise<SettingsState> {
  const input = { sequenceLength: String(formData.get("sequenceLength") ?? "") };
  const result = await getSettingsService().updateSettings(input);
  if (!result.ok) return { ok: false, errors: result.errors, ...(result.formError && { formError: result.formError }), values: input };
  refresh();
  return { ok: true };
}
