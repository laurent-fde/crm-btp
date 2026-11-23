"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import type { SequenceState } from "@/presentation/actions/lead.action";
import type { ActionType } from "@/services/domain/lead";
import { Button } from "@/presentation/components/ui/button";

type SimulateAction = (previous: SequenceState, formData: FormData) => Promise<SequenceState>;

const ACTIONS: { type: ActionType; label: string }[] = [
  { type: "email_ouvert", label: "E-mail ouvert" },
  { type: "lien_clique", label: "Lien cliqué" },
  { type: "page_visitee", label: "Page visitée" },
  { type: "rdv_pris", label: "RDV pris" },
];

// Simuler une action du destinataire depuis la fiche : l'événement est signé et suit le chemin d'un vrai webhook.
export function ActionPanel({ leadId, action }: { leadId: string; action: SimulateAction }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <section aria-labelledby="fiche-actions" className="grid gap-3">
      <h3 id="fiche-actions" className="text-base font-semibold">
        Simuler une action du destinataire
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {ACTIONS.map(({ type, label }) => (
          <form key={type} action={formAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="type" value={type} />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              {label}
            </Button>
          </form>
        ))}
        {pending && <Loader2 aria-label="Envoi de l'événement…" className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">Événement signé, même chemin qu&apos;un vrai webhook.</p>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </section>
  );
}
