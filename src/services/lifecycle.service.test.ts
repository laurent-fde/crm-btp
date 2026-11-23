import { describe, expect, it } from "vitest";
import { createLifecycleService } from "./lifecycle.service";
import type { Lead, LeadEvent, Stage } from "./ports";
import { createFakeIds, createFakeLeadRepository, createFakeSettingsRepository, createMovableClock } from "./testing/fakes";

const finalAt = "2026-11-23T09:00:00.000Z";
const karim: Lead = {
  id: "lead-k",
  name: "Karim Benali",
  company: null,
  trade: "Électricien",
  city: "Lyon",
  postalCode: null,
  email: "karim@exemple.fr",
  phone: null,
  stage: "email_envoye",
  createdAt: new Date("2026-11-13T09:00:00.000Z"),
};
const sent = (leadId: string, step: number, iso: string, emailFinal: boolean): LeadEvent => ({
  id: `envoi-${leadId}-${step}`,
  leadId,
  type: "email_envoye",
  occurredAt: new Date(iso),
  emailStep: step,
  emailFinal,
});
// Karim a reçu ses 3 e-mails, le dernier à finalAt.
const sequenceOf = (leadId: string): LeadEvent[] => [
  sent(leadId, 1, "2026-11-17T09:00:00.000Z", false),
  sent(leadId, 2, "2026-11-20T09:00:00.000Z", false),
  sent(leadId, 3, finalAt, true),
];

function setup({ stage = "email_envoye" as Stage, extra = [] as LeadEvent[], lostDelayDays = undefined as number | undefined } = {}) {
  const fake = createFakeLeadRepository([{ ...karim, stage }], [...sequenceOf("lead-k"), ...extra]);
  const time = createMovableClock(finalAt);
  const settings = createFakeSettingsRepository(lostDelayDays ? { lostDelayDays } : {});
  const service = createLifecycleService({ repository: fake.repository, settings: settings.repository, clock: time.clock, ids: createFakeIds("perdu") });
  return { ...fake, time, service };
}

describe("service · lifecycle.service · markLostLeads", () => {
  // Critère 1 : tous les e-mails, aucune action, on avance l'horloge de 7 jours → « Perdu ».
  it("fait passer dans « Perdu » un lead sans action 7 jours après le dernier e-mail, avec son historique", async () => {
    const { service, time, leads, events } = setup();

    time.advanceDays(6);
    expect(await service.markLostLeads()).toEqual({ ok: true, lost: [] });
    expect(leads[0].stage).toBe("email_envoye");

    time.advanceDays(1);
    expect(await service.markLostLeads()).toEqual({ ok: true, lost: ["lead-k"] });
    expect(leads[0].stage).toBe("perdu");
    expect(events.at(-1)).toEqual({ id: "perdu-1", leadId: "lead-k", type: "lead_perdu", occurredAt: new Date("2026-11-30T09:00:00.000Z") });
  });

  // Critère 2 : une action pendant le délai → pas « Perdu ».
  it("ne fait pas passer dans « Perdu » un lead qui a agi après le dernier e-mail", async () => {
    const { service, time, leads } = setup({
      stage: "ouvert",
      extra: [{ id: "a", leadId: "lead-k", type: "email_ouvert", occurredAt: new Date("2026-11-25T09:00:00.000Z") }],
    });

    time.advanceDays(30);
    expect(await service.markLostLeads()).toEqual({ ok: true, lost: [] });
    expect(leads[0].stage).toBe("ouvert");
  });

  // Critère 3 : délai réglé à 3 jours.
  it("suit le délai réglé : 3 jours", async () => {
    const { service, time, leads } = setup({ lostDelayDays: 3 });

    time.advanceDays(3);
    await service.markLostLeads();

    expect(leads[0].stage).toBe("perdu");
  });

  it("ne passe qu'une fois un lead dans « Perdu »", async () => {
    const { service, time, events } = setup();

    time.advanceDays(8);
    await service.markLostLeads();
    await service.markLostLeads();

    expect(events.filter((event) => event.type === "lead_perdu")).toHaveLength(1);
  });

  it("n'écrase pas une avancée faite entre-temps (l'étape a changé)", async () => {
    const { service, time, repository, leads, events } = setup();
    const findAll = repository.findAll;
    repository.findAll = async () => {
      const snapshot = (await findAll()).map((lead) => ({ ...lead }));
      leads[0].stage = "lien_clique"; // un webhook arrive pendant la vérification
      return snapshot;
    };

    time.advanceDays(8);
    expect(await service.markLostLeads()).toEqual({ ok: true, lost: [] });
    expect(leads[0].stage).toBe("lien_clique");
    expect(events.some((event) => event.type === "lead_perdu")).toBe(false);
  });

  it("renvoie un refus, sans planter, si la base est en panne", async () => {
    const { service, repository } = setup();
    repository.findAll = async () => {
      throw new Error("base injoignable");
    };

    expect(await service.markLostLeads()).toEqual({ ok: false, message: "Vérification des leads perdus impossible pour le moment." });
  });
});
