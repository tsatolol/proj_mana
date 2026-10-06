import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
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
    // CI runs against the production build; locally the dev server is reused.
    command: isCI ? "pnpm start:standalone" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
