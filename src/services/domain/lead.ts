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

// Une carte du tableau : le lead, et s'il est « chaud ».
export type BoardLead = Lead & { hot?: boolean };
export type BoardColumn<T extends Lead = BoardLead> = { stage: Stage; label: string; leads: T[] };

// Historique d'un lead : chaque événement (quoi, quand). Les lots suivants ajoutent leurs types.
// Actions du destinataire, reçues par webhook (ou simulées par le même chemin).
export const ACTION_TYPES = ["email_ouvert", "lien_clique", "page_visitee", "rdv_pris"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const EVENT_TYPES = ["lead_cree", "email_envoye", ...ACTION_TYPES] as const;
export type LeadEventType = (typeof EVENT_TYPES)[number];

// Les actions qui rendent un lead « chaud » (un RDV pris le fait passer dans « Gagné »).
export const HOT_ACTION_TYPES: readonly LeadEventType[] = ["email_ouvert", "lien_clique", "page_visitee"];
export const HOT_WINDOW_HOURS = 48;

// externalId : l'identifiant donné par l'expéditeur d'un webhook (un événement reçu deux fois ne compte qu'une fois).
// emailStep : le numéro de l'e-mail dans la séquence ; emailFinal : c'était le dernier e-mail
// de la séquence au moment de l'envoi (événements « email_envoye » seulement).
export type LeadEvent = {
  id: string;
  leadId: string;
  type: LeadEventType;
  occurredAt: Date;
  emailStep?: number;
  emailFinal?: boolean;
  externalId?: string;
};

export const ACTION_LABELS: Record<ActionType, string> = {
  email_ouvert: "E-mail ouvert",
  lien_clique: "Lien cliqué",
  page_visitee: "Page visitée",
  rdv_pris: "RDV pris",
};

// L'étape que vise une action ; « RDV pris » fait gagner le lead.
export function actionTargetStage(type: ActionType): Stage {
  const targets: Record<ActionType, Stage> = {
    email_ouvert: "ouvert",
    lien_clique: "lien_clique",
    page_visitee: "page_visitee",
    rdv_pris: "gagne",
  };
  return targets[type];
}

// Le lead n'avance que vers l'avant. Un lead gagné le reste ; un lead perdu qui agit revient à l'étape de son action.
export function advanceStage(current: Stage, target: Stage): Stage {
  if (current === "gagne") return "gagne";
  if (current === "perdu") return target;
  return STAGES.indexOf(target) > STAGES.indexOf(current) ? target : current;
}

// Chaud : une action (ouvert, cliqué, page visitée) dans les 48 dernières heures, selon l'horloge de l'app.
export function isHot(lastActionAt: Date | null, now: Date): boolean {
  if (!lastActionAt) return false;
  return now.getTime() - lastActionAt.getTime() < HOT_WINDOW_HOURS * 3_600_000;
}

// Le libellé d'un événement dans l'historique.
export function eventLabel(event: LeadEvent): string {
  switch (event.type) {
    case "lead_cree":
      return "Lead créé";
    case "email_envoye":
      return `E-mail ${event.emailStep} envoyé`;
    default:
      return ACTION_LABELS[event.type];
  }
}

// L'historique se lit du plus ancien au plus récent (tri stable : l'ordre d'écriture départage).
export function sortHistory(events: readonly LeadEvent[]): LeadEvent[] {
  return [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

// Le tableau : toujours les 7 colonnes, dans l'ordre des étapes ; le lead le plus récent en premier.
export function groupByStage<T extends Lead>(leads: readonly T[]): BoardColumn<T>[] {
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
