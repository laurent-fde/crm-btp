"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { LeadFormState } from "@/presentation/actions/lead.action";
import type { LeadField } from "@/services/lead.service";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

type LeadAction = (previous: LeadFormState, formData: FormData) => Promise<LeadFormState>;
type LeadValues = Partial<Record<LeadField, string | null>>;

type FieldProps = {
  name: LeadField;
  label: string;
  type?: "text" | "email" | "tel";
  inputMode?: "numeric";
  autoComplete?: string;
  list?: string;
  required?: boolean;
  state: LeadFormState;
  idPrefix: string;
  initialValues?: LeadValues;
};

function Field({ name, label, type = "text", inputMode, autoComplete, list, required, state, idPrefix, initialValues }: FieldProps) {
  const id = `${idPrefix}-${name}`;
  const errorId = `${id}-error`;
  const error = state && !state.ok ? state.errors[name] : undefined;
  // Après un refus : la saisie renvoyée par le serveur ; sinon les valeurs du lead (modification) ou rien (ajout).
  const value = (state && !state.ok ? state.values?.[name] : undefined) ?? initialValues?.[name] ?? undefined;

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

// Le formulaire d'un lead, pour l'ajout comme pour la modification.
// La validation est celle du service (noValidate) : messages en français, mêmes règles partout.
// Ordre des champs à l'écran : le curseur va dans le premier champ en erreur.
const FIELD_ORDER: LeadField[] = ["name", "company", "trade", "postalCode", "city", "email", "phone"];

type LeadFormProps = {
  action: LeadAction;
  trades: readonly string[];
  onSuccess?: () => void;
  // Modification : le lead visé et ses valeurs actuelles.
  leadId?: string;
  initialValues?: LeadValues;
  // Préfixe des identifiants de champ : deux formulaires ouverts ne se confondent pas.
  idPrefix?: string;
  submitLabel?: string;
  pendingLabel?: string;
  successMessage?: string;
};

export function LeadForm({
  action,
  trades,
  onSuccess,
  leadId,
  initialValues,
  idPrefix = "lead",
  submitLabel = "Ajouter le lead",
  pendingLabel = "Ajout en cours…",
  successMessage,
}: LeadFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  // La réponse après laquelle on a recommencé à saisir : son message de succès n'est plus vrai.
  const [editedAfter, setEditedAfter] = useState<LeadFormState>(null);
  const showSuccess = Boolean(state?.ok && successMessage && editedAfter !== state);

  useEffect(() => {
    if (state?.ok) onSuccess?.();
    if (state && !state.ok) {
      const first = FIELD_ORDER.find((field) => state.errors[field]);
      if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    }
  }, [state, onSuccess]);

  const fieldProps = { state, idPrefix, initialValues };
  const tradesId = `${idPrefix}-trades`;

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={() => setEditedAfter(state)}
      noValidate
      className="grid gap-4 sm:grid-cols-2"
    >
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <Field name="name" label="Nom" autoComplete="name" required {...fieldProps} />
      <Field name="company" label="Entreprise" autoComplete="organization" {...fieldProps} />
      <Field name="trade" label="Métier" list={tradesId} {...fieldProps} />
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <Field name="postalCode" label="Code postal" inputMode="numeric" autoComplete="postal-code" {...fieldProps} />
        <Field name="city" label="Ville" autoComplete="address-level2" {...fieldProps} />
      </div>
      <Field name="email" label="E-mail" type="email" autoComplete="email" required {...fieldProps} />
      <Field name="phone" label="Téléphone" type="tel" autoComplete="tel" {...fieldProps} />
      <datalist id={tradesId}>
        {trades.map((trade) => (
          <option key={trade} value={trade} />
        ))}
      </datalist>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.formError}
        </p>
      )}
      {successMessage && (
        // Toujours présente, pour que les lecteurs d'écran l'annoncent quand le message apparaît.
        <p role="status" className="text-sm text-muted-foreground empty:hidden sm:col-span-2">
          {showSuccess ? successMessage : ""}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
        <p className="text-xs text-muted-foreground">* obligatoire</p>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
