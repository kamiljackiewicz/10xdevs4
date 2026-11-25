import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthApiError,
  AuthInvalidJwtError,
  AuthRefreshDiscardedError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
} from "@supabase/supabase-js";
import { buildFailureEvent, createFailureReporter, isUnexpectedAuthError } from "../src/lib/observability.ts";

const UUID = "73ab4831-651d-4a9c-bc57-4c16683390e2";
const SECRET = "seeded-private-patient@example.test/token=secret";
const context = (error, extra = {}) => ({
  operation: "auth.get_user",
  kind: "result",
  requestId: UUID,
  error,
  ...extra,
});

function capture(input) {
  const lines = [];
  createFailureReporter((...args) => lines.push(args))(input);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].length, 1);
  assert.equal(typeof lines[0][0], "string");
  assert.equal(lines[0][0].includes(SECRET), false);
  return JSON.parse(lines[0][0]);
}

test("installed SDK session controls are expected, including benign refresh discard", () => {
  for (const error of [
    null,
    undefined,
    new AuthSessionMissingError(),
    new AuthInvalidJwtError(SECRET),
    new AuthRefreshDiscardedError(SECRET),
    ...[
      "session_not_found",
      "session_expired",
      "refresh_token_not_found",
      "refresh_token_already_used",
      "bad_jwt",
      "invalid_jwt",
    ].map((code) => new AuthApiError(SECRET, 401, code)),
  ])
    assert.equal(isUnexpectedAuthError(error), false);
});

test("transport, upstream outages and unknown errors remain incidents", () => {
  for (const error of [
    new AuthRetryableFetchError(SECRET, 0),
    new AuthRetryableFetchError(SECRET, 503),
    new AuthApiError(SECRET, 500, "unexpected_failure"),
    new AuthApiError(SECRET, 400, "not_a_session_code"),
    new AuthApiError(SECRET, 401, undefined),
    new AuthUnknownError(SECRET, new TypeError(SECRET)),
    new TypeError(SECRET),
    {},
    SECRET,
    false,
  ])
    assert.equal(isUnexpectedAuthError(error), true);
});

test("operational failures override contradictory expected-session markers", () => {
  for (const error of [
    { name: "AuthSessionMissingError", status: 0 },
    { name: "AuthInvalidJwtError", status: 503 },
    { name: "AuthRefreshDiscardedError", status: 500 },
    { code: "session_not_found", status: 0 },
    { code: "invalid_jwt", status: 502 },
    { name: "AuthRetryableFetchError", code: "bad_jwt", status: 400 },
    { name: "TypeError", code: "session_expired" },
    { name: "AbortError", code: "refresh_token_not_found" },
  ])
    assert.equal(isUnexpectedAuthError(error), true);
});

test("schema preserves controlled SDK fields and uses fixed operation callsites", () => {
  assert.deepEqual(capture(context(new AuthApiError(SECRET, 503, "unexpected_failure"))), {
    event: "application_failure",
    version: 1,
    operation: "auth.get_user",
    kind: "result",
    callsite: "middleware.auth",
    error_type: "AuthApiError",
    request_id: UUID,
    upstream_code: "unexpected_failure",
    upstream_status: 503,
  });
  for (const [operation, callsite] of [
    ["patient.read", "dashboard.profile"],
    ["timeline.profile.read", "timeline.profile"],
    ["timeline.notes.read", "timeline.notes"],
  ]) {
    const event = capture(context({}, { operation, kind: "exception", callsite: SECRET }));
    assert.equal(event.operation, operation);
    assert.equal(event.callsite, callsite);
    assert.equal(event.kind, "exception");
    assert.equal(event.error_type, "unknown");
  }
});

test("allowlists reject arbitrary values without string conversion", () => {
  const hostilePrimitive = {
    toString() {
      throw new Error("must not coerce");
    },
  };
  for (const value of [SECRET, "PGRST999", "AUTH_CUSTOM", 500, hostilePrimitive]) {
    const event = capture(context({ name: value, code: value }));
    assert.equal(event.error_type, "unknown");
    assert.equal(event.upstream_code, "unknown");
  }
  assert.equal(capture(context({ code: "PGRST003", status: 504 })).upstream_code, "PGRST003");
});

