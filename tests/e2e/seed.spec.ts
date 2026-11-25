import { test, expect } from "@playwright/test";

// R3 browser subset, selected by the user: anonymous navigation must not expose patient views.
// HTTP/RLS isolation remains covered separately; this checks the browser redirect and login UI.
test.use({ storageState: { cookies: [], origins: [] } });

test("R3: signed-out timeline navigation shows sign-in instead of patient data", async ({ page }) => {
  await page.goto("/dashboard/timeline");

  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.getByRole("heading", { name: "Zaloguj się", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Adres e-mail", exact: true })).toBeVisible();
  await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zaloguj się", exact: true })).toBeVisible();

  // No data is created. The isolated, signed-out context is disposed by Playwright.
  // Do not sign out the shared setup account: that would revoke other tests' sessions.
});
