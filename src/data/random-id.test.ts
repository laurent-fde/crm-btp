import { describe, expect, it } from "vitest";
import { randomIds } from "./random-id";

describe("données · random-id", () => {
  it("fabrique des identifiants uniques au format UUID", () => {
    const a = randomIds.next();
    const b = randomIds.next();

    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
