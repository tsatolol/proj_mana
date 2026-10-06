import type { PrismaClient } from "@/generated/prisma/client";

import { assertTestDatabaseUrl } from "./database-url";

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
