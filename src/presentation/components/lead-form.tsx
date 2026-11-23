"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import type { AddLeadState } from "@/presentation/actions/lead.action";
import type { LeadField } from "@/services/lead.service";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

type AddAction = (previous: AddLeadState, formData: FormData) => Promise<AddLeadState>;

type FieldProps = {
  name: LeadField;
  label: string;
  type?: "text" | "email" | "tel";
  inputMode?: "numeric";
  autoComplete?: string;
  list?: string;
  required?: boolean;
  state: AddLeadState;
};

function Field({ name, label, type = "text", inputMode, autoComplete, list, required, state }: FieldProps) {
  const id = `lead-${name}`;
  const errorId = `${id}-error`;
  const error = state && !state.ok ? state.errors[name] : undefined;
  const value = state && !state.ok ? state.values?.[name] : undefined;

  return (
    <div className="grid content-start gap-2">
      <div className="flex items-baseline gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required && (
          <span aria-hidden className="text-sm text-muted-foreground">
            *
          </span>
        )}
      </div>
      <Input
        // La clé change à chaque réponse : le champ reprend la saisie renvoyée par le serveur.
        key={value ?? ""}
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        list={list}
        defaultValue={value ?? ""}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Le formulaire d'ajout. La validation est celle du service (noValidate) : messages en français, mêmes règles partout.
// Ordre des champs à l'écran : le curseur va dans le premier champ en erreur.
const FIELD_ORDER: LeadField[] = ["name", "company", "trade", "postalCode", "city", "email", "phone"];

type LeadFormProps = { action: AddAction; trades: readonly string[]; onSuccess?: () => void };

export function LeadForm({ action, trades, onSuccess }: LeadFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) onSuccess?.();
    if (state && !state.ok) {
      const first = FIELD_ORDER.find((field) => state.errors[field]);
      if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Nom" autoComplete="name" required state={state} />
      <Field name="company" label="Entreprise" autoComplete="organization" state={state} />
      <Field name="trade" label="Métier" list="lead-trades" state={state} />
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <Field name="postalCode" label="Code postal" inputMode="numeric" autoComplete="postal-code" state={state} />
        <Field name="city" label="Ville" autoComplete="address-level2" state={state} />
      </div>
      <Field name="email" label="E-mail" type="email" autoComplete="email" required state={state} />
      <Field name="phone" label="Téléphone" type="tel" autoComplete="tel" state={state} />
      <datalist id="lead-trades">
        {trades.map((trade) => (
          <option key={trade} value={trade} />
        ))}
      </datalist>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.formError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
        <p className="text-xs text-muted-foreground">* obligatoire</p>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {pending ? "Ajout en cours…" : "Ajouter le lead"}
        </Button>
      </div>
    </form>
  );
}
