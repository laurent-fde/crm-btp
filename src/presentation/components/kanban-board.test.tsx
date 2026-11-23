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

  // Critère 2 (lot 2) : après modification, la carte montre la nouvelle ville.
  it("montre sur la carte la ville enregistrée", () => {
    render(<KanbanBoard columns={groupByStage([{ ...karim, city: "Villeurbanne", postalCode: "69100" }])} />);

    expect(screen.getByRole("link", { name: /Karim Benali/ }).textContent).toContain("69100 Villeurbanne");
  });

  // Critère 4 (lot 4) : badge « Chaud » sur la carte d'un lead qui a agi récemment, sinon rien.
  it("porte le badge « Chaud » seulement sur un lead chaud", () => {
    render(
      <KanbanBoard
        columns={groupByStage([
          { ...karim, hot: true },
          { ...karim, id: "lead-2", name: "Jeanne Morel", hot: false },
        ])}
      />,
    );

    expect(screen.getByRole("link", { name: /Karim Benali/ }).textContent).toContain("Chaud");
    expect(screen.getByRole("link", { name: /Jeanne Morel/ }).textContent).not.toContain("Chaud");
  });

  // Lot 2 : la carte ouvre la fiche du lead.
  it("fait de chaque carte un lien vers la fiche du lead", () => {
    render(<KanbanBoard columns={groupByStage([karim])} />);

    const lien = screen.getByRole("link", { name: /Karim Benali/ });
    expect(lien.getAttribute("href")).toBe("/?lead=lead-1");
  });

  it("n'affiche que les infos remplies sur la carte", () => {
    render(<KanbanBoard columns={groupByStage([{ ...karim, company: null, trade: "Plombier", city: null, postalCode: null }])} />);

    expect(screen.getByText("Plombier")).toBeDefined();
  });

  it("indique une colonne vide", () => {
    render(<KanbanBoard columns={groupByStage([])} />);

    expect(within(screen.getByRole("region", { name: /^Nouveau/ })).getByText("Aucun lead")).toBeDefined();
  });

  // Stats : la colonne « E-mail envoyé » détaille où en sont ses leads, et chaque carte dit son e-mail.
  it("détaille la colonne E-mail envoyé par e-mail, et la carte porte « E-mail N/longueur »", () => {
    const lea = { ...karim, id: "lead-2", name: "Léa Fontaine", stage: "email_envoye" as const, emailStep: 2 };
    render(
      <KanbanBoard
        columns={groupByStage([lea, { ...karim, emailStep: 0 }])}
        sequence={[
          { step: 1, count: 0 },
          { step: 2, count: 1 },
          { step: 3, count: 0 },
        ]}
        sequenceLength={3}
      />,
    );

    const envoye = within(screen.getByRole("region", { name: /^E-mail envoyé/ }));
    // La colonne ne montre que les e-mails qui ont des leads.
    expect(envoye.getAllByRole("listitem").map((li) => li.textContent).filter((t) => t?.startsWith("E-mail"))).toEqual(["E-mail 2 : 1"]);
    expect(envoye.getByRole("link", { name: /Léa Fontaine/ }).textContent).toContain("E-mail 2/3");
    expect(screen.getByRole("link", { name: /Karim Benali/ }).textContent).not.toContain("E-mail");
  });
});

