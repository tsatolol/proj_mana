import { describe, expect, it } from "vitest";

import { assertTestDatabaseUrl } from "./db";

describe("assertTestDatabaseUrl", () => {
  it("accepts a database whose name ends with _test", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://u:p@localhost:5432/proj_mana_test"),
    ).not.toThrow();
  });

  it("rejects a non-test database", () => {
    expect(() => assertTestDatabaseUrl("postgresql://u:p@localhost:5432/proj_mana")).toThrow(
      /non-test database/,
    );
  });

  it("rejects a missing url", () => {
    expect(() => assertTestDatabaseUrl(undefined)).toThrow(/not set/);
  });
});
