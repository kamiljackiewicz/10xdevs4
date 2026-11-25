const CALLSITES = {
  "auth.get_user": "middleware.auth",
  "patient.read": "dashboard.profile",
  "timeline.profile.read": "timeline.profile",
  "timeline.notes.read": "timeline.notes",
} as const;

export type FailureOperation = keyof typeof CALLSITES;

export interface FailureInput {
  operation: FailureOperation;
  kind: "result" | "exception";
  requestId: string;
  error: unknown;
  upstreamStatus?: number;
}

export interface FailureEvent {
  event: "application_failure";
  version: 1;
  operation: FailureOperation;
  kind: "result" | "exception";
  request_id?: string;
  callsite: (typeof CALLSITES)[FailureOperation];
  error_type: string;
  upstream_code?: string;
  upstream_status?: number;
}

const EXPECTED_NAMES = new Set(["AuthSessionMissingError", "AuthInvalidJwtError", "AuthRefreshDiscardedError"]);
const EXPECTED_CODES = new Set([
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
  "invalid_jwt",
]);
const ERROR_TYPES = new Set([
  ...EXPECTED_NAMES,
  "Error",
  "TypeError",
  "AbortError",
  "AuthError",
  "AuthApiError",
  "AuthUnknownError",
  "AuthRetryableFetchError",
  "AuthInvalidTokenResponseError",
  "PostgrestError",
]);
const UPSTREAM_CODES = new Set([
  ...EXPECTED_CODES,
  "unexpected_failure",
  "request_timeout",
  "over_request_rate_limit",
  "PGRST000",
  "PGRST001",
  "PGRST002",
  "PGRST003",
  "PGRST116",
  "PGRST204",
  "PGRST205",
  "42501",
  "57014",
  "08000",
  "08003",
  "08006",
  "53300",
]);

// SDK errors store these fields on the instance. Never evaluate accessors,
// inspect nested errors, or use SDK toJSON(), which includes private messages.
function ownData(input: unknown, key: string): unknown {
  if (input === null || (typeof input !== "object" && typeof input !== "function")) return undefined;
  const descriptor: TypedPropertyDescriptor<unknown> | undefined = Object.getOwnPropertyDescriptor(input, key);
  return descriptor && Object.hasOwn(descriptor, "value") ? descriptor.value : undefined;
}

function requestId(input: unknown): string | undefined {
  return typeof input === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)
    ? input
    : undefined;
}

function httpErrorStatus(input: unknown): number | undefined {
  return typeof input === "number" && Number.isInteger(input) && input >= 400 && input <= 599 ? input : undefined;
}

function allowed(input: unknown, values: ReadonlySet<string>): string {
  return typeof input === "string" && values.has(input) ? input : "unknown";
}

export function isUnexpectedAuthError(error: unknown): boolean {
  if (error === null || error === undefined) return false;
  try {
    const name = ownData(error, "name");
    const code = ownData(error, "code");
    const status = ownData(error, "status");
    // Operational failures take precedence over contradictory session markers.
    if (
      status === 0 ||
      (typeof status === "number" && status >= 500 && status <= 599) ||
      name === "AuthRetryableFetchError" ||
      name === "TypeError" ||
      name === "AbortError"
    )
      return true;
    return !(
      (typeof name === "string" && EXPECTED_NAMES.has(name)) ||
      (typeof code === "string" && EXPECTED_CODES.has(code))
    );
  } catch {
    // Uninspectable errors are incidents too; the reporter emits a safe fallback.
    return true;
  }
}

/** Constructs only controlled primitives; it deliberately does not retain a stack. */
export function buildFailureEvent(input: FailureInput): FailureEvent | null {
  const error = ownData(input, "error");
  if (error === null || error === undefined) return null;
  const operation = ownData(input, "operation");
  const kind = ownData(input, "kind");
  if (
    typeof operation !== "string" ||
    !Object.hasOwn(CALLSITES, operation) ||
    (kind !== "result" && kind !== "exception")
  ) {
    throw new Error("Invalid diagnostic context");
  }
  // The own-key check above closes the runtime boundary as well as the TS type.
  const knownOperation = operation as FailureOperation;
  const event: FailureEvent = {
    event: "application_failure",
    version: 1,
    operation: knownOperation,
    kind,
    callsite: CALLSITES[knownOperation],
    error_type: allowed(ownData(error, "name"), ERROR_TYPES),
  };
  const id = requestId(ownData(input, "requestId"));
  if (id !== undefined) event.request_id = id;
  const code = ownData(error, "code");
  if (code !== undefined) event.upstream_code = allowed(code, UPSTREAM_CODES);
  const suppliedStatus = ownData(input, "upstreamStatus");
  const status = httpErrorStatus(suppliedStatus === undefined ? ownData(error, "status") : suppliedStatus);
  if (status !== undefined) event.upstream_status = status;
  return event;
}

function normalizationFallback(input: unknown): {
  event: "diagnostic_normalization_failed";
  version: 1;
  request_id?: string;
} {
  const event = { event: "diagnostic_normalization_failed" as const, version: 1 as const };
  try {
    const id = requestId(ownData(input, "requestId"));
    if (id !== undefined) return { ...event, request_id: id };
  } catch {
    // A hostile context must not stop the fixed fallback record either.
    return event;
  }
  return event;
}

export function createFailureReporter(sink: (json: string) => void): (input: FailureInput) => void {
  return (input) => {
    let json: string;
    try {
      const event = buildFailureEvent(input);
      if (event === null) return;
      json = JSON.stringify(event);
    } catch {
      json = JSON.stringify(normalizationFallback(input));
    }
    try {
      sink(json);
    } catch {
      // Logging is best effort: never recurse into the failed sink or break a request.
      return;
    }
  };
}
