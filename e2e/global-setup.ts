import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

import { assertTestDatabaseUrl } from "../src/test/database-url";

import { AUTH_STATE, E2E_USERS, e2eDatabaseUrl } from "./env";

// Signs users in without Google OAuth: users and database sessions are inserted
// directly and the Auth.js session cookie is written to Playwright storage state.
// Nothing in the application itself bypasses authentication.

const SESSION_COOKIE = "authjs.session-token"; // non-secure name, since E2E runs on http
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export default async function globalSetup() {
  assertTestDatabaseUrl(e2eDatabaseUrl);

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl },
    stdio: "inherit",
  });

  const client = new pg.Client({ connectionString: e2eDatabaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    const tables = rows.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
    await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);

    for (const user of Object.values(E2E_USERS)) {
      await client.query(
        `INSERT INTO "User" (id, email, name, role, "updatedAt") VALUES ($1, $2, $3, $4, now())`,
        [user.id, user.email, user.name, user.role],
      );
    }

    const expires = new Date(Date.now() + SESSION_TTL_MS);
    for (const role of ["admin", "member", "leaver"] as const) {
      const token = randomBytes(32).toString("hex");
      await client.query(
        `INSERT INTO "Session" ("sessionToken", "userId", expires, "updatedAt")
         VALUES ($1, $2, $3, now())`,
        [token, E2E_USERS[role].id, expires],
      );
      await mkdir(path.dirname(AUTH_STATE[role]), { recursive: true });
      await writeFile(
        AUTH_STATE[role],
        JSON.stringify({
          cookies: [
            {
              name: SESSION_COOKIE,
              value: token,
              domain: "localhost",
              path: "/",
              expires: Math.floor(expires.getTime() / 1000),
              httpOnly: true,
              secure: false,
              sameSite: "Lax",
            },
          ],
          origins: [],
        }),
      );
    }
  } finally {
    await client.end();
  }
}
