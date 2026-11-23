import { connection } from "next/server";
import { Suspense } from "react";
import { getLeadFormOptions, getLeadService } from "@/composition";
import { addLeadAction } from "@/presentation/actions/lead.action";
import { KanbanBoard } from "@/presentation/components/kanban-board";
import { NewLeadDialog } from "@/presentation/components/new-lead-dialog";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Lu à chaque requête : le tableau reflète toujours la base.
async function Board() {
  await connection();
  const columns = await getLeadService().getBoard();
  return <KanbanBoard columns={columns} />;
}

export default function Home() {
  const { trades } = getLeadFormOptions();

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM-BTP</h1>
          <p className="text-sm text-muted-foreground">Suivi des leads froids du bâtiment</p>
        </div>
        <div className="flex items-center gap-2">
          <NewLeadDialog action={addLeadAction} trades={trades} />
          <ThemeToggle />
        </div>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement du tableau…</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
