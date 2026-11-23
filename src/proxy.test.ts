// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

const basic = (password: string) => `Basic ${Buffer.from(`demo:${password}`).toString("base64")}`;
const request = (authorization?: string) =>
  new NextRequest("https://crm-btp.example/", { headers: authorization ? { authorization } : {} });
const passes = (response: Response) => response.headers.get("x-middleware-next") === "1";

describe("proxy · verrou d'accès (mot de passe sur toute l'app)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("laisse tout passer en local, sans APP_PASSWORD", () => {
    vi.stubEnv("APP_PASSWORD", "");
    vi.stubEnv("VERCEL_ENV", "");

    expect(passes(proxy(request()))).toBe(true);
  });

  it("demande le mot de passe (401 + WWW-Authenticate) quand il manque ou est faux", () => {
    vi.stubEnv("APP_PASSWORD", "s3cret");

    for (const authorization of [undefined, basic("faux")]) {
      const response = proxy(request(authorization));
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe('Basic realm="CRM-BTP", charset="UTF-8"');
    }
  });

  it("laisse passer avec le bon mot de passe", () => {
    vi.stubEnv("APP_PASSWORD", "s3cret");

    expect(passes(proxy(request(basic("s3cret"))))).toBe(true);
  });

  // Revue #12 : APP_PASSWORD oublié sur Vercel → une 503 qui dit pourquoi, et rien ne passe.
  it("répond 503 avec la cause quand APP_PASSWORD manque sur Vercel", async () => {
    vi.stubEnv("APP_PASSWORD", "");
    vi.stubEnv("VERCEL_ENV", "production");

    const response = proxy(request(basic("n-importe-quoi")));
    expect(response.status).toBe(503);
    expect(await response.text()).toMatch(/APP_PASSWORD manquant/);
  });
});

// Le matcher appliqué comme Next.js l'applique (outil de test de Next).
describe("proxy · chemins protégés", () => {
  const matches = (path: string) => unstable_doesMiddlewareMatch({ config, url: `https://crm-btp.example${path}` });

  it("protège les pages, les actions et toute autre route", () => {
    for (const path of ["/", "/api/autre", "/api/webhooks-admin", "/api/webhooksX", "/api/webhooks2/export"]) {
      expect(matches(path), path).toBe(true);
    }
  });

  // Le webhook (lot 5) a sa propre signature : il reste joignable sans mot de passe. Les fichiers de Next aussi.
  it("laisse libres le webhook et les fichiers de Next", () => {
    for (const path of ["/api/webhooks", "/api/webhooks/actions", "/_next/static/chunk.js", "/_next/image", "/favicon.ico"]) {
      expect(matches(path), path).toBe(false);
    }
  });
});
