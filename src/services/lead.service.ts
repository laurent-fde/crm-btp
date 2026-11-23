// Service · lead : cas d'usage. Reçoit ses ports en paramètre, valide toute saisie.

import { z } from "zod";
import {
  eventLabel,
  groupByStage,
  HOT_ACTION_TYPES,
  isHot,
  sortHistory,
  SUGGESTED_TRADES,
  type BoardColumn,
  type Lead,
  type LeadEventType,
} from "./domain/lead";
import { boardStats, sequenceStep, type BoardStats } from "./domain/board-stats";
import { sequenceStatus, type SequenceStatus } from "./domain/sequence";
import { withDefaults } from "./domain/settings";
import { leadSchema } from "./lead.schema";
import type { Clock, IdGenerator, LeadRepository, SettingsRepository } from "./ports";

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
export type SaveLeadResult =
  | { ok: true; lead: Lead }
  | { ok: false; errors: LeadFieldErrors; formError?: string };
export type AddLeadResult = SaveLeadResult;
export type UpdateLeadResult = SaveLeadResult;

export type LeadHistoryItem = { id: string; type: LeadEventType; label: string; occurredAt: Date };
export type LeadDetail = { lead: Lead; history: LeadHistoryItem[]; sequence: SequenceStatus };
export type LeadDetailResult = ({ ok: true } & LeadDetail) | { ok: false; message: string };

// Le tableau : les colonnes, leurs statistiques, et la longueur de la séquence (pour « E-mail N/longueur »).
export type Board = { columns: BoardColumn[]; stats: BoardStats; sequenceLength: number };

export type LeadServiceDeps = {
  repository: LeadRepository;
  clock: Clock;
  ids: IdGenerator;
  settings: SettingsRepository;
};

const SAVE_FAILED = "Enregistrement impossible pour le moment. Réessaie dans un instant.";
const NOT_FOUND = "Ce lead n'existe pas ou plus.";
const LOAD_FAILED = "Fiche indisponible pour le moment. Réessaie dans un instant.";

// Métiers proposés à la saisie : aucune dépendance, utilisable sans ouvrir la base.
export function getSuggestedTrades(): string[] {
  return [...SUGGESTED_TRADES];
}

type Parsed = { ok: true; data: z.output<typeof leadSchema> } | { ok: false; errors: LeadFieldErrors };

// Même validation pour l'ajout et la modification : mêmes règles, mêmes messages.
function parseLead(input: LeadInput): Parsed {
  const parsed = leadSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  // Le premier message de chaque champ.
  const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
  const errors: LeadFieldErrors = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field as LeadField] = messages[0];
  }
  return { ok: false, errors };
}

export function createLeadService({ repository, clock, ids, settings }: LeadServiceDeps) {
  return {
    async addLead(input: LeadInput): Promise<AddLeadResult> {
      const parsed = parseLead(input);
      if (!parsed.ok) return parsed;
      const now = clock.now();
      const lead: Lead = { id: ids.next(), ...parsed.data, stage: "nouveau", createdAt: now };
      try {
        await repository.insert(lead, { id: ids.next(), leadId: lead.id, type: "lead_cree", occurredAt: now });
      } catch {
        // Une panne (base injoignable…) n'est pas une erreur de saisie : message général, la saisie est gardée.
        return { ok: false, errors: {}, formError: SAVE_FAILED };
      }
      return { ok: true, lead };
    },

    async updateLead(id: string, input: LeadInput): Promise<UpdateLeadResult> {
      const parsed = parseLead(input);
      if (!parsed.ok) return parsed;
      if (!id.trim()) return { ok: false, errors: {}, formError: NOT_FOUND };
      try {
        // Seuls les 7 champs de la fiche sont écrits : l'étape (que les webhooks font avancer) n'est jamais réécrite.
        const updated = await repository.updateDetails(id, parsed.data);
        const lead = updated ? await repository.findById(id) : null;
        if (!lead) return { ok: false, errors: {}, formError: NOT_FOUND };
        return { ok: true, lead };
      } catch {
        return { ok: false, errors: {}, formError: SAVE_FAILED };
      }
    },

    async getLeadDetail(id: string): Promise<LeadDetailResult> {
      if (!id.trim()) return { ok: false, message: NOT_FOUND };
      try {
        const lead = await repository.findById(id);
        if (!lead) return { ok: false, message: NOT_FOUND };
        const events = sortHistory(await repository.listEvents(id));
        const history = events.map((event) => ({
          id: event.id,
          type: event.type,
          label: eventLabel(event),
          occurredAt: event.occurredAt,
        }));
        const { sequenceLength } = withDefaults(await settings.load());
        return { ok: true, lead, history, sequence: sequenceStatus(lead.stage, events, sequenceLength) };
      } catch {
        // Base injoignable : un message dans la fiche, le tableau reste affiché.
        return { ok: false, message: LOAD_FAILED };
      }
    },

    async getBoard(): Promise<Board> {
      const [leads, lastActions, emails, saved] = await Promise.all([
        repository.findAll(),
        repository.lastEventDates(HOT_ACTION_TYPES),
        repository.emailCounts(),
        settings.load(),
      ]);
      const now = clock.now();
      const { sequenceLength } = withDefaults(saved);
      const columns = groupByStage(
        leads.map((lead) => ({ ...lead, hot: isHot(lastActions[lead.id] ?? null, now), emailStep: sequenceStep(emails[lead.id] ?? 0, sequenceLength) })),
      );
      return { columns, stats: boardStats(columns, sequenceLength), sequenceLength };
    },
  };
}

export type LeadService = ReturnType<typeof createLeadService>;
