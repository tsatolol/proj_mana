import { expect, test } from "@playwright/test";

import { AUTH_STATE, E2E_USERS } from "./env";

test.use({ storageState: AUTH_STATE.member });

test("メンバーはプロジェクト画面を表示できる", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByTestId("current-user")).toHaveText(E2E_USERS.member.name);
  await expect(page.getByRole("heading", { level: 1, name: "プロジェクト" })).toBeVisible();
});

test("ログイン済みでログイン画面を開くとプロジェクト画面に移動する", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/projects$/);
});

test("メンバーにはユーザー管理が表示されず、直接開いても操作できない", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: "ユーザー管理" })).toHaveCount(0);

  await page.goto("/settings/users");
  await expect(page.getByText("このページを表示する権限がありません。")).toBeVisible();
  await expect(page.getByRole("button", { name: "招待する" })).toHaveCount(0);
});
