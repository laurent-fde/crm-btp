import { beforeEach, describe, expect, it, vi } from "vitest";

const addLead = vi.fn();
const refresh = vi.fn();
vi.mock("@/composition", () => ({ getLeadService: () => ({ addLead }) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

import { addLeadAction } from "./lead.action";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

describe("présentation · lead.action · addLeadAction", () => {
  beforeEach(() => {
    addLead.mockReset();
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
