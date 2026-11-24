import { Settings2 } from "lucide-react";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { getClockService, getLeadFormOptions, getLeadService, getLifecycleService, getSettingsService } from "@/composition";
import { changeClockAction } from "@/presentation/actions/clock.action";
import { ClockControl } from "@/presentation/components/clock-control";
import {
  addLeadAction,
  sendNextEmailAction,
  simulateActionAction,
  updateLeadAction,
} from "@/presentation/actions/lead.action";
import { BoardStats } from "@/presentation/components/board-stats";
import { KanbanBoard } from "@/presentation/components/kanban-board";
import { Button } from "@/presentation/components/ui/button";
import { LeadSheet } from "@/presentation/components/lead-sheet";
import { SettingsDialog } from "@/presentation/components/settings-dialog";
import { updateSettingsAction } from "@/presentation/actions/settings.action";
import { NewLeadDialog } from "@/presentation/components/new-lead-dialog";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Avant d'afficher le tableau ou une fiche, les leads restés sans action passent dans « Perdu »
// (le vrai temps compte aussi). Une seule fois par requête (cache de React), attendue par le tableau ET la fiche :
// les deux montrent la même étape. Un échec de cette vérification n'empêche pas d'afficher la page.
const markLostLeads = cache(async () => {
  try {
    await (await getLifecycleService()).markLostLeads();
  } catch {
    // Base injoignable : le tableau ou la fiche le diront en se chargeant.
  }
});

// Lu à chaque requête : le tableau reflète toujours la base.
async function Board() {
  await connection();
  await markLostLeads();
  const { columns, stats, sequenceLength } = await (await getLeadService()).getBoard();
  return (
    <div className="grid gap-4">
      <BoardStats stats={stats} />
      <KanbanBoard columns={columns} sequence={stats.sequence} sequenceLength={sequenceLength} />
    </div>
  );
}

// Les réglages, lus à chaque requête.
async function SettingsButton() {
  await connection();
  const settings = await getSettingsService().getSettings();
  return <SettingsDialog action={updateSettingsAction} settings={settings} />;
}

// La date de l'app (simulée ou non), lue à chaque requête.
async function Clock() {
  await connection();
  const clock = await getClockService();
  const [{ now, offsetDays }, futureEvents] = await Promise.all([clock.getStatus(), clock.futureEvents()]);
  return <ClockControl status={{ now: now.toISOString(), offsetDays, futureEvents }} action={changeClockAction} />;
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// La fiche ouverte par l'adresse (?lead=<id>), lue à chaque requête.
async function OpenLead({ searchParams, trades }: { searchParams: SearchParams; trades: readonly string[] }) {
  const { lead } = await searchParams;
  if (typeof lead !== "string" || !lead) return null;
  await markLostLeads();
  const result = await (await getLeadService()).getLeadDetail(lead);
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
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <Clock />
          </Suspense>
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
