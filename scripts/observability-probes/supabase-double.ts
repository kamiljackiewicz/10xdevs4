import type { SupabaseClient } from "@supabase/supabase-js";

// Synthetic seeds must stay out of both application logs and HTTP responses.
export const PRIVATE_SEED = "probe-private-patient@example.invalid/Bearer-probe-secret";
const timestamp = "2020-01-01T00:00:00.000Z";
const patient = {
  id: "00000000-0000-4000-8000-000000000002",
  first_name: "Synthetic",
  last_name: "Probe",
  date_of_birth: "2000-01-01",
  sex: "female",
  created_at: timestamp,
  updated_at: timestamp,
};
const user = { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.invalid" };

function failure(exception = false) {
  const error = Object.assign(new Error(PRIVATE_SEED), {
    name: exception ? "TypeError" : "PostgrestError",
    code: exception ? PRIVATE_SEED : "PGRST003",
    status: 503,
    message: PRIVATE_SEED,
    details: PRIVATE_SEED,
    hint: PRIVATE_SEED,
    stack: PRIVATE_SEED,
    originalError: { secret: PRIVATE_SEED },
    toJSON() {
      throw new Error("Probe must never serialize an input error");
    },
  });
  Object.defineProperty(error, "privateGetter", {
    get() {
      throw new Error("Probe must never evaluate a private getter");
    },
  });
  error.cause = error;
  return error;
}

interface Result {
  data: unknown;
  error: ReturnType<typeof failure> | null;
  status: number;
}

class Query implements PromiseLike<Result> {
  constructor(
    private table: string,
    private probe: string,
  ) {}
  select() {
    return this;
  }
  eq() {
    return this;
  }
  order() {
    return this;
  }
  range() {
    return this;
  }
  maybeSingle() {
    return this;
  }
  then<T = Result, U = never>(
    fulfilled?: ((value: Result) => T | PromiseLike<T>) | null,
    rejected?: ((reason: unknown) => U | PromiseLike<U>) | null,
  ): PromiseLike<T | U> {
    return Promise.resolve()
      .then((): Result => {
        console.log(JSON.stringify({ event: "probe_backend_call", table: this.table }));
        const profile = this.table === "patients";
        const failing = profile
          ? ["profile-result", "profile-throw", "timeline-profile-result", "timeline-profile-throw"].includes(
              this.probe,
            )
          : ["timeline-notes-result", "timeline-notes-throw"].includes(this.probe);
        if (!profile && this.probe.startsWith("timeline-profile-")) {
          throw new Error("Unexpected cascading notes read");
        }
        if (failing) {
          if (this.probe.endsWith("throw")) throw failure(true);
          // Deliberately contradictory data+error exercises the no-cascade guard.
          return { data: profile ? patient : null, error: failure(), status: 503 };
        }
        const missing = ["profile-missing", "timeline-profile-missing"].includes(this.probe);
        const row = this.probe === "timeline-birth-missing" ? { ...patient, date_of_birth: null } : patient;
        const notes =
          this.probe === "timeline-healthy"
            ? [
                {
                  id: "00000000-0000-4000-8000-000000000003",
                  patient_id: patient.id,
                  event_date: "2020-01-02",
                  body: "Synthetic probe note",
                  created_at: timestamp,
                  updated_at: timestamp,
                },
              ]
            : [];
        return { data: profile ? (missing ? null : row) : notes, error: null, status: 200 };
      })
      .then(fulfilled, rejected);
  }
}

// This replacement never imports server secrets, opens sockets or uses real data.
export function createClient(headers: Headers, _cookies?: unknown): SupabaseClient {
  const probe = headers.get("x-observability-probe") ?? "healthy";
  return {
    auth: {
      getUser: () => {
        if (probe === "auth-throw") throw new Error("Probe unhandled Auth control");
        if (probe === "auth-session")
          return { data: { user: null }, error: { name: "AuthSessionMissingError", status: 400 } };
        if (["auth-result", "auth-unknown", "auth-transport"].includes(probe)) {
          return {
            data: { user: null },
            error: Object.assign(failure(), {
              name: probe === "auth-transport" ? "AuthRetryableFetchError" : "AuthApiError",
              code: probe === "auth-unknown" ? PRIVATE_SEED : "unexpected_failure",
              status: probe === "auth-transport" ? 0 : probe === "auth-unknown" ? 401 : 503,
            }),
          };
        }
        return { data: { user }, error: null };
      },
    },
    from: (table: string) => new Query(table, probe),
  } as unknown as SupabaseClient;
}
