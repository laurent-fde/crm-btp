import { useId } from "react";
import type { BoardStats as Stats } from "@/services/domain/board-stats";
import { STAGE_DOT } from "./stage-styles";

// Séparateur lu par les lecteurs d'écran (« Perdu : 1 »), invisible à l'écran.
const SrColon = () => <span className="sr-only"> : </span>;

// L'en-tête de statistiques du tableau : total, puis chaque étape et chaque e-mail de la séquence en pourcentage
// (le nombre de leads au survol), et le taux de gain. Les colonnes, elles, gardent les nombres.
export function BoardStats({ stats }: { stats: Stats }) {
  const sequenceId = useId();
  return (
    <section aria-label="Statistiques" className="grid gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-card-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-semibold">{leadsCount(stats.total)}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {stats.byStage.map((s) => (
            <li key={s.stage} className="flex items-center gap-1.5" title={leadsCount(s.count)}>
              <span aria-hidden className={`size-2 rounded-full ${STAGE_DOT[s.stage]}`} />
              <span className="text-muted-foreground">{s.label}</span>
              <SrColon />
              <span className="font-mono">{s.percent} %</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span id={sequenceId} className="text-muted-foreground">
          Séquence en cours
        </span>
        <SequenceCounts sequence={stats.sequence} labelledBy={sequenceId} unit="percent" />
        <span className="flex items-center gap-1.5 sm:ml-auto" title="Gagnés parmi les leads terminés (gagnés + perdus)">
          <span className="text-muted-foreground">Taux de gain</span>
          <SrColon />
          <span className="font-mono text-stage-gagne">{stats.wonRate === null ? "—" : `${stats.wonRate} %`}</span>
        </span>
      </div>
    </section>
  );
}

const leadsCount = (n: number) => (n === 1 ? "1 lead" : `${n} leads`);

// « E-mail 1 2 · E-mail 2 1 … » (ou en %) : les leads en attente après chaque e-mail de la séquence.
type SequenceCountsProps = { sequence: Stats["sequence"]; labelledBy?: string; unit?: "count" | "percent" };

export function SequenceCounts({ sequence, labelledBy, unit = "count" }: SequenceCountsProps) {
  return (
    <ul aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : "Séquence en cours"} className="flex flex-wrap gap-x-3 gap-y-1">
      {sequence.map((s) => (
        <li key={s.step} className="inline-flex gap-1" title={unit === "percent" ? leadsCount(s.count) : undefined}>
          <span className="text-muted-foreground">E-mail {s.step}</span>
          <SrColon />
          <span className="font-mono">{unit === "percent" ? `${s.percent} %` : s.count}</span>
        </li>
      ))}
    </ul>
  );
}
