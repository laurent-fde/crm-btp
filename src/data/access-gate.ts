import { createHash, timingSafeEqual } from "node:crypto";

// Verrou de la démo en ligne : un mot de passe (APP_PASSWORD) sur toute l'app, en authentification HTTP Basic.
// Ce n'est pas une gestion de comptes : un seul mot de passe partagé, l'identifiant saisi est ignoré.
const DEPLOYED = new Set(["production", "preview"]);

// En local, sans APP_PASSWORD : rien n'est verrouillé. Sur Vercel, l'oublier doit planter clairement
// plutôt que publier les données sans protection.
export function resolveAccessPassword(env: Record<string, string | undefined>): string | null {
  if (env.APP_PASSWORD) return env.APP_PASSWORD;
  if (env.VERCEL_ENV && DEPLOYED.has(env.VERCEL_ENV)) {
    throw new Error("APP_PASSWORD manquant : ajoute-le dans les variables du projet Vercel.");
  }
  return null;
}

// Empreintes de même longueur : la comparaison prend le même temps, que le mot de passe soit proche ou non.
const digest = (value: string) => createHash("sha256").update(value).digest();

export function isAuthorized(authorization: string | null, password: string): boolean {
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/.exec(authorization ?? "");
  if (!match) return false;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;
  return timingSafeEqual(digest(decoded.slice(separator + 1)), digest(password));
}

export type AccessResult = { ok: true } | { ok: false; reason: "password" | "config"; message: string };

// Lu à chaque requête : changer APP_PASSWORD dans Vercel vaut dès le déploiement suivant.
// Revue #12 : une variable oubliée donne une réponse qui dit pourquoi (au lieu d'une erreur 500 muette).
export function checkAccess(authorization: string | null): AccessResult {
  let password: string | null;
  try {
    password = resolveAccessPassword(process.env);
  } catch {
    return { ok: false, reason: "config", message: "Configuration incomplète : APP_PASSWORD manquant." };
  }
  if (password === null || isAuthorized(authorization, password)) return { ok: true };
  return { ok: false, reason: "password", message: "Mot de passe requis." };
}
