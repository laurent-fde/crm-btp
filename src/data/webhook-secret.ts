// Données · secret partagé des webhooks, lu dans l'environnement par la composition.
// || et non ?? : un WEBHOOK_SECRET vide (copié de .env.example) compte comme absent.
// Sur un déploiement Vercel, un secret manquant doit planter clairement plutôt que d'accepter un secret connu.

export const DEV_WEBHOOK_SECRET = "secret-de-developpement-local";

const DEPLOYED = new Set(["production", "preview"]);

export function resolveWebhookSecret(env: Record<string, string | undefined>): string {
  if (env.WEBHOOK_SECRET) return env.WEBHOOK_SECRET;
  if (env.VERCEL_ENV && DEPLOYED.has(env.VERCEL_ENV)) {
    throw new Error("WEBHOOK_SECRET manquant : ajoute-le dans les variables du projet Vercel (ex. : openssl rand -hex 32).");
  }
  return DEV_WEBHOOK_SECRET;
}
