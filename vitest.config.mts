import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { testDatabaseUrl } from "./src/test/env";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.db.test.ts"],
        },
      },
      {
        // Tests that hit a real PostgreSQL database (docker compose / CI service).
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          env: { DATABASE_URL: testDatabaseUrl },
          globalSetup: ["src/test/db-global-setup.ts"],
          // Tests share one database, so run files sequentially.
          fileParallelism: false,
        },
      },
    ],
  },
});
