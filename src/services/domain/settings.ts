// Domaine · réglages de l'app : valeurs par défaut et bornes. Règles pures.

export type Settings = { sequenceLength: number };

export const SEQUENCE_LENGTH_MIN = 1;
export const SEQUENCE_LENGTH_MAX = 10;

export const DEFAULT_SETTINGS: Settings = { sequenceLength: 3 };

const isValidLength = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= SEQUENCE_LENGTH_MIN && (value as number) <= SEQUENCE_LENGTH_MAX;

// Les réglages enregistrés, complétés par les valeurs par défaut.
// Une valeur aberrante relue en base (texte, 0, hors bornes) est remplacée par la valeur par défaut.
export function withDefaults(saved: Partial<Settings>): Settings {
  return {
    sequenceLength: isValidLength(saved.sequenceLength) ? saved.sequenceLength : DEFAULT_SETTINGS.sequenceLength,
  };
}
