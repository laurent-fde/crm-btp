// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isAuthorized, resolveAccessPassword } from "./access-gate";

const basic = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("données · access-gate · resolveAccessPassword", () => {
  it("prend APP_PASSWORD quand il est défini", () => {
    expect(resolveAccessPassword({ APP_PASSWORD: "s3cret" })).toBe("s3cret");
  });

  it("ne verrouille rien en local quand il manque (ou est vide)", () => {
    expect(resolveAccessPassword({})).toBeNull();
    expect(resolveAccessPassword({ APP_PASSWORD: "" })).toBeNull();
  });

  it("lève une erreur sur un déploiement Vercel sans mot de passe", () => {
    expect(() => resolveAccessPassword({ VERCEL_ENV: "production" })).toThrow(/APP_PASSWORD manquant/);
    expect(() => resolveAccessPassword({ VERCEL_ENV: "preview" })).toThrow(/APP_PASSWORD manquant/);
  });
});

describe("données · access-gate · isAuthorized", () => {
  it("accepte le bon mot de passe, quel que soit l'identifiant", () => {
    expect(isAuthorized(basic("laurent", "s3cret"), "s3cret")).toBe(true);
    expect(isAuthorized(basic("", "s3cret"), "s3cret")).toBe(true);
    expect(isAuthorized(basic("demo", "pa:ss"), "pa:ss")).toBe(true);
  });

  it("refuse une demande sans mot de passe, mal formée ou avec un mauvais mot de passe", () => {
    expect(isAuthorized(null, "s3cret")).toBe(false);
    expect(isAuthorized("", "s3cret")).toBe(false);
    expect(isAuthorized("Bearer abc", "s3cret")).toBe(false);
    expect(isAuthorized("Basic pas-du-base64!", "s3cret")).toBe(false);
    expect(isAuthorized(basic("laurent", "s3cre"), "s3cret")).toBe(false);
    expect(isAuthorized(basic("laurent", "s3cret "), "s3cret")).toBe(false);
  });
});
