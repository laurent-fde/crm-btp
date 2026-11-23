import { Settings2 } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLeadFormOptions, getLeadService, getSettingsService } from "@/composition";
import {
  addLeadAction,
  sendNextEmailAction,
  simulateActionAction,
  updateLeadAction,
} from "@/presentation/actions/lead.action";
import { KanbanBoard } from "@/presentation/components/kanban-board";
import { Button } from "@/presentation/components/ui/button";
import { LeadSheet } from "@/presentation/components/lead-sheet";
import { SettingsDialog } from "@/presentation/components/settings-dialog";
import { updateSettingsAction } from "@/presentation/actions/settings.action";
import { NewLeadDialog } from "@/presentation/components/new-lead-dialog";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Lu à chaque requête : le tableau reflète toujours la base.
async function Board() {
  await connection();
  const columns = await getLeadService().getBoard();
  return <KanbanBoard columns={columns} />;
}

// Les réglages, lus à chaque requête.
async function SettingsButton() {
  await connection();
  const settings = await getSettingsService().getSettings();
  return <SettingsDialog action={updateSettingsAction} settings={settings} />;
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// La fiche ouverte par l'adresse (?lead=<id>), lue à chaque requête.
async function OpenLead({ searchParams, trades }: { searchParams: SearchParams; trades: readonly string[] }) {
  const { lead } = await searchParams;
  if (typeof lead !== "string" || !lead) return null;
  const result = await getLeadService().getLeadDetail(lead);
  return (
    <LeadSheet
      key={lead}
      result={result}
      action={updateLeadAction}
      sendAction={sendNextEmailAction}
      simulateAction={simulateActionAction}
      trades={trades}
    />
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
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
          {/* En attendant les réglages : un bouton de même taille, pour ne pas décaler l'en-tête. */}
          <Suspense
            fallback={
              <Button variant="outline" disabled>
                <Settings2 aria-hidden />
                Réglages
              </Button>
            }
          >
            <SettingsButton />
          </Suspense>
          <ThemeToggle />
        </div>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement du tableau…</p>}>
        <Board />
      </Suspense>
      <Suspense fallback={null}>
        <OpenLead searchParams={searchParams} trades={trades} />
      </Suspense>
    </main>
  );
}
