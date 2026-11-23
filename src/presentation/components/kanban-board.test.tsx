import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { groupByStage, type Lead } from "@/services/domain/lead";
import { KanbanBoard } from "./kanban-board";

afterEach(cleanup);

const karim: Lead = {
  id: "lead-1",
  name: "Karim Benali",
  company: "Benali Élec",
  trade: "Électricien",
  city: "Lyon",
  postalCode: "69003",
  email: "karim@exemple.fr",
  phone: null,
  stage: "nouveau",
  createdAt: new Date("2026-11-23T09:00:00.000Z"),
};

describe("présentation · KanbanBoard", () => {
  it("affiche les 7 colonnes d'étape, avec leur nombre de leads", () => {
    render(<KanbanBoard columns={groupByStage([karim])} />);

    for (const label of ["Nouveau", "E-mail envoyé", "Ouvert", "Lien cliqué", "Page visitée", "Gagné", "Perdu"]) {
      expect(screen.getByRole("region", { name: new RegExp(`^${label}`) })).toBeDefined();
    }
    expect(within(screen.getByRole("region", { name: /^Nouveau/ })).getByText("1")).toBeDefined();
  });

  // Critère 1 : le lead ajouté apparaît dans la colonne « Nouveau ».
  it("montre le lead dans la colonne Nouveau, avec entreprise, métier, code postal et ville", () => {
    render(<KanbanBoard columns={groupByStage([karim])} />);

    const nouveau = within(screen.getByRole("region", { name: /^Nouveau/ }));
    expect(nouveau.getByText("Karim Benali")).toBeDefined();
    expect(nouveau.getByText("Benali Élec · Électricien · 69003 Lyon")).toBeDefined();
    expect(within(screen.getByRole("region", { name: /^Ouvert/ })).queryByText("Karim Benali")).toBeNull();
  });

  it("n'affiche que les infos remplies sur la carte", () => {
    render(<KanbanBoard columns={groupByStage([{ ...karim, company: null, trade: "Plombier", city: null, postalCode: null }])} />);

    expect(screen.getByText("Plombier")).toBeDefined();
  });

  it("indique une colonne vide", () => {
    render(<KanbanBoard columns={groupByStage([])} />);

    expect(within(screen.getByRole("region", { name: /^Nouveau/ })).getByText("Aucun lead")).toBeDefined();
  });
});
