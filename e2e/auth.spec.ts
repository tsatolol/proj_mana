import { expect, test } from "@playwright/test";

import { AUTH_STATE, E2E_USERS } from "./env";

test.describe("未ログイン", () => {
  test("保護されたページはログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/projects");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page).toHaveTitle("ログイン | proj_mana");
    await expect(page.getByRole("button", { name: "Google でログイン" })).toBeVisible();
  });

  test("トップページもログイン画面にリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("ログインを拒否されたときはメッセージを表示する", async ({ page }) => {
    await page.goto("/login?error=AccessDenied");
    await expect(page.getByText("このアカウントではログインできません。")).toBeVisible();
  });
});

test.describe("ログアウト", () => {
  test.use({ storageState: AUTH_STATE.leaver });

  test("ログアウトするとログイン画面に戻り、再度アクセスできなくなる", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByTestId("current-user")).toHaveText(E2E_USERS.leaver.name);

    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login$/);
  });
});
