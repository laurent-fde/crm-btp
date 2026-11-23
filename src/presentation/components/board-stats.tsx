import { useId } from "react";
import type { BoardStats as Stats } from "@/services/domain/board-stats";
import { STAGE_DOT } from "./stage-styles";

// Séparateur lu par les lecteurs d'écran (« Perdu : 1 »), invisible à l'écran.
const SrColon = () => <span className="sr-only"> : </span>;

// L'en-tête de statistiques du tableau : total, nombre par étape, séquence e-mail par e-mail, taux de gain.
export function BoardStats({ stats }: { stats: Stats }) {
  const sequenceId = useId();
  return (
    <section aria-label="Statistiques" className="grid gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-card-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-semibold">{stats.total === 1 ? "1 lead" : `${stats.total} leads`}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {stats.byStage.map((s) => (
            <li key={s.stage} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-2 rounded-full ${STAGE_DOT[s.stage]}`} />
              <span className="text-muted-foreground">{s.label}</span>
              <SrColon />
              <span className="font-mono">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span id={sequenceId} className="text-muted-foreground">
          Séquence en cours
        </span>
        <SequenceCounts sequence={stats.sequence} labelledBy={sequenceId} />
        <span className="flex items-center gap-1.5 sm:ml-auto" title="Gagnés parmi les leads terminés (gagnés + perdus)">
          <span className="text-muted-foreground">Taux de gain</span>
          <SrColon />
          <span className="font-mono text-stage-gagne">{stats.wonRate === null ? "—" : `${stats.wonRate} %`}</span>
        </span>
      </div>
    </section>
  );
}

// « E-mail 1 2 · E-mail 2 1 … » : les leads en attente après chaque e-mail de la séquence.
export function SequenceCounts({ sequence, labelledBy }: { sequence: Stats["sequence"]; labelledBy?: string }) {
  return (
    <ul aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : "Séquence en cours"} className="flex flex-wrap gap-x-3 gap-y-1">
      {sequence.map((s) => (
        <li key={s.step} className="inline-flex gap-1">
          <span className="text-muted-foreground">E-mail {s.step}</span>
          <SrColon />
          <span className="font-mono">{s.count}</span>
        </li>
      ))}
    </ul>
  );
}
