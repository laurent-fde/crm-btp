// Service · lead : cas d'usage. Reçoit ses ports en paramètre, valide toute saisie.

import { z } from "zod";
import { groupByStage, SUGGESTED_TRADES, type BoardColumn, type Lead } from "./domain/lead";
import { leadSchema } from "./lead.schema";
import type { Clock, IdGenerator, LeadRepository } from "./ports";

// Saisie reçue (formulaire, action) : tous les champs facultatifs, c'est le schéma qui décide.
export type LeadInput = {
  name?: string;
  company?: string;
  trade?: string;
  city?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
};

export type LeadField = keyof LeadInput;
export type LeadFieldErrors = Partial<Record<LeadField, string>>;
export type AddLeadResult =
  | { ok: true; lead: Lead }
  | { ok: false; errors: LeadFieldErrors; formError?: string };

const SAVE_FAILED = "Enregistrement impossible pour le moment. Réessaie dans un instant.";

// Métiers proposés à la saisie : aucune dépendance, utilisable sans ouvrir la base.
export function getSuggestedTrades(): string[] {
  return [...SUGGESTED_TRADES];
}

export type LeadServiceDeps = { repository: LeadRepository; clock: Clock; ids: IdGenerator };

export function createLeadService({ repository, clock, ids }: LeadServiceDeps) {
  return {
    async addLead(input: LeadInput): Promise<AddLeadResult> {
      const parsed = leadSchema.safeParse(input);
      if (!parsed.success) {
        // Le premier message de chaque champ.
        const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
        const errors: LeadFieldErrors = {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0]) errors[field as LeadField] = messages[0];
        }
        return { ok: false, errors };
      }
      const lead: Lead = { id: ids.next(), ...parsed.data, stage: "nouveau", createdAt: clock.now() };
      try {
        await repository.insert(lead);
      } catch {
        // Une panne (base injoignable…) n'est pas une erreur de saisie : message général, la saisie est gardée.
        return { ok: false, errors: {}, formError: SAVE_FAILED };
      }
      return { ok: true, lead };
    },

    async getBoard(): Promise<BoardColumn[]> {
      return groupByStage(await repository.findAll());
    },
  };
}

export type LeadService = ReturnType<typeof createLeadService>;
