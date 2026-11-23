"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import type { AddLeadState } from "@/presentation/actions/lead.action";
import { buttonVariants } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/presentation/components/ui/dialog";
import { LeadForm } from "./lead-form";

type AddAction = (previous: AddLeadState, formData: FormData) => Promise<AddLeadState>;

// Le formulaire d'ajout dans une fenêtre. Un ajout réussi la ferme ; un refus la garde ouverte avec les erreurs.
export function NewLeadDialog({ action, trades }: { action: AddAction; trades: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus aria-hidden />
        Ajouter un lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau lead</DialogTitle>
          <DialogDescription>Il arrive dans la colonne « Nouveau ». Données fictives uniquement.</DialogDescription>
        </DialogHeader>
        <LeadForm action={action} trades={trades} onSuccess={close} />
      </DialogContent>
    </Dialog>
  );
}
