import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI does not load env files on its own. Locally we keep secrets in
// .env.local (see CLAUDE.md §6); in CI / Cloud Run the variables are already set.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not every command needs a database (e.g. `prisma generate` during
    // `pnpm install`), so a missing value is allowed here.
    url: process.env.DATABASE_URL,
  },
});
