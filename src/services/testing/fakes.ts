// Faux ports pour les tests du service : aucune vraie base, une horloge et des identifiants prévisibles.

import type { Clock, IdGenerator, Lead, LeadEvent, LeadRepository } from "../ports";

export function createFakeLeadRepository(initial: Lead[] = [], initialEvents: LeadEvent[] = []) {
  const leads = [...initial];
  const events = [...initialEvents];
  const repository: LeadRepository = {
    insert: async (lead, event) => {
      leads.push(lead);
      events.push(event);
    },
    findAll: async () => [...leads],
    findById: async (id) => leads.find((lead) => lead.id === id) ?? null,
    updateDetails: async (id, details) => {
      const index = leads.findIndex((lead) => lead.id === id);
      if (index < 0) return false;
      leads[index] = { ...leads[index], ...details };
      return true;
    },
    listEvents: async (leadId) => events.filter((event) => event.leadId === leadId),
  };
  return { repository, leads, events };
}

export function createFakeClock(iso = "2026-11-23T09:00:00.000Z"): Clock {
  return { now: () => new Date(iso) };
}

export function createFakeIds(prefix = "lead"): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}
