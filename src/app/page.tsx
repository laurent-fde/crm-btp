import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Page d'attente du socle : le tableau des leads arrive au lot 1.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CRM-BTP</h1>
        <ThemeToggle />
      </header>
      <p className="text-muted-foreground">Aucun lead pour l&apos;instant.</p>
    </main>
  );
}
