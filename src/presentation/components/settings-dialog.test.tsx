import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsState } from "@/presentation/actions/settings.action";
import { SettingsDialog } from "./settings-dialog";

afterEach(cleanup);

type SettingsAction = (previous: SettingsState, formData: FormData) => Promise<SettingsState>;

function openDialog(response: SettingsState) {
  const action = vi.fn<SettingsAction>(async () => response);
  render(<SettingsDialog action={action} settings={{ sequenceLength: 3 }} />);
  fireEvent.click(screen.getByRole("button", { name: "Réglages" }));
  return action;
}

describe("présentation · SettingsDialog", () => {
  it("montre la longueur actuelle et envoie la nouvelle", async () => {
    const action = openDialog({ ok: true });

    const champ = (await screen.findByLabelText("Nombre d'e-mails de la séquence")) as HTMLInputElement;
    expect(champ.value).toBe("3");
    fireEvent.change(champ, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0][1].get("sequenceLength")).toBe("5");
  });

  it("affiche l'erreur reliée au champ et garde la saisie", async () => {
    openDialog({ ok: false, errors: { sequenceLength: "Entre 1 et 10 e-mails" }, values: { sequenceLength: "12" } });

    fireEvent.click(await screen.findByRole("button", { name: "Enregistrer" }));

    const message = await screen.findByText("Entre 1 et 10 e-mails");
    const champ = screen.getByLabelText("Nombre d'e-mails de la séquence") as HTMLInputElement;
    expect(champ.getAttribute("aria-describedby")).toBe(message.id);
    expect(champ.value).toBe("12");
  });
});
