import { beforeEach, describe, expect, it, vi } from "vitest";

const addLead = vi.fn();
const updateLead = vi.fn();
const sendNextEmail = vi.fn();
const refresh = vi.fn();
vi.mock("@/composition", () => ({
  getLeadService: () => ({ addLead, updateLead }),
  getSequenceService: () => ({ sendNextEmail }),
}));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

import { addLeadAction, sendNextEmailAction, updateLeadAction } from "./lead.action";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

describe("présentation · lead.action · addLeadAction", () => {
  beforeEach(() => {
    addLead.mockReset();
    updateLead.mockReset();
    refresh.mockReset();
  });

  // Critère 1 : l'ajout passe par le service, puis le tableau est redessiné.
  it("transmet la saisie au service puis redessine le tableau", async () => {
    addLead.mockResolvedValue({ ok: true, lead: { id: "lead-1" } });

    const state = await addLeadAction(null, form({ name: "Karim", email: "karim@exemple.fr", city: "Lyon" }));

    expect(addLead).toHaveBeenCalledWith({
      name: "Karim",
      company: "",
      trade: "",
      city: "Lyon",
      postalCode: "",
      email: "karim@exemple.fr",
      phone: "",
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ ok: true });
  });

  it("transmet le message général du service (panne de la base), avec la saisie", async () => {
    addLead.mockResolvedValue({ ok: false, errors: {}, formError: "Enregistrement impossible pour le moment." });

    const state = await addLeadAction(null, form({ name: "Karim", email: "karim@exemple.fr" }));

    expect(state).toMatchObject({
      ok: false,
      errors: {},
      formError: "Enregistrement impossible pour le moment.",
      values: { name: "Karim", email: "karim@exemple.fr" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  // Critères 2 et 3 : un refus renvoie les erreurs et la saisie, sans redessiner.
  it("renvoie les erreurs du service et la saisie, sans redessiner", async () => {
    addLead.mockResolvedValue({ ok: false, errors: { name: "Le nom est obligatoire" } });

    const state = await addLeadAction(null, form({ name: "", email: "karim@exemple.fr" }));

    expect(state).toEqual({
      ok: false,
      errors: { name: "Le nom est obligatoire" },
      values: { name: "", company: "", trade: "", city: "", postalCode: "", email: "karim@exemple.fr", phone: "" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("présentation · lead.action · updateLeadAction (lot 2)", () => {
  beforeEach(() => {
    updateLead.mockReset();
    refresh.mockReset();
  });

  // Critère 2 (lot 2) : la modification passe par le service, puis la carte et la fiche sont redessinées.
  it("transmet l'identifiant et la saisie au service, puis redessine", async () => {
    updateLead.mockResolvedValue({ ok: true, lead: { id: "lead-1" } });

    const state = await updateLeadAction(
      null,
      form({ leadId: "lead-1", name: "Karim", email: "karim@exemple.fr", city: "Villeurbanne" }),
    );

    expect(updateLead).toHaveBeenCalledWith("lead-1", {
      name: "Karim",
      company: "",
      trade: "",
      city: "Villeurbanne",
      postalCode: "",
      email: "karim@exemple.fr",
      phone: "",
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ ok: true });
  });

  // Critère 3 (lot 2) : un refus renvoie l'erreur et la saisie, sans redessiner.
  it("renvoie les erreurs et la saisie, sans redessiner", async () => {
    updateLead.mockResolvedValue({ ok: false, errors: { name: "Le nom est obligatoire" } });

    const state = await updateLeadAction(null, form({ leadId: "lead-1", name: "", email: "karim@exemple.fr" }));

    expect(state).toMatchObject({ ok: false, errors: { name: "Le nom est obligatoire" }, values: { name: "" } });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("présentation · lead.action · sendNextEmailAction (lot 3)", () => {
  beforeEach(() => {
    sendNextEmail.mockReset();
    refresh.mockReset();
  });

  // Critère 1 (lot 3) : l'envoi passe par le service, puis la carte change de colonne.
  it("envoie l'e-mail suivant par le service, puis redessine", async () => {
    sendNextEmail.mockResolvedValue({ ok: true, step: 1 });

    const state = await sendNextEmailAction(null, form({ leadId: "lead-1" }));

    expect(sendNextEmail).toHaveBeenCalledWith("lead-1");
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ ok: true });
  });

  it("renvoie le message du service sans redessiner", async () => {
    sendNextEmail.mockResolvedValue({ ok: false, message: "Séquence terminée : les 3 e-mails sont partis." });

    const state = await sendNextEmailAction(null, form({ leadId: "lead-1" }));

    expect(state).toEqual({ ok: false, message: "Séquence terminée : les 3 e-mails sont partis." });
    expect(refresh).not.toHaveBeenCalled();
  });
});
