import type { BoardColumn } from "@/services/domain/lead";
import { LeadCard } from "./lead-card";
import { STAGE_DOT } from "./stage-styles";

// Le tableau des leads : une colonne par étape. Il défile en largeur à l'intérieur de sa zone si l'écran est étroit.
export function KanbanBoard({ columns }: { columns: BoardColumn[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="grid auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-3">
        {columns.map((column) => {
          const headingId = `colonne-${column.stage}`;
          return (
            <section
              key={column.stage}
              aria-labelledby={headingId}
              className="flex min-h-40 flex-col gap-2 rounded-xl bg-muted/60 p-2"
            >
              <h2
                id={headingId}
                className="flex items-center justify-between gap-2 px-1 pt-1 font-sans text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`size-2 rounded-full ${STAGE_DOT[column.stage]}`} />
                  {column.label}
                </span>
                <span className="font-mono text-xs font-normal text-muted-foreground">{column.leads.length}</span>
              </h2>
              {column.leads.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Aucun lead</p>
              ) : (
                <ul className="grid gap-2">
                  {column.leads.map((lead) => (
                    <li key={lead.id}>
                      <LeadCard lead={lead} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
