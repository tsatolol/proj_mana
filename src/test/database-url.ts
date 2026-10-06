// Guard against wiping a development or production database by mistake.
// Test databases must be named *_test (Vitest) or *_e2e (Playwright).
export function assertTestDatabaseUrl(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error("DATABASE_URL is not set for tests");
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/_(test|e2e)$/.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}"`);
  }
}
