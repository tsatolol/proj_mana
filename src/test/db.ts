import type { PrismaClient } from "@/generated/prisma/client";

// Guard against wiping a development or production database by mistake.
export function assertTestDatabaseUrl(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error("DATABASE_URL is not set for db tests");
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to run db tests against non-test database "${dbName}"`);
  }
}

// Removes all rows from every application table (migrations history is kept).
export async function resetDatabase(db: PrismaClient): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
