// Domaine · réglages de l'app : valeurs par défaut et bornes. Règles pures.

export type Settings = { sequenceLength: number; lostDelayDays: number };

export const SEQUENCE_LENGTH_MIN = 1;
export const SEQUENCE_LENGTH_MAX = 10;
// Délai, après le dernier e-mail de la séquence, au-delà duquel un lead sans action passe dans « Perdu ».
export const LOST_DELAY_MIN = 1;
export const LOST_DELAY_MAX = 90;

export const DEFAULT_SETTINGS: Settings = { sequenceLength: 3, lostDelayDays: 7 };

const isIntegerBetween = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

// Les réglages enregistrés, complétés par les valeurs par défaut.
// Une valeur aberrante relue en base (texte, 0, hors bornes) est remplacée par la valeur par défaut.
export function withDefaults(saved: Partial<Settings>): Settings {
  return {
    sequenceLength: isIntegerBetween(saved.sequenceLength, SEQUENCE_LENGTH_MIN, SEQUENCE_LENGTH_MAX)
      ? saved.sequenceLength
      : DEFAULT_SETTINGS.sequenceLength,
    lostDelayDays: isIntegerBetween(saved.lostDelayDays, LOST_DELAY_MIN, LOST_DELAY_MAX)
      ? saved.lostDelayDays
      : DEFAULT_SETTINGS.lostDelayDays,
  };
}
