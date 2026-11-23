"use client";

import { Loader2, Settings2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import type { SettingsState } from "@/presentation/actions/settings.action";
import type { Settings } from "@/services/domain/settings";
import { Button, buttonVariants } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/presentation/components/ui/dialog";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

type SettingsAction = (previous: SettingsState, formData: FormData) => Promise<SettingsState>;

// Les réglages de l'app dans une fenêtre. Un enregistrement réussi la ferme.
export function SettingsDialog({ action, settings }: { action: SettingsAction; settings: Settings }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        <Settings2 aria-hidden />
        Réglages
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réglages</DialogTitle>
          <DialogDescription>S&apos;appliquent à tous les leads, y compris ceux en cours de séquence.</DialogDescription>
        </DialogHeader>
        <SettingsForm action={action} settings={settings} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ action, settings, onSuccess }: { action: SettingsAction; settings: Settings; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(action, null);
  const error = state && !state.ok ? state.errors.sequenceLength : undefined;
  const value = (state && !state.ok ? state.values?.sequenceLength : undefined) ?? String(settings.sequenceLength);

  useEffect(() => {
    if (state?.ok) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="settings-sequenceLength">Nombre d&apos;e-mails de la séquence</Label>
        <Input
          key={value}
          id="settings-sequenceLength"
          name="sequenceLength"
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          defaultValue={value}
          className="w-24"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "settings-sequenceLength-error" : "settings-sequenceLength-hint"}
        />
        {error ? (
          <p id="settings-sequenceLength-error" className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <p id="settings-sequenceLength-hint" className="text-xs text-muted-foreground">
            Entre 1 et 10. Le premier présente l&apos;offre, le dernier clôt la séquence.
          </p>
        )}
      </div>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
