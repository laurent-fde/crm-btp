"use server";

// Présentation · action d'ajout d'un lead. Passe par le service (via la composition), jamais par la base.

import { refresh } from "next/cache";
import { getLeadService } from "@/composition";
import type { LeadField, LeadFieldErrors, LeadInput } from "@/services/lead.service";

export type AddLeadState =
  | { ok: true }
  | { ok: false; errors: LeadFieldErrors; formError?: string; values?: Partial<Record<LeadField, string>> }
  | null;

const FIELDS: LeadField[] = ["name", "company", "trade", "city", "postalCode", "email", "phone"];

export async function addLeadAction(_previous: AddLeadState, formData: FormData): Promise<AddLeadState> {
  const input = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as Required<LeadInput>;

  const result = await getLeadService().addLead(input);
  if (!result.ok) return { ok: false, errors: result.errors, formError: result.formError, values: input };

  refresh();
  return { ok: true };
}
