// Validation de la saisie d'un lead (Zod). Messages en français, une erreur par champ.

import { z } from "zod";
import { normalizeFrenchPhone } from "./domain/lead";

const MAX = 100;
const tooLong = `${MAX} caractères maximum`;

// Champ facultatif : espaces retirés, vide → null.
const optionalText = z
  .string()
  .trim()
  .max(MAX, tooLong)
  .optional()
  .transform((value) => value || null);

export const leadSchema = z.object({
  name: z.string({ error: "Le nom est obligatoire" }).trim().min(1, "Le nom est obligatoire").max(MAX, tooLong),
  company: optionalText,
  trade: optionalText,
  city: optionalText,
  // Code postal français : 5 chiffres, pas « 00… ». Facultatif. Les espaces sont retirés (« 69 003 » → « 69003 »).
  postalCode: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^(?!00)\d{5}$|^$/, "5 chiffres attendus (ex. 69003)"))
    .optional()
    .transform((value) => value || null),
  email: z
    .string({ error: "L'e-mail est obligatoire" })
    .trim()
    .toLowerCase()
    .min(1, "L'e-mail est obligatoire")
    .max(254, "254 caractères maximum")
    .pipe(z.email("L'adresse e-mail n'est pas valide")),
  phone: z
    .string()
    .optional()
    .transform((value, ctx) => {
      const raw = value?.trim();
      if (!raw) return null;
      const phone = normalizeFrenchPhone(raw);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Le téléphone n'est pas valide (ex. 06 12 34 56 78)" });
        return z.NEVER;
      }
      return phone;
    }),
});
