// Faux ports pour les tests du service : aucune vraie base, une horloge et des identifiants prévisibles.

import type { Clock, ClockOffsetRepository, EmailMessage, EmailSender, IdGenerator, Lead, LeadEvent, LeadRepository, Settings, SettingsRepository } from "../ports";

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
    findEventByExternalId: async (externalId) => events.find((event) => event.externalId === externalId) ?? null,
    lastEventDates: async (types) => {
      const last: Record<string, Date> = {};
      for (const event of events) {
        if (!types.includes(event.type)) continue;
        if (!last[event.leadId] || event.occurredAt > last[event.leadId]) last[event.leadId] = event.occurredAt;
      }
      return last;
    },
    recordEvent: async (event, stageChange) => {
      events.push(event);
      const lead = leads.find((l) => l.id === event.leadId);
      if (lead && stageChange && lead.stage === stageChange.from) lead.stage = stageChange.to;
    },
    recordStageChange: async (event, { from, to }) => {
      const lead = leads.find((l) => l.id === event.leadId);
      if (!lead || lead.stage !== from) return false;
      lead.stage = to;
      events.push(event);
      return true;
    },
  };
  return { repository, leads, events };
}

export function createFakeClock(iso = "2026-11-23T09:00:00.000Z"): Clock {
  return { now: () => new Date(iso) };
}

// Horloge qu'on avance à la main (simulation du passage du temps).
export function createMovableClock(iso = "2026-11-23T09:00:00.000Z") {
  let current = new Date(iso).getTime();
  const clock: Clock = { now: () => new Date(current) };
  return { clock, advanceDays: (days: number) => (current += days * 86_400_000) };
}

// Faux décalage d'horloge : garde chaque valeur enregistrée.
export function createFakeClockOffsetRepository(initial = 0) {
  const values: number[] = [];
  let current = initial;
  const repository: ClockOffsetRepository = {
    load: async () => current,
    save: async (offsetMs) => {
      current = offsetMs;
      values.push(offsetMs);
    },
    advanceBy: async (ms) => {
      current += ms;
      values.push(current);
      return current;
    },
  };
  return { repository, values };
}

export function createFakeIds(prefix = "lead"): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

// Faux fournisseur d'e-mails : garde chaque envoi en mémoire.
export function createFakeEmailSender() {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = {
    send: async (message) => {
      sent.push(message);
      return { messageId: `msg-${sent.length}` };
    },
  };
  return { sender, sent };
}

// Faux réglages : en mémoire, vides par défaut (les valeurs par défaut s'appliquent).
export function createFakeSettingsRepository(initial: Partial<Settings> = {}) {
  const values: Partial<Settings> = { ...initial };
  const repository: SettingsRepository = {
    load: async () => ({ ...values }),
    save: async (settings) => {
      Object.assign(values, settings);
    },
  };
  return { repository, values };
}
