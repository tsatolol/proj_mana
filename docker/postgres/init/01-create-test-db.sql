-- Database for integration tests (Vitest).
CREATE DATABASE proj_mana_test OWNER proj_mana;
-- Database for E2E tests (Playwright). `prisma migrate deploy` also creates it if missing.
CREATE DATABASE proj_mana_e2e OWNER proj_mana;
