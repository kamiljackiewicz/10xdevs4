import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost" } },
    include: ["tests/interaction/**/*.test.tsx"],
    setupFiles: ["./tests/interaction/setup.ts"],
    globals: false,
    passWithNoTests: false,
  },
});
