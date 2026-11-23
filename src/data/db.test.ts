// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type InStatement } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { MIGRATIONS, migrate, resolveDatabaseUrl, type Database } from "./db";

describe("couche données · db (adresse de la base)", () => {
  it("utilise DATABASE_URL quand elle est remplie", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "libsql://crm-btp.turso.io", VERCEL_ENV: "production" })).toBe(
      "libsql://crm-btp.turso.io",
    );
  });

  it("retombe sur la base locale hors Vercel quand DATABASE_URL est vide ou absente", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "" })).toBe("file:.data/crm-btp.db");
    expect(resolveDatabaseUrl({})).toBe("file:.data/crm-btp.db");
  });

  it("refuse de démarrer sur un déploiement Vercel (production ou preview) sans DATABASE_URL", () => {
    expect(() => resolveDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "production" })).toThrow(/DATABASE_URL/);
    expect(() => resolveDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  // #31 : `vercel env pull` peut écrire VERCEL=1 dans .env.local ; en local, la base locale reste utilisée.
  it("garde la base locale en développement, même avec VERCEL=1 venu de `vercel env pull`", () => {
    expect(resolveDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "development" })).toBe("file:.data/crm-btp.db");
    expect(resolveDatabaseUrl({ VERCEL: "1" })).toBe("file:.data/crm-btp.db");
  });
});

describe("couche données · db (migrations)", () => {
  const opened: Database[] = [];
  const tempDirs: string[] = [];

  const tempUrl = () => {
    const dir = mkdtempSync(join(tmpdir(), "crm-btp-"));
    tempDirs.push(dir);
    return `file:${join(dir, "crm-btp.db")}`;
  };

  // Base vierge, sans les vraies migrations : chaque test applique sa liste d'exemple.
  const open = async (url: string) => {
    const db: Database = { client: createClient({ url }), ready: Promise.resolve() };
    opened.push(db);
    return db;
  };

  const appliedVersion = async (db: Database) => {
    const { rows } = await db.client.execute("SELECT MAX(version) AS v FROM schema_migrations");
    return Number(rows[0].v);
  };

  afterEach(() => {
    opened.splice(0).forEach((db) => db.client.close());
    tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  // Liste d'exemple : la vraie liste de db.ts est vide tant que le lot 1 n'a pas créé la table des leads.
  const list = ["CREATE TABLE a (n INTEGER)", "CREATE TABLE b (n INTEGER)", "CREATE TABLE c (n INTEGER)"];

  it("note les migrations appliquées dans schema_migrations, sans écrire PRAGMA user_version", async () => {
    const db = await open(":memory:");
    await migrate(db.client, list);

    expect(await appliedVersion(db)).toBe(3);
    const { rows } = await db.client.execute("PRAGMA user_version");
    expect(Number(rows[0].user_version)).toBe(0);
  });

  it("ne rejoue rien à la réouverture d'une base migrée", async () => {
    const url = tempUrl();
    const first = await open(url);
    await migrate(first.client, list);
    first.client.close();

    const db = await open(url);
    await migrate(db.client, list);

    const { rows } = await db.client.execute("SELECT COUNT(*) AS n FROM schema_migrations");
    expect(Number(rows[0].n)).toBe(3);
  });

  // #34 : deux serveurs démarrent ensemble. Le second a lu « rien d'appliqué » juste avant que le premier
  // applique les migrations : il ne doit ni planter ni noter deux fois les mêmes versions.
  it("tolère une migration appliquée entre-temps par un autre serveur", async () => {
    const db = await open(tempUrl());
    await migrate(db.client, list);
    let staleReads = 1;
    const lateServer = new Proxy(db.client, {
      get(target, key, receiver) {
        if (key !== "execute") {
          const value = Reflect.get(target, key, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        }
        return async (statement: InStatement) => {
          const sql = typeof statement === "string" ? statement : statement.sql;
          if (staleReads > 0 && sql.startsWith("SELECT MAX(version)")) {
            staleReads--;
            return { rows: [{ v: null }] };
          }
          return target.execute(statement);
        };
      },
    });

    await expect(migrate(lateServer, list)).resolves.toBeUndefined();

    expect(await appliedVersion(db)).toBe(3);
    const { rows } = await db.client.execute("SELECT version, COUNT(*) AS n FROM schema_migrations GROUP BY version HAVING n > 1");
    expect(rows).toEqual([]);
  });

  // Revue de #34 : une migration qu'on peut rejouer sans erreur (IF NOT EXISTS, UPDATE…) ne doit pas
  // être appliquée deux fois ni notée deux fois : la version est unique.
  it("n'applique pas deux fois une migration rejouable, même lancée par un serveur en retard", async () => {
    const client = createClient({ url: ":memory:" });
    const replayable = [`CREATE TABLE IF NOT EXISTS t (n INTEGER)`, `INSERT INTO t (n) VALUES (1)`];
    await migrate(client, replayable);

    let staleReads = 1;
    const lateServer = new Proxy(client, {
      get(target, key, receiver) {
        if (key !== "execute") {
          const value = Reflect.get(target, key, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        }
        return async (statement: InStatement) => {
          const sql = typeof statement === "string" ? statement : statement.sql;
          if (staleReads > 0 && sql.startsWith("SELECT MAX(version)")) {
            staleReads--;
            return { rows: [{ v: null }] };
          }
          return target.execute(statement);
        };
      },
    });
    await migrate(lateServer, replayable);

    const t = await client.execute("SELECT COUNT(*) AS n FROM t");
    expect(Number(t.rows[0].n)).toBe(1);
    const versions = await client.execute("SELECT COUNT(*) AS n FROM schema_migrations");
    expect(Number(versions.rows[0].n)).toBe(2);
    client.close();
  });
});

describe("couche données · db (historique des leads, lot 2)", () => {
  // Critère 1 (lot 2) : un lead créé avant l'historique reçoit son « Lead créé », à sa date de création.
  it("donne un « Lead créé » aux leads déjà en base, daté de leur création", async () => {
    const client = createClient({ url: ":memory:" });
    await migrate(client, MIGRATIONS.slice(0, 2));
    await client.execute(
      "INSERT INTO leads (id, name, email, created_at) VALUES ('ancien', 'Karim', 'karim@exemple.fr', '2026-11-20T08:00:00.000Z')",
    );

    await migrate(client, MIGRATIONS);

    const { rows } = await client.execute("SELECT lead_id, type, occurred_at FROM lead_events");
    expect(rows.map((r) => ({ lead_id: r.lead_id, type: r.type, occurred_at: r.occurred_at }))).toEqual([
      { lead_id: "ancien", type: "lead_cree", occurred_at: "2026-11-20T08:00:00.000Z" },
    ]);
    client.close();
  });
});
