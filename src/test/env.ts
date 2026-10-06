// Database used by the db test project. Must point at a *_test database.
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://proj_mana:proj_mana@localhost:5432/proj_mana_test";
