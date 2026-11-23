// Domaine · lead : vocabulaire et règles pures. Aucune dépendance.

export const STAGES = ["nouveau", "email_envoye", "ouvert", "lien_clique", "page_visitee", "gagne", "perdu"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  nouveau: "Nouveau",
  email_envoye: "E-mail envoyé",
  ouvert: "Ouvert",
  lien_clique: "Lien cliqué",
  page_visitee: "Page visitée",
  gagne: "Gagné",
  perdu: "Perdu",
};

// Métiers proposés à la saisie (le champ reste libre).
export const SUGGESTED_TRADES = [
  "Maçon",
  "Électricien",
  "Plombier",
  "Chauffagiste",
  "Couvreur",
  "Charpentier",
  "Menuisier",
  "Plaquiste",
  "Peintre",
  "Carreleur",
  "Terrassier",
] as const;

export type Lead = {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  city: string | null;
  postalCode: string | null;
  email: string;
  phone: string | null;
  stage: Stage;
  createdAt: Date;
};

export type BoardColumn = { stage: Stage; label: string; leads: Lead[] };

// Historique d'un lead : chaque événement (quoi, quand). Les lots suivants ajoutent leurs types.
export const EVENT_TYPES = ["lead_cree", "email_envoye"] as const;
export type LeadEventType = (typeof EVENT_TYPES)[number];

// emailStep : le numéro de l'e-mail dans la séquence ; emailFinal : c'était le dernier e-mail
// de la séquence au moment de l'envoi (événements « email_envoye » seulement).
export type LeadEvent = {
  id: string;
  leadId: string;
  type: LeadEventType;
  occurredAt: Date;
  emailStep?: number;
  emailFinal?: boolean;
};

// Le libellé d'un événement dans l'historique.
export function eventLabel(event: LeadEvent): string {
  switch (event.type) {
    case "lead_cree":
      return "Lead créé";
    case "email_envoye":
      return `E-mail ${event.emailStep} envoyé`;
  }
}

// L'historique se lit du plus ancien au plus récent (tri stable : l'ordre d'écriture départage).
export function sortHistory(events: readonly LeadEvent[]): LeadEvent[] {
  return [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

// Le tableau : toujours les 7 colonnes, dans l'ordre des étapes ; le lead le plus récent en premier.
export function groupByStage(leads: readonly Lead[]): BoardColumn[] {
  const sorted = [...leads].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    leads: sorted.filter((lead) => lead.stage === stage),
  }));
}

// Numéro français (fixe ou mobile, +33 / 0033 acceptés), écrit « 06 12 34 56 78 ». null s'il n'est pas valide.
export function normalizeFrenchPhone(raw: string): string | null {
  let digits = raw.trim().replace(/\(0\)/g, "").replace(/[\s.\-()]/g, "");
  // Après l'indicatif +33 / 0033, le 0 national est remis une seule fois (« +33 06… » comme « +33 6… »).
  const international = digits.startsWith("+33") ? digits.slice(3) : digits.startsWith("0033") ? digits.slice(4) : null;
  if (international !== null) digits = international.startsWith("0") ? international : `0${international}`;
  if (!/^0[1-9]\d{8}$/.test(digits)) return null;
  return digits.match(/\d{2}/g)!.join(" ");
}
