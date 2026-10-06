import { describe, expect, it } from "vitest";

import { assertTestDatabaseUrl } from "./database-url";

describe("assertTestDatabaseUrl", () => {
  it("accepts databases whose name ends with _test or _e2e", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://u:p@localhost:5432/proj_mana_test"),
    ).not.toThrow();
    expect(() =>
      assertTestDatabaseUrl("postgresql://u:p@localhost:5432/proj_mana_e2e"),
    ).not.toThrow();
  });

  it("rejects a non-test database", () => {
    expect(() => assertTestDatabaseUrl("postgresql://u:p@localhost:5432/proj_mana")).toThrow(
      /non-test database/,
    );
    expect(() =>
      assertTestDatabaseUrl("postgresql://u:p@localhost:5432/proj_mana_testing"),
    ).toThrow(/non-test database/);
  });

  it("rejects a missing url", () => {
    expect(() => assertTestDatabaseUrl(undefined)).toThrow(/not set/);
  });
});
