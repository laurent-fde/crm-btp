// Domaine · statistiques du tableau. Règle pure : aucune base, aucune date.

import type { BoardColumn, Stage } from "./lead";

export type BoardStats = {
  total: number;
  byStage: { stage: Stage; label: string; count: number }[];
  // Leads « E-mail envoyé » (en attente d'une action), selon le dernier e-mail reçu : de 1 à la longueur de la séquence.
  sequence: { step: number; count: number }[];
  // Part des leads terminés (gagnés + perdus) qui sont gagnés, en pourcentage arrondi ; null si aucun n'est terminé.
  wonRate: number | null;
};

// L'étape de séquence d'un lead : le nombre d'e-mails reçus, borné à la longueur actuelle (séquence raccourcie depuis).
// 0 = aucun e-mail.
export function sequenceStep(emailsSent: number, sequenceLength: number): number {
  return Math.min(Math.max(emailsSent, 0), sequenceLength);
}

export function boardStats(columns: readonly BoardColumn[], sequenceLength: number): BoardStats {
  const total = columns.reduce((sum, column) => sum + column.leads.length, 0);
  const waiting = columns.find((column) => column.stage === "email_envoye")?.leads ?? [];
  const count = (stage: Stage) => columns.find((column) => column.stage === stage)?.leads.length ?? 0;
  const won = count("gagne");
  const finished = won + count("perdu");
  const sequence = Array.from({ length: sequenceLength }, (_, i) => ({ step: i + 1, count: 0 }));
  for (const lead of waiting) {
    // Aucun e-mail reçu (étape changée à la main) : hors répartition.
    const step = sequenceStep(lead.emailStep ?? 0, sequenceLength);
    if (step > 0) sequence[step - 1].count++;
  }
  return {
    total,
    byStage: columns.map((column) => ({ stage: column.stage, label: column.label, count: column.leads.length })),
    sequence,
    wonRate: finished === 0 ? null : Math.round((won / finished) * 100),
  };
}
