// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "./db";
import { createExampleRepository } from "./example.repository";

describe("données · example.repository", () => {
  let db: Database | undefined;
  afterEach(() => db?.client.close());

  it("lit dans une vraie base libsql en mémoire", async () => {
    db = openDatabase(":memory:");

    expect(await createExampleRepository(db).findAll()).toEqual([{ id: "1", name: "Exemple" }]);
  });
});
