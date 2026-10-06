import { expect, test } from "@playwright/test";

import { AUTH_STATE, E2E_USERS } from "./env";

test.use({ storageState: AUTH_STATE.admin });

test("管理者はユーザーを招待し、招待を取り消せる", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: "ユーザー管理" }).click();
  await expect(page).toHaveURL(/\/settings\/users$/);

  await page.getByLabel("メールアドレス").fill("Guest@Partner.test");
  await page.getByRole("button", { name: "招待する" }).click();

  await expect(page.getByRole("status")).toHaveText("guest@partner.test を招待しました");
  const row = page.getByRole("row", { name: /guest@partner\.test/ });
  await expect(row).toContainText("メンバー");

  await page.getByRole("button", { name: "guest@partner.test の招待を取り消す" }).click();
  await expect(row).toHaveCount(0);
});

test("既存ユーザーのメールアドレスは招待できない", async ({ page }) => {
  await page.goto("/settings/users");

  await page.getByLabel("メールアドレス").fill(E2E_USERS.member.email);
  await page.getByRole("button", { name: "招待する" }).click();

  await expect(page.getByText("このメールアドレスのユーザーは既に登録されています")).toBeVisible();
});

test("管理者は他のユーザーのロール変更と無効化ができる", async ({ page }) => {
  const other = E2E_USERS.other;
  await page.goto("/settings/users");
  const row = page.getByTestId(`user-row-${other.email}`);

  await row.getByRole("combobox", { name: `${other.name} のロール` }).click();
  await page.getByRole("option", { name: "管理者" }).click();
  await page.reload();
  await expect(row.getByRole("combobox")).toHaveText("管理者");

  await row.getByRole("button", { name: "無効化" }).click();
  await expect(row).toContainText("無効");
  await row.getByRole("button", { name: "有効化" }).click();
  await expect(row).toContainText("有効");
});

test("管理者は自分自身のロールを変更できない", async ({ page }) => {
  await page.goto("/settings/users");
  const row = page.getByTestId(`user-row-${E2E_USERS.admin.email}`);

  await expect(row.getByRole("combobox")).toBeDisabled();
  await expect(row.getByRole("button", { name: "無効化" })).toHaveCount(0);
});
