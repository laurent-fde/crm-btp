"use server";

// Présentation · action de l'horloge de l'app (simulation du passage du temps).
// Passe par les services (via la composition), jamais par la base.

import { refresh } from "next/cache";
import { getClockService, getLifecycleService } from "@/composition";

export type ClockState = { ok: true } | { ok: false; message: string } | null;

// Une seule action pour les trois boutons : intent = nombre de jours à avancer, ou « reset » (retour à aujourd'hui).
// Après chaque changement de date : les leads restés sans action passent dans « Perdu », puis la page est redessinée.
export async function changeClockAction(_previous: ClockState, formData: FormData): Promise<ClockState> {
  const intent = String(formData.get("intent") ?? "");
  const clock = await getClockService();
  const result = intent === "reset" ? await clock.reset() : await clock.advance(intent);
  if (!result.ok) return { ok: false, message: result.message };
  await (await getLifecycleService()).markLostLeads();
  refresh();
  return { ok: true };
}
