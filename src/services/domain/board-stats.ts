// Domaine · statistiques du tableau. Règle pure : aucune base, aucune date.

import type { BoardColumn, Stage } from "./lead";

export type BoardStats = {
  total: number;
  // percent : part du total, en pourcentage arrondi (0 sans lead).
  byStage: { stage: Stage; label: string; count: number; percent: number }[];
  // Leads « E-mail envoyé » (en attente d'une action), selon le dernier e-mail reçu : de 1 à la longueur de la séquence.
  // percent : part des leads en cours de séquence (0 si aucun).
  sequence: { step: number; count: number; percent: number }[];
  // Part des leads terminés (gagnés + perdus) qui sont gagnés, en pourcentage arrondi ; null si aucun n'est terminé.
  wonRate: number | null;
};

// L'étape de séquence d'un lead : le nombre d'e-mails reçus, borné à la longueur actuelle (séquence raccourcie depuis).
// 0 = aucun e-mail.
export function sequenceStep(emailsSent: number, sequenceLength: number): number {
  return Math.min(Math.max(emailsSent, 0), sequenceLength);
}

const percentOf = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export function boardStats(columns: readonly BoardColumn[], sequenceLength: number): BoardStats {
  const total = columns.reduce((sum, column) => sum + column.leads.length, 0);
  const waiting = columns.find((column) => column.stage === "email_envoye")?.leads ?? [];
  const count = (stage: Stage) => columns.find((column) => column.stage === stage)?.leads.length ?? 0;
  const won = count("gagne");
  const finished = won + count("perdu");
  const counts = Array.from({ length: sequenceLength }, () => 0);
  for (const lead of waiting) {
    // Aucun e-mail reçu (étape changée à la main) : hors répartition.
    const step = sequenceStep(lead.emailStep ?? 0, sequenceLength);
    if (step > 0) counts[step - 1]++;
  }
  const inSequence = counts.reduce((sum, n) => sum + n, 0);
  const sequence = counts.map((count, i) => ({ step: i + 1, count, percent: percentOf(count, inSequence) }));
  return {
    total,
    byStage: columns.map((column) => ({
      stage: column.stage,
      label: column.label,
      count: column.leads.length,
      percent: percentOf(column.leads.length, total),
    })),
    sequence,
    wonRate: finished === 0 ? null : percentOf(won, finished),
  };
}
