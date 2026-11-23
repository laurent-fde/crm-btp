import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AddLeadState } from "@/presentation/actions/lead.action";
import { LeadForm } from "./lead-form";

afterEach(cleanup);

function renderWithResponse(response: AddLeadState, onSuccess = vi.fn()) {
  const action = vi.fn(async () => response);
  render(<LeadForm action={action} trades={["Maçon", "Plombier"]} onSuccess={onSuccess} />);
  return { action, onSuccess };
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Ajouter le lead" }));

describe("présentation · LeadForm", () => {
  it("propose les 7 champs, chacun avec son libellé, et des métiers suggérés", () => {
    renderWithResponse(null);

    for (const label of ["Nom", "Entreprise", "Métier", "Code postal", "Ville", "E-mail", "Téléphone"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    const metier = screen.getByLabelText("Métier");
    const suggestions = document.getElementById(metier.getAttribute("list") ?? "");
    expect(suggestions?.querySelector('option[value="Maçon"]')).not.toBeNull();
  });

  // Critère 2 : sans nom, « Le nom est obligatoire » s'affiche, relié au champ.
  it("affiche « Le nom est obligatoire » relié au champ Nom", async () => {
    renderWithResponse({ ok: false, errors: { name: "Le nom est obligatoire" }, values: { name: "" } });

    submit();

    const message = await screen.findByText("Le nom est obligatoire");
    const champ = screen.getByLabelText("Nom");
    expect(champ.getAttribute("aria-invalid")).toBe("true");
    expect(champ.getAttribute("aria-describedby")).toBe(message.id);
  });

  // Critère 3 : e-mail invalide, message relié au champ E-mail, saisie conservée.
  it("affiche l'erreur d'e-mail reliée au champ E-mail, et garde la saisie", async () => {
    renderWithResponse({
      ok: false,
      errors: { email: "L'adresse e-mail n'est pas valide" },
      values: { name: "Karim", email: "karim@" },
    });

    submit();

    const message = await screen.findByText("L'adresse e-mail n'est pas valide");
    const champ = screen.getByLabelText("E-mail") as HTMLInputElement;
    expect(champ.getAttribute("aria-invalid")).toBe("true");
    expect(champ.getAttribute("aria-describedby")).toBe(message.id);
    expect(champ.value).toBe("karim@");
    expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Karim");
    expect(screen.getByLabelText("Nom").getAttribute("aria-invalid")).toBeNull();
  });

  it("affiche l'erreur de téléphone reliée au champ Téléphone", async () => {
    renderWithResponse({ ok: false, errors: { phone: "Le téléphone n'est pas valide (ex. 06 12 34 56 78)" } });

    submit();

    const message = await screen.findByText("Le téléphone n'est pas valide (ex. 06 12 34 56 78)");
    expect(screen.getByLabelText("Téléphone").getAttribute("aria-describedby")).toBe(message.id);
  });

  it("affiche l'erreur de code postal reliée au champ Code postal", async () => {
    renderWithResponse({ ok: false, errors: { postalCode: "5 chiffres attendus (ex. 69003)" } });

    submit();

    const message = await screen.findByText("5 chiffres attendus (ex. 69003)");
    expect(screen.getByLabelText("Code postal").getAttribute("aria-describedby")).toBe(message.id);
  });

  // Revue PR #8 : après un refus, le curseur va dans le premier champ en erreur (lecteurs d'écran).
  it("place le curseur dans le premier champ en erreur", async () => {
    renderWithResponse({
      ok: false,
      errors: { email: "L'adresse e-mail n'est pas valide", phone: "Le téléphone n'est pas valide (ex. 06 12 34 56 78)" },
    });

    submit();

    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("E-mail")));
  });

  // Revue PR #8 : panne de la base, un message général annoncé, la saisie gardée.
  it("annonce un message général et garde la saisie", async () => {
    renderWithResponse({
      ok: false,
      errors: {},
      formError: "Enregistrement impossible pour le moment. Réessaie dans un instant.",
      values: { name: "Karim" },
    });

    submit();

    const alerte = await screen.findByRole("alert");
    expect(alerte.textContent).toBe("Enregistrement impossible pour le moment. Réessaie dans un instant.");
    expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Karim");
  });

  // Revue PR #8 : le code postal n'est pas coupé à la saisie (« 69 003 » collé reste entier).
  it("ne limite pas la longueur du code postal : c'est le service qui décide", () => {
    renderWithResponse(null);

    expect(screen.getByLabelText("Code postal").getAttribute("maxlength")).toBeNull();
  });

  it("prévient quand l'ajout a réussi", async () => {
    const { onSuccess } = renderWithResponse({ ok: true });

    submit();

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("désactive le bouton pendant l'envoi", async () => {
    let terminer!: (state: AddLeadState) => void;
    const action = vi.fn(() => new Promise<AddLeadState>((resolve) => (terminer = resolve)));
    render(<LeadForm action={action} trades={[]} />);

    submit();

    const enCours = await screen.findByRole("button", { name: "Ajout en cours…" });
    expect((enCours as HTMLButtonElement).disabled).toBe(true);
    await act(async () => terminer({ ok: true }));
  });
});
