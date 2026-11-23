import type { NextConfig } from "next";

// #16 : politique de sécurité du contenu. La page ne charge que ce qui vient de l'app (polices auto-hébergées
// par next/font comprises). Sans nonce, pour garder le rendu statique partiel : Next et le script du thème
// ont besoin des scripts en ligne. eval n'est permis qu'en développement (messages d'erreur de React).
// Pas d'upgrade-insecure-requests : `pnpm start` en local tourne en http (HSTS couvre déjà la prod).
const isDev = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // #33 : en-têtes de protection sur toutes les pages (CSP : #16). Aucun site ne peut afficher l'app dans un cadre
  // (piège au clic), le navigateur ne devine pas le type des fichiers, et l'adresse complète des pages
  // n'est pas transmise aux autres sites.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
