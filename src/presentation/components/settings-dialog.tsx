"use client";

import { Loader2, Settings2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import type { SettingsState } from "@/presentation/actions/settings.action";
import type { Settings } from "@/services/domain/settings";
import type { SettingsField } from "@/services/settings.service";
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

type FieldProps = {
  name: SettingsField;
  label: string;
  hint: string;
  min: number;
  max: number;
  value: string;
  error?: string;
};

// Un réglage numérique, son aide, et son erreur reliée au champ.
function NumberField({ name, label, hint, min, max, value, error }: FieldProps) {
  const id = `settings-${name}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        key={value}
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        defaultValue={value}
        className="w-24"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function SettingsForm({ action, settings, onSuccess }: { action: SettingsAction; settings: Settings; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(action, null);
  const refused = state && !state.ok ? state : null;
  // Après un refus : la saisie renvoyée ; sinon les réglages actuels.
  const value = (field: SettingsField) => refused?.values?.[field] ?? String(settings[field]);

  useEffect(() => {
    if (state?.ok) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} noValidate className="grid gap-4">
      <NumberField
        name="sequenceLength"
        label="Nombre d'e-mails de la séquence"
        hint="Entre 1 et 10. Le premier présente l'offre, le dernier clôt la séquence."
        min={1}
        max={10}
        value={value("sequenceLength")}
        error={refused?.errors.sequenceLength}
      />
      <NumberField
        name="lostDelayDays"
        label="Délai avant « Perdu » (jours)"
        hint="Entre 1 et 90. Sans action après le dernier e-mail, le lead passe dans « Perdu »."
        min={1}
        max={90}
        value={value("lostDelayDays")}
        error={refused?.errors.lostDelayDays}
      />
      {refused?.formError && (
        <p role="alert" className="text-sm text-destructive">
          {refused.formError}
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
