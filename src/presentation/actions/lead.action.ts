"use server";

// Présentation · actions sur un lead (ajout, modification). Passent par le service (via la composition), jamais par la base.

import { refresh } from "next/cache";
import { getLeadService, getSequenceService } from "@/composition";
import type { LeadField, LeadFieldErrors, LeadInput, SaveLeadResult } from "@/services/lead.service";

export type LeadFormState =
  | { ok: true }
  | { ok: false; errors: LeadFieldErrors; formError?: string; values?: Partial<Record<LeadField, string>> }
  | null;
export type AddLeadState = LeadFormState;
export type SequenceState = { ok: true } | { ok: false; message: string } | null;

const FIELDS: LeadField[] = ["name", "company", "trade", "city", "postalCode", "email", "phone"];

function readInput(formData: FormData): Required<LeadInput> {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")])) as Required<LeadInput>;
}

// Réponse commune : en cas de refus, les erreurs et la saisie ; en cas de succès, la page est redessinée.
function toState(result: SaveLeadResult, input: Required<LeadInput>): LeadFormState {
  if (!result.ok) return { ok: false, errors: result.errors, formError: result.formError, values: input };
  refresh();
  return { ok: true };
}

export async function addLeadAction(_previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const input = readInput(formData);
  return toState(await getLeadService().addLead(input), input);
}

export async function updateLeadAction(_previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const input = readInput(formData);
  const leadId = String(formData.get("leadId") ?? "");
  return toState(await getLeadService().updateLead(leadId, input), input);
}

// Envoie l'e-mail suivant de la séquence ; en cas de succès, la fiche et la carte sont redessinées.
export async function sendNextEmailAction(_previous: SequenceState, formData: FormData): Promise<SequenceState> {
  const result = await getSequenceService().sendNextEmail(String(formData.get("leadId") ?? ""));
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}
