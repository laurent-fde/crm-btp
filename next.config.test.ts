// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

// #33 : en-têtes de protection envoyés sur toutes les pages.
describe("next.config · en-têtes HTTP de protection", () => {
  it("interdit l'affichage dans un cadre, le devinage de type et limite le référent, sur toutes les pages", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === "/:path*");
    const headers = Object.fromEntries((all?.headers ?? []).map(({ key, value }) => [key, value]));

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    // Contrôle de sécurité : HTTPS imposé par le navigateur, même sur un domaine personnalisé.
    expect(headers["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
  });

  // #16 : la CSP limite l'origine de tout ce que la page charge à l'app elle-même.
  it("envoie une CSP qui limite scripts, styles, polices, objets, <base> et formulaires à l'app", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const csp = rules.find((rule) => rule.source === "/:path*")?.headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    const directives = Object.fromEntries(
      csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values.join(" ")];
      }),
    );

    expect(directives).toMatchObject({
      "default-src": "'self'",
      "object-src": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
      "frame-ancestors": "'none'",
      "font-src": "'self'",
      "img-src": "'self' blob: data:",
      "style-src": "'self' 'unsafe-inline'",
    });
    // Scripts : l'app seule, plus les scripts en ligne de Next (le thème, le flux RSC). eval seulement en développement.
    expect(directives["script-src"]).toBe("'self' 'unsafe-inline'");
  });
});

