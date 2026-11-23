// Couleur de chaque étape, tirée du thème (variables stage-*). Classes écrites en entier pour Tailwind.

import type { Stage } from "@/services/ports";

export const STAGE_DOT: Record<Stage, string> = {
  nouveau: "bg-stage-nouveau",
  email_envoye: "bg-stage-envoye",
  ouvert: "bg-stage-ouvert",
  lien_clique: "bg-stage-clique",
  page_visitee: "bg-stage-visite",
  gagne: "bg-stage-gagne",
  perdu: "bg-stage-perdu",
};
