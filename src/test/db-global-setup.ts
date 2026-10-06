import { execFileSync } from "node:child_process";

import { assertTestDatabaseUrl } from "./database-url";
import { testDatabaseUrl } from "./env";

// Applies migrations to the test database once before the db test project runs.
export default function setup() {
  // Global setup runs in the main process, where `test.env` is not applied.
  const url = testDatabaseUrl;
  assertTestDatabaseUrl(url);
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
