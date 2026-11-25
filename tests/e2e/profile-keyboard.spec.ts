// risk: context/foundation/test-plan.md R5 — facet: PL keyboard validation recovery and persisted edit.
// seed: tests/e2e/seed.spec.ts; standalone browser scenario, not the full R5 rollout phase.
import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./isolated-account";

async function tabTo(page: Page, target: Locator) {
  // A bounded traversal of this small view, using actual keyboard focus, never .focus().
  for (let step = 0; step < 20; step++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target, "control must be reachable with Tab").toBeFocused();
}

test.describe("R5: profile keyboard access", () => {
  test("a required surname can be corrected and saved using only the keyboard", async ({
    page,
    baseURL,
    identityToken,
  }) => {
    if (!baseURL) throw new Error("E2E baseURL is required");
    // Prepare an owned profile; the tested interaction is editing, not fixture creation.
    const originalSurname = `${identityToken}-original`;
    const correctedSurname = `${identityToken}-corrected`;
    const profile = await page.request.post("/api/patient", {
      headers: { Origin: new URL(baseURL).origin },
      data: { first_name: "Keyboard", last_name: originalSurname, date_of_birth: "2000-02-29", sex: "female" },
    });
    expect(profile.status()).toBe(201);
    await page.goto("/dashboard");
    // Astro's explicit hydration marker prevents Enter from hitting an inert SSR button.
    await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));

    // Reach and activate edit through the keyboard, then clear the required surname.
    await tabTo(page, page.getByRole("button", { name: "Edytuj profil", exact: true }));
    await page.keyboard.press("Enter");
    const surname = page.getByRole("textbox", { name: "Nazwisko", exact: true });
    await expect(surname).toBeVisible();
    await tabTo(page, surname);
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    const save = page.getByRole("button", { name: "Zapisz profil", exact: true });
    await tabTo(page, save);
    await page.keyboard.press("Enter");

    // Error is visible and exposed as the invalid control's accessible description.
    await expect(surname).toHaveAttribute("aria-invalid", "true");
    await expect(surname).toHaveAccessibleDescription("To pole jest wymagane.");
    await expect(page.getByText("To pole jest wymagane.", { exact: true })).toBeVisible();

    // Return by Tab, correct the error, and submit once using Enter.
    await tabTo(page, surname);
    await page.keyboard.type(correctedSurname);
    await expect(surname).toHaveAttribute("aria-invalid", "false");
    await tabTo(page, save);
    const saved = page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/patient" && response.request().method() === "PATCH",
    );
    await page.keyboard.press("Enter");
    expect((await saved).status()).toBe(200);
    await expect(page.getByText(correctedSurname, { exact: true })).toBeVisible();

    // Re-read persisted data; unchanged date/name and corrected surname must survive reload.
    await page.reload();
    const details = page.getByRole("region", { name: "Profil pacjenta", exact: true });
    await expect(details.getByRole("definition")).toHaveText([
      "Keyboard",
      correctedSurname,
      "29 lutego 2000",
      "Kobieta",
    ]);
    await expect(details.getByText(originalSurname, { exact: true })).toHaveCount(0);
    // The isolated-account fixture always deletes this identity and checks for data leftovers.
  });
});
