// Test de fumée : démarre le VRAI serveur (`next start`) avec le vrai câblage et le vrai build.
// Les tests unitaires prouvent les règles ; celui-ci prouve que l'assemblage se lance, répond et ne crie pas.
//
// Usage : pnpm build && pnpm smoke (le hook avant PR le lance tout seul).
// La base est un fichier temporaire : le smoke ne touche ni .data/ ni Turso. Les variables passées au
// serveur sont déjà posées, Next ne les écrase pas avec .env.local.
//
// Ce qu'il vérifie :
// 1. chaque page de PAGES répond 200 avec un vrai contenu ;
// 2. le parcours webhook : un lead créé, un événement signé reçu, la fiche affiche la nouvelle étape ;
// 3. les refus du webhook : signature fausse (401), corps trop gros (413) ;
// 4. le serveur n'écrit AUCUNE erreur dans son journal. C'est là que Next signale les erreurs de rendu
//    (ex. « new Date() while prerendering », #25) que les tests unitaires ne voient jamais.
//
// À chaque lot : ajouter ses pages à PAGES et, s'il écrit, un parcours écriture → relecture.

import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";

const SECRET = "secret-du-smoke";
const LEAD = { id: "smoke-lead", name: "Artisan Smoke", email: "smoke@exemple.fr" };
const PAGES = ["/", `/?lead=${LEAD.id}`];

const DELAI_DEMARRAGE_MS = 30_000;
// Un message d'erreur peut arriver juste après la réponse : on lui laisse le temps.
const DELAI_JOURNAL_MS = 1_000;
const TAILLE_MIN_HTML = 200;
const TROP_GROS = 64 * 1024 + 1;

// Port libre demandé au système : deux smokes en parallèle (worktrees) ne se marchent pas dessus.
async function portLibre() {
  const srv = net.createServer();
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  await new Promise((r) => srv.close(r));
  return port;
}

const PORT = Number(process.env.SMOKE_PORT?.trim() || (await portLibre()));
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(path.join(tmpdir(), "crm-btp-smoke-"));
const DATABASE_URL = `file:${path.join(dir, "smoke.db")}`;

// -H 127.0.0.1 : le serveur de test (secret connu, sans mot de passe) n'écoute que la machine locale.
// detached : le serveur a son propre groupe de processus, arrêté en entier à la fin (pas de next orphelin).
const serveur = spawn("pnpm", ["exec", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
  detached: true,
  env: { ...process.env, DATABASE_URL, DATABASE_AUTH_TOKEN: "", WEBHOOK_SECRET: SECRET, APP_PASSWORD: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
// Next écrit ses erreurs tantôt sur stdout, tantôt sur stderr : on écoute les deux.
let journalServeur = "";
for (const flux of [serveur.stdout, serveur.stderr]) {
  flux.on("data", (morceau) => {
    journalServeur += morceau.toString();
  });
}

async function attendreServeur() {
  const echeance = Date.now() + DELAI_DEMARRAGE_MS;
  for (;;) {
    try {
      await fetch(`${BASE}/`);
      return;
    } catch {
      // pas encore en écoute
    }
    if (Date.now() > echeance) throw new Error("serveur jamais prêt");
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function lirePage(chemin) {
  const reponse = await fetch(`${BASE}${chemin}`);
  const html = await reponse.text();
  if (reponse.status !== 200) throw new Error(`${chemin} répond ${reponse.status}`);
  if (html.length < TAILLE_MIN_HTML) throw new Error(`${chemin} : réponse vide`);
  return html;
}

function envoyerWebhook(corps, signature) {
  return fetch(`${BASE}/api/webhooks`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-signature": signature },
    body: corps,
  });
}

const signer = (corps) => `sha256=${createHmac("sha256", SECRET).update(corps).digest("hex")}`;

// Le lead est posé directement dans la base temporaire : sa création passe par une action serveur,
// qu'un simple fetch ne sait pas appeler. La première page lue a déjà appliqué les migrations.
async function creerLead() {
  const client = createClient({ url: DATABASE_URL });
  const maintenant = new Date().toISOString();
  await client.execute({
    sql: "INSERT INTO leads (id, name, email, stage, created_at) VALUES (?, ?, ?, 'email_envoye', ?)",
    args: [LEAD.id, LEAD.name, LEAD.email, maintenant],
  });
  client.close();
}

async function parcoursWebhook() {
  await creerLead();
  const evenement = JSON.stringify({
    id: "smoke-evt-1",
    type: "email_ouvert",
    leadId: LEAD.id,
    occurredAt: new Date().toISOString(),
  });
  const recu = await envoyerWebhook(evenement, signer(evenement));
  if (recu.status !== 200) throw new Error(`webhook signé refusé (${recu.status})`);
  // La preuve en base d'abord (le texte de la page peut exister ailleurs), puis l'affichage.
  const client = createClient({ url: DATABASE_URL });
  const { rows } = await client.execute({ sql: "SELECT stage FROM leads WHERE id = ?", args: [LEAD.id] });
  client.close();
  if (rows[0]?.stage !== "ouvert") throw new Error(`parcours webhook : étape « ${rows[0]?.stage} » en base, « ouvert » attendu`);
  const fiche = await lirePage(`/?lead=${LEAD.id}`);
  for (const attendu of [LEAD.name, "E-mail ouvert"]) {
    if (!fiche.includes(attendu)) throw new Error(`parcours webhook : « ${attendu} » absent de la fiche`);
  }
}

async function refusWebhook() {
  const evenement = JSON.stringify({ id: "smoke-evt-2", type: "email_ouvert", leadId: LEAD.id, occurredAt: new Date().toISOString() });
  const faux = await envoyerWebhook(evenement, "sha256=faux");
  if (faux.status !== 401) throw new Error(`signature fausse : 401 attendu, reçu ${faux.status}`);
  const gros = "x".repeat(TROP_GROS);
  const refuse = await envoyerWebhook(gros, signer(gros));
  if (refuse.status !== 413) throw new Error(`corps trop gros : 413 attendu, reçu ${refuse.status}`);
}

let code = 1;
try {
  await attendreServeur();
  await lirePage("/");
  await parcoursWebhook();
  await refusWebhook();
  for (const chemin of PAGES) await lirePage(chemin);
  await new Promise((r) => setTimeout(r, DELAI_JOURNAL_MS));
  if (/error/i.test(journalServeur)) {
    throw new Error(`le serveur a écrit des erreurs :\n${journalServeur.slice(-2000)}`);
  }
  console.log(`Smoke OK : ${PAGES.length} page(s), parcours webhook, refus 401 et 413, aucune erreur serveur (port ${PORT}).`);
  code = 0;
} catch (erreur) {
  console.error(`Smoke ÉCHEC : ${erreur.message}`);
} finally {
  try {
    process.kill(-serveur.pid, "SIGTERM");
  } catch {
    // déjà arrêté
  }
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
