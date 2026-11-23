import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { BoardStats as Stats } from "@/services/domain/board-stats";
import { BoardStats } from "./board-stats";

afterEach(cleanup);

const stats: Stats = {
  total: 13,
  byStage: [
    { stage: "nouveau", label: "Nouveau", count: 2 },
    { stage: "email_envoye", label: "E-mail envoyé", count: 5 },
    { stage: "ouvert", label: "Ouvert", count: 2 },
    { stage: "lien_clique", label: "Lien cliqué", count: 1 },
    { stage: "page_visitee", label: "Page visitée", count: 1 },
    { stage: "gagne", label: "Gagné", count: 1 },
    { stage: "perdu", label: "Perdu", count: 1 },
  ],
  sequence: [
    { step: 1, count: 2 },
    { step: 2, count: 1 },
    { step: 3, count: 2 },
  ],
  wonRate: 8,
};

describe("présentation · BoardStats", () => {
  it("affiche le total, chaque étape avec son nombre, la séquence e-mail par e-mail et le taux de gain", () => {
    render(<BoardStats stats={stats} />);

    const region = within(screen.getByRole("region", { name: "Statistiques" }));
    expect(region.getByText("13 leads")).toBeDefined();
    // Texte réel (lu par les lecteurs d'écran), pas un aria-label sur un contenu masqué.
    const items = region.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toContain("E-mail envoyé : 5");
    expect(items).toContain("Perdu : 1");
    expect(within(region.getByRole("list", { name: "Séquence en cours" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "E-mail 1 : 2",
      "E-mail 2 : 1",
      "E-mail 3 : 2",
    ]);
    expect(region.getByText("8 %")).toBeDefined();
  });

  it("affiche un tiret tant qu'aucun lead n'est terminé", () => {
    render(<BoardStats stats={{ ...stats, wonRate: null }} />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("écrit « 1 lead » au singulier", () => {
    render(<BoardStats stats={{ ...stats, total: 1 }} />);
    expect(screen.getByText("1 lead")).toBeDefined();
  });
});
