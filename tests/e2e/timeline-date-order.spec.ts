// risk: context/foundation/test-plan.md R4 — facet: persisted dates/order in the rendered timeline.
// seed: tests/e2e/seed.spec.ts; standalone scenario explicitly selected by the user.
import { test, expect } from "./isolated-account";

test.describe("R4: timeline dates and chronology", () => {
  test("notes retain their calendar days and newest-first order after reload", async ({
    page,
    baseURL,
    identityToken,
  }) => {
    if (!baseURL) throw new Error("E2E baseURL is required");
    // Set up an owned profile through the real app API, isolated from all other runs.
    const profile = await page.request.post("/api/patient", {
      headers: { Origin: new URL(baseURL).origin },
      data: { first_name: "E2E", last_name: identityToken, date_of_birth: "2000-01-01", sex: "female" },
    });
    expect(profile.status()).toBe(201);
    await page.goto("/dashboard/timeline");
    await expect(page.getByText("Brak notatek na osi czasu.", { exact: true })).toBeVisible();

    // Save the later day first, then the earlier leap day: insertion order must not win.
    const later = `${identityToken} later`;
    const earlier = `${identityToken} earlier`;
    for (const note of [
      { date: "2024-03-31", body: later },
      { date: "2024-02-29", body: earlier },
    ]) {
      // A working click that reveals the form is the hydration signal; never retry a write.
      await expect(async () => {
        await page.getByRole("button", { name: "Dodaj notatkę", exact: true }).click();
        await expect(page.getByRole("textbox", { name: "Notatka", exact: true })).toBeVisible();
      }).toPass({ timeout: 5_000 });
      await page.getByLabel("Data zdarzenia", { exact: true }).fill(note.date);
      await page.getByRole("textbox", { name: "Notatka", exact: true }).fill(note.body);
      const saved = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/timeline-notes" && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Zapisz notatkę", exact: true }).click();
      expect((await saved).status()).toBe(201);
      await expect(page.getByRole("listitem").filter({ hasText: note.body })).toBeVisible();
    }

    // Reload SSR data and assert the visible days and semantic list order, not just a page title.
    await page.reload();
    const notes = page.getByRole("listitem");
    await expect(notes).toHaveCount(2);
    await expect(notes.filter({ hasText: later }).getByText("31 marca 2024", { exact: true })).toBeVisible();
    await expect(notes.filter({ hasText: earlier }).getByText("29 lutego 2024", { exact: true })).toBeVisible();
    await expect(notes.getByRole("paragraph")).toHaveText([later, earlier]);

    // The test-scoped identity fixture always cleans up and asserts no profile/notes remain.
  });
});
