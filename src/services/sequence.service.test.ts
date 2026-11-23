import { describe, expect, it } from "vitest";
import type { Lead, LeadEvent } from "./ports";
import { createSequenceService } from "./sequence.service";
import {
  createFakeClock,
  createFakeEmailSender,
  createFakeIds,
  createFakeLeadRepository,
  createFakeSettingsRepository,
} from "./testing/fakes";

const karim: Lead = {
  id: "lead-k",
  name: "Karim Benali",
  company: "Benali Élec",
  trade: "Électricien",
  city: "Lyon",
  postalCode: "69003",
  email: "karim.benali@exemple.fr",
  phone: null,
  stage: "nouveau",
  createdAt: new Date("2026-11-20T08:00:00.000Z"),
};
const sent = (step: number): LeadEvent => ({
  id: `s${step}`,
  leadId: "lead-k",
  type: "email_envoye",
  emailStep: step,
  occurredAt: new Date(`2026-11-2${step}T08:00:00.000Z`),
});

function setup(lead: Lead = karim, events: LeadEvent[] = [], sequenceLength?: number) {
  const fake = createFakeLeadRepository([{ ...lead }], events);
  const settings = createFakeSettingsRepository(sequenceLength ? { sequenceLength } : {});
  const email = createFakeEmailSender();
  const service = createSequenceService({
    repository: fake.repository,
    emailSender: email.sender,
    settings: settings.repository,
    clock: createFakeClock("2026-11-23T09:00:00.000Z"),
    ids: createFakeIds("event"),
  });
  return { ...fake, ...email, service };
}

