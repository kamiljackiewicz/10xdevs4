// HTTP smoke against the built Workers preview and the approved Supabase Cloud project.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";

for (const name of ["SUPABASE_URL", "SUPABASE_TEST_SERVICE_ROLE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
const BASE_URL = new URL(process.env.BASE_URL ?? "http://localhost:4321").origin;
const email = `smoke-${randomUUID()}@example.invalid`;
const password = `Smoke-${randomUUID()}!`;
const jar = new Map();
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_TEST_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const profile = { first_name: "Synthetic", last_name: "Smoke", date_of_birth: "2000-01-02", sex: "female" };
const edited = { first_name: "Updated", last_name: "Fixture", date_of_birth: "2001-02-03", sex: "male" };
let smokeUserId;
let stage = "temporary user setup";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function matches(row, expected) {
  return row && Object.entries(expected).every(([key, value]) => row[key] === value);
}
async function request(path, { method = "GET", form, json, raw, origin = BASE_URL, contentType } = {}) {
  const headers = { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; ") };
  if (origin !== null) headers.Origin = origin;
  if (contentType) headers["Content-Type"] = contentType;
  else if (form) headers["Content-Type"] = "application/x-www-form-urlencoded";
  else if (json !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers,
    body: raw ?? (form ? new URLSearchParams(form).toString() : json !== undefined ? JSON.stringify(json) : undefined),
    signal: globalThis.AbortSignal.timeout(30000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair, ...attrs] = cookie.split(";");
    const [name, ...rest] = pair.split("=");
    if (attrs.some((attr) => /max-age=0/i.test(attr.trim()))) jar.delete(name.trim());
    else jar.set(name.trim(), rest.join("="));
  }
  return { status: response.status, headers: response.headers, body: await response.text() };
}
function expect(response, status, location) {
  assert(response.status === status, "Unexpected HTTP status");
  if (location !== undefined) assert(response.headers.get("location") === location, "Unexpected redirect");
}
async function step(name, run) {
  stage = name;
  await run();
  console.log(`PASS  ${name}`);
}
async function api(method, json, status, options = {}) {
  const response = await request("/api/patient", { method, json, ...options });
  expect(response, status);
  assert(response.headers.get("cache-control") === "private, no-store", "Patient response is cacheable");
  return JSON.parse(response.body);
}
async function timelineApi(path, method, json, status, options = {}) {
  const response = await request(path, { method, json, ...options });
  expect(response, status);
  assert(response.headers.get("cache-control") === "private, no-store", "Timeline response is cacheable");
  return response.body ? JSON.parse(response.body) : null;
}
async function rendered(expected, locale) {
  const response = await request("/dashboard");
  expect(response, 200);
  assert(response.headers.get("cache-control") === "private, no-store", "Dashboard is cacheable");
  assert(response.body.includes(`lang="${locale}"`), "Wrong persisted language");
  // Match visible definition-list values, not serialized hydration props.
  assert(response.body.includes(`<dd>${expected.first_name}</dd>`), "First name not rendered");
  assert(response.body.includes(`<dd>${expected.last_name}</dd>`), "Last name not rendered");
  assert(
    response.body.includes(`dateTime="${expected.date_of_birth}"`) ||
      response.body.includes(`datetime="${expected.date_of_birth}"`),
    "Birth date not rendered",
  );
  const sexLabel =
    locale === "pl"
      ? expected.sex === "female"
        ? "Kobieta"
        : "Mężczyzna"
      : expected.sex === "female"
        ? "Female"
        : "Male";
  assert(response.body.includes(`<dd>${sexLabel}</dd>`), "Sex not rendered in selected language");
  assert(response.body.includes(locale === "pl" ? "Edytuj profil" : "Edit profile"), "Profile action not translated");
}
async function locale(value) {
  expect(
    await request("/api/locale", { method: "POST", form: { locale: value, returnTo: "/dashboard" } }),
    303,
    "/dashboard",
  );
  assert(jar.get("locale") === value, "Locale cookie not persisted");
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert(!created.error && created.data.user, "Temporary user setup failed");
  smokeUserId = created.data.user.id;
  await step("home renders in default Polish", async () => {
    const home = await request("/");
    expect(home, 200);
    assert(home.body.includes('lang="pl"'), "Default language is not Polish");
  });
  await step("anonymous dashboard and profile writes denied", async () => {
    expect(await request("/dashboard"), 302, "/auth/signin");
    for (const method of ["POST", "PATCH"])
      assert((await api(method, profile, 401)).error === "unauthorized", "Missing unauthorized code");
  });
  await step("signin rejects wrong password", async () => {
    expect(
      await request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
      302,
      "/auth/signin?error=invalid_credentials",
    );
  });
  await step("signin accepts correct password and establishes session", async () => {
    expect(await request("/api/auth/signin", { method: "POST", form: { email, password } }), 302, "/");
    const page = await request("/dashboard");
    expect(page, 200);
    assert(page.body.includes("Utwórz profil"), "Missing create form");
  });
  await step("profile request guards and validation", async () => {
    assert((await api("PATCH", profile, 404)).error === "profile_not_found", "Missing profile code");
    for (const method of ["POST", "PATCH"]) {
      for (const origin of [null, "https://foreign.invalid"]) {
        assert((await api(method, profile, 403, { origin })).error === "invalid_origin", "Origin guard missing");
      }
      assert(
        (await api(method, profile, 415, { contentType: "text/plain" })).error === "invalid_content_type",
        "Content type guard missing",
      );
      assert(
        (await api(method, undefined, 400, { raw: "{", contentType: "application/json" })).error === "invalid_input",
        "Invalid JSON guard missing",
      );
      const invalid = await api(
        method,
        { first_name: " ", last_name: "", date_of_birth: "2000-02-30", sex: "unknown" },
        400,
      );
      assert(
        matches(invalid.errors, {
          first_name: "required",
          last_name: "required",
          date_of_birth: "invalid_date",
          sex: "invalid_sex",
        }),
        "Field validation missing",
      );
    }
  });
  let patient;
  await step("profile create ignores injected metadata and persists rendered values", async () => {
    const injectedId = randomUUID();
    const created = await api(
      "POST",
      { ...profile, id: injectedId, owner_id: randomUUID(), created_at: "1900-01-01", updated_at: "1900-01-01" },
      201,
    );
    patient = created.patient;
    assert(
      matches(patient, profile) &&
        patient.id !== injectedId &&
        Date.parse(patient.created_at) > Date.parse("2020-01-01"),
      "Create whitelist or values failed",
    );
    await rendered(profile, "pl");
    await rendered(profile, "pl");
  });
  await step("timeline note API guards and CRUD persist in SSR", async () => {
    const note = { event_date: profile.date_of_birth, body: "  first\r\nnote  " };
    assert(
      (await timelineApi("/api/timeline-notes", "POST", note, 403, { origin: "https://foreign.invalid" })).error ===
        "invalid_origin",
      "Timeline origin guard missing",
    );
    assert(
      (await timelineApi("/api/timeline-notes", "POST", note, 415, { contentType: "text/plain" })).error ===
        "invalid_content_type",
      "Timeline content-type guard missing",
    );
    const createdNote = await timelineApi("/api/timeline-notes", "POST", { ...note, patient_id: randomUUID() }, 201);
    assert(createdNote.note.body === "first\nnote", "Timeline note normalization failed");
    const timeline = await request("/dashboard/timeline");
    expect(timeline, 200);
    assert(timeline.body.includes("first\nnote"), "Timeline note not server rendered");
    const editedNote = await timelineApi(
      `/api/timeline-notes/${createdNote.note.id}`,
      "PATCH",
      { event_date: "2001-01-02", body: "edited" },
      200,
    );
    assert(editedNote.note.body === "edited", "Timeline note edit failed");
    await timelineApi(`/api/timeline-notes/${createdNote.note.id}`, "DELETE", undefined, 204);
    const afterDelete = await request("/dashboard/timeline");
    expect(afterDelete, 200);
    assert(!afterDelete.body.includes("edited"), "Timeline note delete did not persist");
  });
  await step("duplicate create rejected without overwriting", async () => {
    assert((await api("POST", edited, 409)).error === "profile_exists", "Duplicate create code missing");
    await rendered(profile, "pl");
  });
  await step("English selection survives navigation and reload", async () => {
    await locale("en");
    await rendered(profile, "en");
    const home = await request("/");
    expect(home, 200);
    assert(
      home.body.includes('lang="en"') && home.body.includes("Open profile"),
      "English home/session did not persist",
    );
    await rendered(profile, "en");
  });
  await step("profile edit preserves ID and persists all changed fields", async () => {
    const result = await api(
      "PATCH",
      { ...edited, id: randomUUID(), owner_id: randomUUID(), created_at: "1900-01-01", updated_at: "1900-01-01" },
      200,
    );
    assert(
      matches(result.patient, { ...edited, id: patient.id, created_at: patient.created_at }),
      "Edit whitelist or identity failed",
    );
    assert(Date.parse(result.patient.updated_at) > Date.parse(patient.updated_at), "Edit timestamp did not advance");
    await rendered(edited, "en");
    await rendered(edited, "en");
  });
  await step("Polish selection survives navigation and reload", async () => {
    await locale("pl");
    await rendered(edited, "pl");
    const home = await request("/");
    expect(home, 200);
    assert(
      home.body.includes('lang="pl"') && home.body.includes("Otwórz profil"),
      "Polish home/session did not persist",
    );
    await rendered(edited, "pl");
  });
  await step("signout clears session and denies subsequent profile writes", async () => {
    expect(await request("/api/auth/signout", { method: "POST" }), 302, "/");
    expect(await request("/dashboard"), 302, "/auth/signin");
    for (const method of ["POST", "PATCH"]) await api(method, profile, 401);
  });
} catch {
  console.error(`FAIL  ${stage}`);
  process.exitCode = 1;
} finally {
  if (smokeUserId) {
    try {
      // No Storage objects are created by this test. Remove only this fixture's root.
      const deletion = await admin.from("patients").delete().eq("owner_id", smokeUserId);
      assert(!deletion.error, "Patient cleanup failed");
      const remaining = await admin.from("patients").select("id").eq("owner_id", smokeUserId);
      assert(!remaining.error && remaining.data?.length === 0, "Patient cleanup not verified");
      const userDeletion = await admin.auth.admin.deleteUser(smokeUserId);
      assert(!userDeletion.error, "User cleanup failed");
      console.log("PASS  temporary smoke-test profile and user cleaned up");
    } catch {
      console.error(`CLEANUP FAILED  synthetic user=${smokeUserId}`);
      process.exitCode = 1;
    }
  }
}
if (!process.exitCode) console.log("All smoke steps passed");
