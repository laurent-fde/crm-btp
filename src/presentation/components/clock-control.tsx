"use client";

import { CalendarClock, Loader2, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";
import type { ClockState } from "@/presentation/actions/clock.action";
import { Button } from "@/presentation/components/ui/button";
import { formatDateTime } from "./format-date";

type ClockAction = (previous: ClockState, formData: FormData) => Promise<ClockState>;
type ClockControlProps = {
  status: { now: string; offsetDays: number };
  action: ClockAction;
};

// La date de l'app et les boutons pour simuler le passage du temps (démo : rien à attendre).
// Un seul formulaire : le bouton cliqué dit quoi faire (intent), et un seul état d'erreur, toujours celui du dernier envoi.
export function ClockControl({ status, action }: ClockControlProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [clicked, setClicked] = useState<string | null>(null);
  const spinner = (intent: string) => pending && clicked === intent;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {/* Annoncée aux lecteurs d'écran quand la date change. */}
      <p aria-live="polite" className="flex items-center gap-1.5 text-sm">
        <CalendarClock aria-hidden className="size-4 text-muted-foreground" />
        <span className="sr-only">Date de l&apos;app :</span>
        <span className="font-mono">{formatDateTime(new Date(status.now))}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {status.offsetDays === 0 ? "aujourd'hui" : `+${status.offsetDays} j`}
        </span>
      </p>
      {(["1", "7"] as const).map((days) => (
        <Button
          key={days}
          type="submit"
          name="intent"
          value={days}
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setClicked(days)}
        >
          {spinner(days) && <Loader2 aria-hidden className="animate-spin" />}
          {days === "1" ? "+1 jour" : "+7 jours"}
        </Button>
      ))}
      <Button
        type="submit"
        name="intent"
        value="reset"
        variant="ghost"
        size="icon-sm"
        aria-label="Revenir à aujourd'hui"
        title="Revenir à aujourd'hui"
        disabled={pending || status.offsetDays === 0}
        onClick={() => setClicked("reset")}
      >
        {spinner("reset") ? <Loader2 aria-hidden className="animate-spin" /> : <RotateCcw aria-hidden />}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
