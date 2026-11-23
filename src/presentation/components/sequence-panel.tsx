"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import type { SequenceState } from "@/presentation/actions/lead.action";
import type { SequenceStatus } from "@/services/domain/sequence";
import { Button } from "@/presentation/components/ui/button";

type SendAction = (previous: SequenceState, formData: FormData) => Promise<SequenceState>;

type SequencePanelProps = { leadId: string; sequence: SequenceStatus; action: SendAction };

// La séquence d'e-mails dans la fiche : où on en est, et l'envoi (simulé) de l'e-mail suivant.
export function SequencePanel({ leadId, sequence, action }: SequencePanelProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const done = sequence.next === null && !sequence.blockedReason;

  return (
    <section aria-labelledby="fiche-sequence" className="grid gap-3">
      <h3 id="fiche-sequence" className="text-base font-semibold">
        Séquence d&apos;e-mails
      </h3>
      {/* Toujours présente : les lecteurs d'écran annoncent l'état (par exemple « Séquence terminée » après le dernier envoi). */}
      <div role="status" className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          {sequence.next === null && sequence.sent !== sequence.total
            ? `E-mails envoyés : ${sequence.sent} (séquence réglée à ${sequence.total})`
            : `E-mails envoyés : ${sequence.sent} sur ${sequence.total}`}
        </p>
        {done && <p className="text-sm font-medium">Séquence terminée</p>}
        {sequence.blockedReason && <p className="text-sm font-medium">{sequence.blockedReason}</p>}
      </div>
      {sequence.next !== null && (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="leadId" value={leadId} />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
            {pending ? "Envoi…" : `Envoyer l'e-mail ${sequence.next}`}
          </Button>
          <span className="text-xs text-muted-foreground">Simulation : rien n&apos;est expédié.</span>
        </form>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </section>
  );
}
