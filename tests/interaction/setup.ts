import { cleanup } from "@testing-library/react/pure";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { installRelativeFetch, server } from "./http";

let restoreFetch: (() => void) | undefined;

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

beforeEach(() => {
  restoreFetch = installRelativeFetch();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  restoreFetch?.();
  restoreFetch = undefined;
});

afterAll(() => {
  server.close();
});
