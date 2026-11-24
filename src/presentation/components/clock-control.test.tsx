import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClockState } from "@/presentation/actions/clock.action";
import { ClockControl } from "./clock-control";

afterEach(cleanup);

type ClockAction = (previous: ClockState, formData: FormData) => Promise<ClockState>;

function renderControl(offsetDays: number, respond: (formData: FormData) => ClockState = () => ({ ok: true })) {
  const action = vi.fn<ClockAction>(async (_previous, formData) => respond(formData));
  const now = offsetDays === 0 ? "2026-11-23T09:00:00.000Z" : "2026-11-30T09:00:00.000Z";
  render(<ClockControl status={{ now, offsetDays }} action={action} />);
  return action;
}

describe("présentation · ClockControl", () => {
  it("montre la date de l'app et que c'est aujourd'hui, sans retour possible", () => {
    renderControl(0);

    expect(screen.getByText("23/11/2026 à 10:00")).toBeTruthy();
    expect(screen.getByText("aujourd'hui")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Revenir à aujourd'hui" }) as HTMLButtonElement).disabled).toBe(true);
  });

  // Revue #14 : la nouvelle date est annoncée aux lecteurs d'écran.
  it("montre la date simulée et son avance, dans une zone annoncée", () => {
    renderControl(7);

    expect(screen.getByText("30/11/2026 à 10:00")).toBeTruthy();
    expect(screen.getByText("+7 j")).toBeTruthy();
    expect(screen.getByText("30/11/2026 à 10:00").closest("[aria-live=polite]")).toBeTruthy();
  });

  it.each([
    ["+1 jour", "1"],
    ["+7 jours", "7"],
    ["Revenir à aujourd'hui", "reset"],
  ])("« %s » envoie « %s »", async (bouton, intent) => {
    const action = renderControl(7);

    fireEvent.click(screen.getByRole("button", { name: bouton }));

    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0][1].get("intent")).toBe(intent);
  });

  // Revue #14 : un refus disparaît quand l'envoi suivant réussit.
  it("annonce un refus, puis l'efface quand l'envoi suivant réussit", async () => {
    let refuse = true;
    renderControl(7, () => (refuse ? { ok: false, message: "Enregistrement impossible pour le moment." } : { ok: true }));

    fireEvent.click(screen.getByRole("button", { name: "Revenir à aujourd'hui" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Enregistrement impossible pour le moment.");

    refuse = false;
    fireEvent.click(screen.getByRole("button", { name: "+1 jour" }));
    await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  // #17, option B : le retour à aujourd'hui reste possible, et l'en-tête prévient des événements datés dans le futur.
  it("prévient quand des événements sont datés après la date de l'app", () => {
    render(<ClockControl status={{ now: "2026-11-23T09:00:00.000Z", offsetDays: 0, futureEvents: 3 }} action={vi.fn()} />);

    expect(screen.getByRole("status").textContent).toBe("3 événements datés après la date de l'app");
  });

  it("accorde l'avertissement au singulier, et ne montre rien sans événement futur", () => {
    render(<ClockControl status={{ now: "2026-11-23T09:00:00.000Z", offsetDays: 0, futureEvents: 1 }} action={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toBe("1 événement daté après la date de l'app");
    cleanup();

    render(<ClockControl status={{ now: "2026-11-23T09:00:00.000Z", offsetDays: 0, futureEvents: 0 }} action={vi.fn()} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
