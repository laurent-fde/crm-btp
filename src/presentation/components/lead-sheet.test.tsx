import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadDetailResult } from "@/services/lead.service";
import { LeadSheet } from "./lead-sheet";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

afterEach(cleanup);

const detail: LeadDetailResult = {
  ok: true,
  lead: {
    id: "lead-1",
    name: "Karim Benali",
    company: "Benali Élec",
    trade: "Électricien",
    city: "Lyon",
    postalCode: "69003",
    email: "karim.benali@exemple.fr",
    phone: "06 12 34 56 78",
    stage: "nouveau",
    createdAt: new Date("2026-11-23T09:00:00.000Z"),
  },
  history: [
    { id: "e1", type: "lead_cree", label: "Lead créé", occurredAt: new Date("2026-11-23T09:00:00.000Z") },
    { id: "e2", type: "email_envoye", label: "E-mail 1 envoyé", occurredAt: new Date("2026-11-23T10:30:00.000Z") },
  ],
  sequence: { sent: 1, total: 3, next: 2, blockedReason: null },
};

const action = vi.fn(async () => ({ ok: true as const }));
const sendAction = vi.fn(async () => ({ ok: true as const }));
const simulateAction = vi.fn(async () => ({ ok: true as const }));

describe("présentation · LeadSheet (lot 2)", () => {
  // Critère 1 (lot 2) : la fiche montre les 7 champs et l'historique, qui commence par « Lead créé » avec la date.
  it("montre les 7 champs préremplis et l'historique, qui commence par « Lead créé » daté à l'heure de Paris", () => {
    render(<LeadSheet result={detail} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);

    expect(screen.getByRole("heading", { name: "Karim Benali" })).toBeDefined();
    const valeurs: Record<string, string> = {
      Nom: "Karim Benali",
      Entreprise: "Benali Élec",
      Métier: "Électricien",
      "Code postal": "69003",
      Ville: "Lyon",
      "E-mail": "karim.benali@exemple.fr",
      Téléphone: "06 12 34 56 78",
    };
    for (const [label, valeur] of Object.entries(valeurs)) {
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(valeur);
    }
    const historique = within(screen.getByRole("list", { name: "Historique" }));
    const lignes = historique.getAllByRole("listitem");
    expect(lignes[0].textContent).toContain("Lead créé");
    expect(lignes[0].textContent).toContain("23/11/2026 à 10:00");
  });

  // Critère 1 (lot 3) : l'historique montre « E-mail 1 envoyé » avec la date ; la fiche propose l'e-mail suivant.
  it("montre « E-mail 1 envoyé » daté dans l'historique et propose l'e-mail 2", () => {
    render(<LeadSheet result={detail} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);

    const lignes = within(screen.getByRole("list", { name: "Historique" })).getAllByRole("listitem");
    expect(lignes[1].textContent).toContain("E-mail 1 envoyé");
    expect(lignes[1].textContent).toContain("23/11/2026 à 11:30");
    expect(screen.getByRole("button", { name: "Envoyer l'e-mail 2" })).toBeDefined();
  });

  // Lot 4 : la simulation d'actions n'est proposée qu'après un e-mail envoyé, et pas pour un lead gagné.
  it("propose de simuler une action seulement après un e-mail envoyé, et pas pour un lead gagné", () => {
    const { unmount } = render(<LeadSheet result={detail} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);
    expect(screen.getByRole("button", { name: "E-mail ouvert" })).toBeDefined();
    unmount();

    const sansEmail = { ...detail, sequence: { ...detail.sequence, sent: 0, next: 1 } } as typeof detail;
    const { unmount: fermer } = render(<LeadSheet result={sansEmail} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);
    expect(screen.queryByRole("button", { name: "E-mail ouvert" })).toBeNull();
    fermer();

    const gagne = { ...detail, lead: { ...(detail.ok ? detail.lead : ({} as never)), stage: "gagne" as const } } as typeof detail;
    render(<LeadSheet result={gagne} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);
    expect(screen.queryByRole("button", { name: "E-mail ouvert" })).toBeNull();
  });

  it("affiche le message reçu quand la fiche ne peut pas être montrée (lead inconnu, base en panne)", () => {
    render(<LeadSheet result={{ ok: false, message: "Ce lead n'existe pas ou plus." }} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);

    expect(screen.getByText("Ce lead n'existe pas ou plus.")).toBeDefined();
    expect(screen.queryByLabelText("Nom")).toBeNull();
  });

  // Revue PR #9 : fermer remplace l'adresse (Retour ne rouvre pas la fiche) et le panneau se ferme sans attendre le serveur.
  it("se ferme tout de suite et remplace l'adresse par le tableau", async () => {
    replace.mockReset();
    render(<LeadSheet result={detail} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  // #17, option B : un événement daté après la date de l'app porte la mention « Daté dans le futur ».
  it("signale les événements datés dans le futur dans l'historique", () => {
    const futur: LeadDetailResult = detail.ok
      ? { ...detail, history: [detail.history[0], { ...detail.history[1], future: true }] }
      : detail;
    render(<LeadSheet result={futur} action={action} sendAction={sendAction} simulateAction={simulateAction} trades={[]} />);

    const lignes = within(screen.getByRole("list", { name: "Historique" })).getAllByRole("listitem");
    expect(within(lignes[0]).queryByText("Daté dans le futur")).toBeNull();
    expect(within(lignes[1]).getByText("Daté dans le futur")).toBeTruthy();
  });
});
