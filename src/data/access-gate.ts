import { createHash, timingSafeEqual } from "node:crypto";

// Verrou facultatif de la démo en ligne : un mot de passe (APP_PASSWORD) sur toute l'app, en authentification HTTP Basic.
// Ce n'est pas une gestion de comptes : un seul mot de passe partagé, l'identifiant saisi est ignoré.
// Sans APP_PASSWORD (en local comme sur Vercel), rien n'est verrouillé : il suffit d'ajouter la variable pour fermer l'app.
export function resolveAccessPassword(env: Record<string, string | undefined>): string | null {
  return env.APP_PASSWORD || null;
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

// Lu à chaque requête : changer APP_PASSWORD dans Vercel vaut dès le déploiement suivant.
export function checkAccess(authorization: string | null): boolean {
  const password = resolveAccessPassword(process.env);
  return password === null || isAuthorized(authorization, password);
}
