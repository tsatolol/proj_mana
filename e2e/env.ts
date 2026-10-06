// Shared settings for Playwright config and global setup.
export const e2ePort = Number(process.env.E2E_PORT ?? 3100);
export const e2eBaseURL = `http://localhost:${e2ePort}`;

// E2E uses its own database so it never touches development data.
export const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgresql://proj_mana:proj_mana@localhost:5432/proj_mana_e2e";

export const AUTH_STATE = {
  admin: "e2e/.auth/admin.json",
  member: "e2e/.auth/member.json",
  leaver: "e2e/.auth/leaver.json",
} as const;

export const E2E_USERS = {
  admin: { id: "e2e-admin", email: "admin@example.com", name: "管理者テスト", role: "ADMIN" },
  member: { id: "e2e-member", email: "member@example.com", name: "メンバーテスト", role: "MEMBER" },
  // Target of role change / deactivation tests (has no session).
  other: { id: "e2e-other", email: "other@example.com", name: "その他ユーザー", role: "MEMBER" },
  // Signs out in the logout test, so its session is not shared with other tests.
  leaver: { id: "e2e-leaver", email: "leaver@example.com", name: "ログアウト確認", role: "MEMBER" },
} as const;
