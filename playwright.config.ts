import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Credentials stay separate from the application's remote Supabase configuration.
if (existsSync(".env.e2e")) process.loadEnvFile(".env.e2e");

// Astro preview's documented default (also reported by `astro preview --help`).
const PORT = Number(process.env.E2E_PORT ?? 4321);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: "**/*.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Astro 7 must stay in the foreground so Playwright owns its lifecycle.
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
  },
});