test("only UUID v4 request IDs and integer HTTP error statuses reach the output", () => {
  for (const requestId of [SECRET, "", "73ab4831-651d-1a9c-bc57-4c16683390e2", {}, null]) {
    assert.equal(Object.hasOwn(capture(context({}, { requestId })), "request_id"), false);
  }
  for (const status of [0, 200, 399, 600, 500.5, "500", NaN, Infinity, null]) {
    assert.equal(Object.hasOwn(capture(context({ status })), "upstream_status"), false);
  }
  for (const status of [400, 401, 500, 599]) {
    assert.equal(capture(context({ status })).upstream_status, status);
  }
  assert.equal(capture(context({ status: 400 }, { upstreamStatus: 503 })).upstream_status, 503);
  assert.equal(Object.hasOwn(capture(context({ status: 500 }, { upstreamStatus: 0 })), "upstream_status"), false);
});

test("raw sensitive fields, cycles and custom toJSON never reach serialized output", () => {
  let serializationCalls = 0;
  const error = {
    name: SECRET,
    code: SECRET,
    message: SECRET,
    details: SECRET,
    hint: SECRET,
    stack: SECRET,
    originalError: { token: SECRET },
    toJSON() {
      serializationCalls += 1;
      return SECRET;
    },
  };
  error.cause = error;
  assert.equal(capture(context(error)).error_type, "unknown");
  assert.equal(serializationCalls, 0);
});

test("own and inherited accessors are never evaluated, including supported fields", () => {
  let getterCalls = 0;
  const error = Object.create({
    get name() {
      getterCalls += 1;
      return "AuthSessionMissingError";
    },
  });
  for (const key of ["code", "status", "message", "details", "stack", "cause", "toJSON"]) {
    Object.defineProperty(error, key, {
      get() {
        getterCalls += 1;
        throw new Error(SECRET);
      },
    });
  }
  assert.equal(isUnexpectedAuthError(error), true);
  const event = capture(context(error));
  assert.equal(event.error_type, "unknown");
  assert.equal(Object.hasOwn(event, "upstream_code"), false);
  assert.equal(getterCalls, 0);
  const input = context({});
  Object.defineProperty(input, "requestId", {
    get() {
      getterCalls += 1;
      return SECRET;
    },
  });
  assert.equal(Object.hasOwn(capture(input), "request_id"), false);
  assert.equal(getterCalls, 0);
});

test("normalization failure emits a minimal constant fallback with safe request correlation", () => {
  const error = new Proxy(
    {},
    {
      getOwnPropertyDescriptor() {
        throw new Error(SECRET);
      },
    },
  );
  assert.equal(isUnexpectedAuthError(error), true);
  assert.deepEqual(capture(context(error)), { event: "diagnostic_normalization_failed", version: 1, request_id: UUID });
  assert.deepEqual(capture(context(error, { requestId: SECRET })), {
    event: "diagnostic_normalization_failed",
    version: 1,
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  assert.deepEqual(capture(revoked.proxy), { event: "diagnostic_normalization_failed", version: 1 });
});

test("runtime operation and kind boundary cannot inject arbitrary context", () => {
  for (const extra of [{ operation: SECRET }, { operation: "__proto__" }, { kind: SECRET }]) {
    assert.deepEqual(capture(context({}, extra)), {
      event: "diagnostic_normalization_failed",
      version: 1,
      request_id: UUID,
    });
  }
});

test("nullish errors produce no records and sink failures do not escape or retry", () => {
  let emissions = 0;
  const report = createFailureReporter(() => {
    emissions += 1;
    throw new Error(SECRET);
  });
  for (const error of [null, undefined]) {
    assert.equal(buildFailureEvent(context(error)), null);
    assert.doesNotThrow(() => report(context(error)));
  }
  assert.equal(emissions, 0);
  assert.doesNotThrow(() => report(context({})));
  assert.equal(emissions, 1);
  const error = new Proxy(
    {},
    {
      getOwnPropertyDescriptor() {
        throw new Error(SECRET);
      },
    },
  );
  assert.doesNotThrow(() => report(context(error)));
  assert.equal(emissions, 2);
});
