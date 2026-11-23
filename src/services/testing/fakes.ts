// Faux ports pour les tests du service : aucune vraie base, une horloge et des identifiants prévisibles.

import type { Clock, IdGenerator, Lead, LeadRepository } from "../ports";

export function createFakeLeadRepository(initial: Lead[] = []) {
  const leads = [...initial];
  const repository: LeadRepository = {
    insert: async (lead) => {
      leads.push(lead);
    },
    findAll: async () => [...leads],
  };
  return { repository, leads };
}

export function createFakeClock(iso = "2026-11-23T09:00:00.000Z"): Clock {
  return { now: () => new Date(iso) };
}

export function createFakeIds(prefix = "lead"): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}