describe("service · sequence.service · sendNextEmail", () => {
  // Critère 1 (lot 3) : lead « Nouveau » + e-mail 1 → « E-mail envoyé », « E-mail 1 envoyé » daté dans l'historique.
  it("envoie l'e-mail 1 à un lead « Nouveau », le passe dans « E-mail envoyé » et l'inscrit dans l'historique", async () => {
    const { service, leads, events } = setup();

    const result = await service.sendNextEmail("lead-k");

    expect(result).toEqual({ ok: true, step: 1 });
    expect(leads[0].stage).toBe("email_envoye");
    expect(events).toEqual([
      {
        id: "event-1",
        leadId: "lead-k",
        type: "email_envoye",
        emailStep: 1,
        emailFinal: false,
        occurredAt: new Date("2026-11-23T09:00:00.000Z"),
      },
    ]);
  });

  // Critère 4 (lot 3) : l'envoi passe par le fournisseur d'e-mails.
  it("passe par le fournisseur d'e-mails, avec le destinataire et le modèle de l'étape", async () => {
    const { service, sent: envois } = setup();

    await service.sendNextEmail("lead-k");

    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({ leadId: "lead-k", step: 1, to: "karim.benali@exemple.fr" });
    expect(envois[0].subject).toBeTruthy();
    expect(envois[0].body).toContain("Bonjour Karim");
  });

  // Critère 2 (lot 3) : après les e-mails 1 et 2, l'envoi suivant est l'e-mail 3.
  it("envoie l'e-mail 3 à un lead qui a reçu les e-mails 1 et 2", async () => {
    const { service, sent: envois, events } = setup({ ...karim, stage: "email_envoye" }, [sent(1), sent(2)]);

    const result = await service.sendNextEmail("lead-k");

    expect(result).toEqual({ ok: true, step: 3 });
    expect(envois[0].step).toBe(3);
    expect(events.at(-1)?.emailStep).toBe(3);
  });

  // Critère 3 (lot 3) : après les 3 e-mails, plus d'envoi.
  it("refuse un 4ᵉ envoi, sans rien envoyer", async () => {
    const { service, sent: envois } = setup({ ...karim, stage: "email_envoye" }, [sent(1), sent(2), sent(3)]);

    expect(await service.sendNextEmail("lead-k")).toEqual({
      ok: false,
      message: "Séquence terminée (3 e-mails envoyés).",
    });
    expect(envois).toEqual([]);
  });

  // Séquence réglable : la longueur enregistrée dans les réglages décide.
  it("continue jusqu'à l'e-mail 5 quand la séquence est réglée à 5", async () => {
    const { service, sent: envois } = setup({ ...karim, stage: "email_envoye" }, [sent(1), sent(2), sent(3)], 5);

    expect(await service.sendNextEmail("lead-k")).toEqual({ ok: true, step: 4 });
    expect(envois[0].subject).not.toBe("Je ne vous relancerai plus");
    expect(await service.sendNextEmail("lead-k")).toEqual({ ok: true, step: 5 });
    expect(envois[1].subject).toBe("Je ne vous relancerai plus");
  });

  it("termine la séquence plus tôt quand elle est réglée à 2", async () => {
    const { service } = setup({ ...karim, stage: "email_envoye" }, [sent(1), sent(2)], 2);

    expect(await service.sendNextEmail("lead-k")).toEqual({
      ok: false,
      message: "Séquence terminée (2 e-mails envoyés).",
    });
  });

  // Revue PR #10 : le message dit combien d'e-mails sont vraiment partis.
  it("compte les e-mails réellement envoyés quand la séquence a été raccourcie", async () => {
    const { service } = setup({ ...karim, stage: "email_envoye" }, [sent(1), sent(2), sent(3)], 2);

    expect(await service.sendNextEmail("lead-k")).toEqual({ ok: false, message: "Séquence terminée (3 e-mails envoyés)." });
  });

  // Revue PR #10 : le dernier e-mail est marqué dans l'historique, le lead reste terminé si on allonge ensuite.
  it("marque le dernier e-mail de la séquence et ne relance plus après, même si la séquence est allongée", async () => {
    const fake = createFakeLeadRepository([{ ...karim, stage: "email_envoye" }], [sent(1), sent(2)]);
    const settings = createFakeSettingsRepository({ sequenceLength: 3 });
    const service = createSequenceService({
      repository: fake.repository,
      emailSender: createFakeEmailSender().sender,
      settings: settings.repository,
      clock: createFakeClock(),
      ids: createFakeIds("event"),
    });

    await service.sendNextEmail("lead-k");
    expect(fake.events.at(-1)).toMatchObject({ emailStep: 3, emailFinal: true });

    settings.values.sequenceLength = 5;
    expect(await service.sendNextEmail("lead-k")).toEqual({ ok: false, message: "Séquence terminée (3 e-mails envoyés)." });
  });

  it("ne fait pas reculer un lead déjà « Ouvert » qui reçoit l'e-mail 2", async () => {
    const { service, leads } = setup({ ...karim, stage: "ouvert" }, [sent(1)]);

    await service.sendNextEmail("lead-k");

    expect(leads[0].stage).toBe("ouvert");
  });

  it("refuse d'envoyer à un lead gagné", async () => {
    const { service, sent: envois } = setup({ ...karim, stage: "gagne" }, [sent(1)]);

    expect(await service.sendNextEmail("lead-k")).toEqual({ ok: false, message: "Séquence arrêtée : lead gagné." });
    expect(envois).toEqual([]);
  });

  it("prévient si le lead n'existe pas ou plus", async () => {
    const { service } = setup();

    expect(await service.sendNextEmail("inconnu")).toEqual({ ok: false, message: "Ce lead n'existe pas ou plus." });
    expect(await service.sendNextEmail("  ")).toEqual({ ok: false, message: "Ce lead n'existe pas ou plus." });
    // Contrôle de sécurité : un identifiant démesuré n'atteint pas la base.
    expect(await service.sendNextEmail("x".repeat(201))).toEqual({ ok: false, message: "Ce lead n'existe pas ou plus." });
  });

  // Revue #12 : la limite est de 200 caractères, inclus.
  it("accepte un identifiant de lead de 200 caractères", async () => {
    const { service } = setup({ ...karim, id: "x".repeat(200) });

    expect((await service.sendNextEmail("x".repeat(200))).ok).toBe(true);
  });

  it("n'enregistre rien si le fournisseur est en panne", async () => {
    const { service, sender, events, leads } = setup();
    sender.send = async () => {
      throw new Error("fournisseur injoignable");
    };

    expect(await service.sendNextEmail("lead-k")).toEqual({
      ok: false,
      message: "Envoi impossible pour le moment. Réessaie dans un instant.",
    });
    expect(events).toEqual([]);
    expect(leads[0].stage).toBe("nouveau");
  });

  it("renvoie un message si l'envoi ne peut pas être enregistré", async () => {
    const { service, repository } = setup();
    repository.recordEvent = async () => {
      throw new Error("base injoignable");
    };

    expect(await service.sendNextEmail("lead-k")).toEqual({
      ok: false,
      message: "L'e-mail est parti mais n'a pas pu être enregistré. Recharge la fiche.",
    });
  });
});
