import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SequenceState } from "@/presentation/actions/lead.action";
import { SequencePanel } from "./sequence-panel";

afterEach(cleanup);

type SendAction = (previous: SequenceState, formData: FormData) => Promise<SequenceState>;

function renderPanel(sequence: { sent: number; total: number; next: number | null; blockedReason: string | null }, response: SequenceState = { ok: true }) {
  const action = vi.fn<SendAction>(async () => response);
  render(<SequencePanel leadId="lead-1" sequence={sequence} action={action} />);
  return action;
}

describe("présentation · SequencePanel (lot 3)", () => {
  // Critère 1 (lot 3) : depuis la fiche, j'envoie l'e-mail suivant.
  it("propose d'envoyer l'e-mail suivant et envoie l'identifiant du lead", async () => {
    const action = renderPanel({ sent: 1, total: 3, next: 2, blockedReason: null });

    expect(screen.getByText("E-mails envoyés : 1 sur 3")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'e-mail 2" }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0][1].get("leadId")).toBe("lead-1");
  });

  // Critère 3 (lot 3) : après les 3 e-mails, « Séquence terminée » et plus de bouton.
  it("affiche « Séquence terminée » sans bouton quand les 3 e-mails sont partis", () => {
    renderPanel({ sent: 3, total: 3, next: null, blockedReason: null });

    expect(screen.getByText("Séquence terminée")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reste lisible quand la séquence a été raccourcie après des envois", () => {
    renderPanel({ sent: 3, total: 2, next: null, blockedReason: null });

    expect(screen.getByText("E-mails envoyés : 3 (séquence réglée à 2)")).toBeDefined();
    expect(screen.getByText("Séquence terminée")).toBeDefined();
  });

  // Critère 5 (lot 3) : séquence réglée à 5, 3 envoyés : l'e-mail 4 est proposé.
  it("propose l'e-mail 4 quand la séquence est réglée à 5 et que 3 sont partis", () => {
    renderPanel({ sent: 3, total: 5, next: 4, blockedReason: null });

    expect(screen.getByText("E-mails envoyés : 3 sur 5")).toBeDefined();
    expect(screen.getByRole("button", { name: "Envoyer l'e-mail 4" })).toBeDefined();
  });

  // Revue PR #10 : lead terminé avant un allongement : la fiche ne prétend pas « 3 sur 5 ».
  it("reste lisible quand la séquence a été allongée après le dernier e-mail", () => {
    renderPanel({ sent: 3, total: 5, next: null, blockedReason: null });

    expect(screen.getByText("E-mails envoyés : 3 (séquence réglée à 5)")).toBeDefined();
    expect(screen.getByText("Séquence terminée")).toBeDefined();
  });

  // Revue PR #10 : l'état de la séquence est annoncé aux lecteurs d'écran (le bouton disparaît après le dernier envoi).
  it("annonce l'état de la séquence dans une zone lue par les lecteurs d'écran", () => {
    renderPanel({ sent: 3, total: 3, next: null, blockedReason: null });

    expect(screen.getByRole("status").textContent).toContain("Séquence terminée");
  });

  it("explique pourquoi la séquence est arrêtée (lead gagné)", () => {
    renderPanel({ sent: 1, total: 3, next: null, blockedReason: "Séquence arrêtée : lead gagné." });

    expect(screen.getByText("Séquence arrêtée : lead gagné.")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("annonce le message d'un envoi refusé", async () => {
    renderPanel(
      { sent: 0, total: 3, next: 1, blockedReason: null },
      { ok: false, message: "Envoi impossible pour le moment. Réessaie dans un instant." },
    );

    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'e-mail 1" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Envoi impossible pour le moment. Réessaie dans un instant.");
  });
});
