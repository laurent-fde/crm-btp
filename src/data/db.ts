import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

// Seul fichier qui ouvre la base. En local : un fichier SQLite.
// En prod : DATABASE_URL (et DATABASE_AUTH_TOKEN) pointent vers Turso, sans rien changer d'autre.
const LOCAL_DIR = ".data";
const LOCAL_URL = `file:${LOCAL_DIR}/crm-btp.db`;

// Migrations numérotées : on n'en modifie jamais une, on en ajoute une à la fin.
// La table schema_migrations retient combien ont déjà été appliquées
// (pas PRAGMA user_version : Turso Cloud refuse de l'écrire).
const migrations: string[] = [
  // La table des leads arrive au lot 1.
];

async function appliedVersion(client: Client): Promise<number | null> {
  const { rows } = await client.execute("SELECT MAX(version) AS v FROM schema_migrations");
  return rows[0]?.v == null ? null : Number(rows[0].v);
}

export async function migrate(client: Client, list: readonly string[] = migrations) {
  await client.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER NOT NULL)");
  // Revue de #34 : une version ne peut être notée qu'une fois. Un second serveur qui rejoue une migration
  // voit donc toujours sa transaction échouer et s'annuler, même si la migration elle-même est rejouable.
  await client.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_version ON schema_migrations (version)",
  );
  const applied = (await appliedVersion(client)) ?? 0;
  // Chaque migration et sa version sont écrites ensemble (une transaction) : tout ou rien.
  // #34 : si un autre serveur, démarré en même temps, l'a appliquée entre-temps, la transaction échoue
  // et est annulée ; on relit alors où en est la base et on reprend après, au lieu de planter.
  let version = applied;
  while (version < list.length) {
    try {
      await client.batch(
        [list[version], { sql: "INSERT INTO schema_migrations (version) VALUES (?)", args: [version + 1] }],
        "write",
      );
      version++;
    } catch (error) {
      const current = (await appliedVersion(client)) ?? 0;
      if (current <= version) throw error;
      version = current;
    }
  }
}

export type Database = { client: Client; ready: Promise<void> };

export function openDatabase(url: string, authToken?: string): Database {
  const client = createClient({ url, authToken });
  return { client, ready: migrate(client) };
}

// Adresse de la base. || et non ?? : une DATABASE_URL vide (copiée de .env.example) compte comme absente.
// Sur un déploiement Vercel (VERCEL_ENV = production ou preview, posée par la plateforme), le disque
// n'est pas durable : pas de repli local, une variable oubliée doit planter clairement plutôt que perdre
// les leads en silence. #31 : on ne teste pas VERCEL, que `vercel env pull` peut écrire dans .env.local.
const DEPLOYED = new Set(["production", "preview"]);

export function resolveDatabaseUrl(env: Record<string, string | undefined>): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.VERCEL_ENV && DEPLOYED.has(env.VERCEL_ENV)) {
    throw new Error("DATABASE_URL manquante : ajoute-la (et DATABASE_AUTH_TOKEN) dans les variables du projet Vercel.");
  }
  return LOCAL_URL;
}

// Une seule connexion pour toute l'app (conservée entre les rechargements de `pnpm dev`).
const globalForDb = globalThis as unknown as { crmBtpDb?: Database };

export function getDatabase(): Database {
  if (!globalForDb.crmBtpDb) {
    const url = resolveDatabaseUrl(process.env);
    if (url === LOCAL_URL) mkdirSync(LOCAL_DIR, { recursive: true });
    globalForDb.crmBtpDb = openDatabase(url, process.env.DATABASE_AUTH_TOKEN || undefined);
  }
  return globalForDb.crmBtpDb;
}
