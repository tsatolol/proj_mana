import { defineConfig, devices } from "@playwright/test";

import { e2eBaseURL, e2eDatabaseUrl, e2ePort } from "./e2e/env";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: e2eBaseURL,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Allows using a pre-installed browser instead of `playwright install`.
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        },
      },
    },
  ],
  webServer: {
    // CI runs against the production build; locally a dedicated dev server is started.
    command: isCI ? "pnpm start:standalone" : "pnpm dev --port " + e2ePort,
    url: `${e2eBaseURL}/login`,
    // Never reuse a server: it might be connected to the development database.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(e2ePort),
      DATABASE_URL: e2eDatabaseUrl,
      AUTH_URL: e2eBaseURL,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-do-not-use-in-production",
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? "e2e-dummy-client-id",
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? "e2e-dummy-client-secret",
    },
  },
});
