import { expect, test } from "@playwright/test";

test("トップページが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("proj_mana");
  await expect(page.getByRole("heading", { level: 1, name: "proj_mana" })).toBeVisible();
});
