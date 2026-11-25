import { test as setup, expect } from "@playwright/test";

setup("sign in once and save the dedicated E2E session", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) {
    throw new Error("Set E2E_USERNAME and E2E_PASSWORD in ignored .env.e2e (see context/foundation/test-stack.md).");
  }

  await page.goto("/auth/signin");
  // Retrying login is idempotent; clearing first also handles pre-hydration input loss.
  await expect(async () => {
    await page.getByRole("textbox", { name: "Adres e-mail", exact: true }).fill("");
    await page.getByRole("textbox", { name: "Adres e-mail", exact: true }).fill(username);
    await page.getByLabel("Hasło", { exact: true }).fill("");
    await page.getByLabel("Hasło", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Zaloguj się", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5_000 });
  }).toPass({ timeout: 25_000 });
  await expect(page.getByRole("link", { name: "Otwórz profil", exact: true })).toBeVisible();
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
