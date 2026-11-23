import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SequenceState } from "@/presentation/actions/lead.action";
import { ActionPanel } from "./action-panel";

afterEach(cleanup);

type SimulateAction = (previous: SequenceState, formData: FormData) => Promise<SequenceState>;

function renderPanel(response: SequenceState = { ok: true }) {
  const action = vi.fn<SimulateAction>(async () => response);
  render(<ActionPanel leadId="lead-1" action={action} />);
  return action;
}

describe("présentation · ActionPanel (lot 4)", () => {
  // Critère 1 (lot 4) : depuis la fiche, je simule « e-mail ouvert ».
  it("propose les 4 actions et envoie le lead et l'action choisie", async () => {
    const action = renderPanel();

    for (const name of ["E-mail ouvert", "Lien cliqué", "Page visitée", "RDV pris"]) {
      expect(screen.getByRole("button", { name })).toBeDefined();
    }
    fireEvent.click(screen.getByRole("button", { name: "E-mail ouvert" }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    const data = action.mock.calls[0][1];
    expect([data.get("leadId"), data.get("type")]).toEqual(["lead-1", "email_ouvert"]);
  });

  it("annonce le message d'une simulation refusée", async () => {
    renderPanel({ ok: false, message: "Lead inconnu." });

    fireEvent.click(screen.getByRole("button", { name: "RDV pris" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Lead inconnu.");
  });
});
