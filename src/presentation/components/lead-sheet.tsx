"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LeadFormState, SequenceState } from "@/presentation/actions/lead.action";
import type { LeadDetailResult } from "@/services/lead.service";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";
import { formatDateTime } from "./format-date";
import { ActionPanel } from "./action-panel";
import { LeadForm } from "./lead-form";
import { SequencePanel } from "./sequence-panel";

type LeadAction = (previous: LeadFormState, formData: FormData) => Promise<LeadFormState>;

type SendAction = (previous: SequenceState, formData: FormData) => Promise<SequenceState>;

type LeadSheetProps = {
  result: LeadDetailResult;
  action: LeadAction;
  sendAction: SendAction;
  simulateAction: SendAction;
  trades: readonly string[];
};

// La fiche d'un lead, dans un panneau latéral ouvert par l'adresse (?lead=<id>). Fermer revient au tableau.
export function LeadSheet({ result, action, sendAction, simulateAction, trades }: LeadSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  // Le panneau se ferme tout de suite ; l'adresse est remplacée (Retour ne rouvre pas la fiche).
  const close = () => {
    setOpen(false);
    router.replace("/", { scroll: false });
  };
  const detail = result.ok ? result : null;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg data-[side=right]:sm:max-w-lg">
        {detail ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl font-semibold">{detail.lead.name}</SheetTitle>
              <SheetDescription>Fiche du lead. Données fictives uniquement.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-8 px-4 pb-6">
              <LeadForm
                key={detail.lead.id}
                action={action}
                trades={trades}
                idPrefix="fiche"
                leadId={detail.lead.id}
                initialValues={detail.lead}
                submitLabel="Enregistrer"
                pendingLabel="Enregistrement…"
                successMessage="Modifications enregistrées"
              />
              <SequencePanel leadId={detail.lead.id} sequence={detail.sequence} action={sendAction} />
              {/* Une action n'a de sens qu'après un e-mail envoyé ; un lead gagné ne bouge plus. */}
              {detail.sequence.sent > 0 && detail.lead.stage !== "gagne" && (
                <ActionPanel leadId={detail.lead.id} action={simulateAction} />
              )}
              <section aria-labelledby="fiche-historique" className="grid gap-3">
                <h3 id="fiche-historique" className="text-base font-semibold">
                  Historique
                </h3>
                <ol aria-label="Historique" className="grid gap-2 border-l border-border pl-4">
                  {detail.history.map((item) => (
                    <li key={item.id} className="grid gap-0.5 text-sm">
                      <span>{item.label}</span>
                      <time dateTime={item.occurredAt.toISOString()} className="font-mono text-xs text-muted-foreground">
                        {formatDateTime(item.occurredAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Fiche introuvable</SheetTitle>
            <SheetDescription>{!result.ok && result.message}</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
