import { setupServer } from "msw/node";

export const server = setupServer();

// Install only after MSW starts so every request still crosses its HTTP boundary.
export function installRelativeFetch(): () => void {
  const interceptedFetch = globalThis.fetch;
  globalThis.fetch = (input, init) =>
    interceptedFetch(typeof input === "string" ? new globalThis.URL(input, window.location.href) : input, init);

  return () => {
    globalThis.fetch = interceptedFetch;
  };
}
