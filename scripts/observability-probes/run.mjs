import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const workingTree = args.includes("--working-tree");
const revisionIndex = args.indexOf("--revision");
const revision = revisionIndex < 0 ? undefined : args[revisionIndex + 1];
const expectation = args[args.indexOf("--expect") + 1];
assert(["before", "after"].includes(expectation), "Use --expect before|after");
assert(workingTree !== Boolean(revision), "Choose --working-tree or --revision <commit>");
assert(args.length === (workingTree ? 3 : 4), "Unexpected probe arguments");
const root = mkdtempSync(join(tmpdir(), "medlab-observability-"));
const evidence = join(root, "probe");
mkdirSync(evidence);
console.log(`Probe copy: ${root}`);

// Deliberate source allowlist: no env files, auth state, uploads, logs or git data.
const sourcePaths = ["src", "public", "astro.config.mjs", "wrangler.jsonc", "tsconfig.json", "package.json"];
function checked(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, { cwd: repository, encoding: "utf8", ...options });
  assert.equal(result.status, 0, `${command} failed: ${result.stderr ?? ""}`);
  return result.stdout;
}
let sourceRevision;
if (workingTree) {
  for (const path of sourcePaths) {
    cpSync(join(repository, path), join(root, path), {
      recursive: true,
      filter: (path) => {
        assert(!lstatSync(path).isSymbolicLink(), "Source symlinks are not allowed in a probe copy");
        return !/(^|\/)\.env(?:\.|$)|(^|\/)\.dev\.vars(?:\.|$)/.test(path);
      },
    });
  }
  sourceRevision = checked("git", ["rev-parse", "HEAD"]).trim();
} else {
  sourceRevision = checked("git", ["rev-parse", "--verify", `${revision}^{commit}`]).trim();
  const archive = spawnSync("git", ["archive", sourceRevision, "--", ...sourcePaths], {
    cwd: repository,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(archive.status, 0, "git archive failed");
  checked("tar", ["-x", "-C", root], { input: archive.stdout });
}
copyFileSync(join(repository, "scripts/observability-probes/supabase-double.ts"), join(root, "src/lib/supabase.ts"));
symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "dir");
renameSync(join(root, "astro.config.mjs"), join(root, "astro.source.config.mjs"));
writeFileSync(
  join(root, "astro.config.mjs"),
  `import original from "./astro.source.config.mjs";
import cloudflare from "@astrojs/cloudflare";
export default { ...original, adapter: cloudflare({ inspectorPort: false }), vite: { ...original.vite, cacheDir: "./probe/vite-cache" } };
`,
);
const workerName = `observability-${root.split("-").at(-1).toLowerCase()}`;
const wrangler = readFileSync(join(root, "wrangler.jsonc"), "utf8");
assert(/"name"\s*:\s*"[^"]+"/.test(wrangler), "Missing Worker name");
writeFileSync(join(root, "wrangler.jsonc"), wrangler.replace(/"name"\s*:\s*"[^"]+"/, `"name": "${workerName}"`));

// Child processes receive only tool/runtime essentials, never ambient credentials.
const env = {};
for (const key of ["PATH", "TMPDIR", "TMP", "TEMP", "SystemRoot", "SYSTEMROOT", "WINDIR"]) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, {
  ASTRO_TELEMETRY_DISABLED: "1",
  WRANGLER_SEND_METRICS: "false",
  ASTRO_PREVIEW_BACKGROUND: "1",
  XDG_CONFIG_HOME: join(evidence, "config"),
  WRANGLER_REGISTRY_PATH: join(evidence, "registry"),
  MINIFLARE_REGISTRY_PATH: join(evidence, "registry"),
  WRANGLER_LOG_PATH: join(evidence, "wrangler.log"),
  NO_COLOR: "1",
});
const astro = join(repository, "node_modules/astro/bin/astro.mjs");
assert(existsSync(astro), "Install project dependencies first");
const port = await new Promise((accept, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const allocated = address.port;
    server.close((error) => (error ? reject(error) : accept(allocated)));
  });
});
const base = `http://127.0.0.1:${port}`;
const privateSeed = "probe-private-patient@example.invalid/Bearer-probe-secret";
const spoofedId = "11111111-1111-4111-8111-111111111111";
const callsites = {
  "auth.get_user": "middleware.auth",
  "patient.read": "dashboard.profile",
  "timeline.profile.read": "timeline.profile",
  "timeline.notes.read": "timeline.notes",
};
const copyManifest = {
  source: workingTree ? "working-tree" : "revision",
  sourceRevision,
  sourcePaths,
  root,
  base,
  expectation,
  environmentKeys: Object.keys(env),
};
writeFileSync(join(evidence, "manifest.json"), JSON.stringify(copyManifest, null, 2));

const texts = {
  pl: {
    profileFailure: "Nie udało się wczytać profilu. Odśwież stronę.",
    timelineFailure: "Nie udało się wczytać osi czasu. Odśwież stronę.",
    createProfile: "Utwórz profil",
    noProfile: "Przed dodaniem notatek utwórz profil pacjenta.",
    noBirth: "Przed zapisaniem notatek dodaj datę urodzenia pacjenta w profilu.",
    empty: "Brak notatek na osi czasu.",
  },
  en: {
    profileFailure: "We couldn't load your profile. Please reload the page.",
    timelineFailure: "We couldn't load the timeline. Please reload the page.",
    createProfile: "Create profile",
    noProfile: "Create a patient profile before adding timeline notes.",
    noBirth: "Add the patient's date of birth in the profile before saving notes.",
    empty: "No timeline notes yet.",
  },
};
const cases = [
  {
    id: "auth-result",
    path: "/dashboard",
    status: 302,
    operation: "auth.get_user",
    type: "AuthApiError",
    code: "unexpected_failure",
    upstream: 503,
  },
  {
    id: "auth-unknown",
    path: "/dashboard",
    status: 302,
    operation: "auth.get_user",
    type: "AuthApiError",
    code: "unknown",
    upstream: 401,
  },
  {
    id: "auth-transport",
    path: "/dashboard",
    status: 302,
    operation: "auth.get_user",
    type: "AuthRetryableFetchError",
    code: "unexpected_failure",
  },
  { id: "auth-session", path: "/dashboard", status: 302 },
  { id: "auth-throw", path: "/dashboard", status: 500 },
  { id: "auth-healthy", path: "/dashboard", status: 200, ui: "healthyProfile" },
  { id: "profile-result", path: "/dashboard", status: 200, operation: "patient.read", ui: "profileFailure" },
  { id: "profile-throw", path: "/dashboard", status: 200, operation: "patient.read", ui: "profileFailure" },
  {
    id: "timeline-profile-result",
    path: "/dashboard/timeline",
    status: 200,
    operation: "timeline.profile.read",
    ui: "timelineFailure",
  },
  {
    id: "timeline-profile-throw",
    path: "/dashboard/timeline",
    status: 200,
    operation: "timeline.profile.read",
    ui: "timelineFailure",
  },
  {
    id: "timeline-notes-result",
    path: "/dashboard/timeline",
    status: 200,
    operation: "timeline.notes.read",
    ui: "timelineFailure",
  },
  {
    id: "timeline-notes-throw",
    path: "/dashboard/timeline",
    status: 200,
    operation: "timeline.notes.read",
    ui: "timelineFailure",
  },
  { id: "profile-missing", path: "/dashboard", status: 200, ui: "createProfile" },
  { id: "timeline-profile-missing", path: "/dashboard/timeline", status: 200, ui: "noProfile" },
  { id: "timeline-birth-missing", path: "/dashboard/timeline", status: 200, ui: "noBirth" },
  { id: "timeline-empty", path: "/dashboard/timeline", status: 200, ui: "empty" },
  { id: "timeline-healthy", path: "/dashboard/timeline", status: 200, ui: "healthyNote" },
];

let child;
let logFd;
const rows = [];
const requestIds = new Set();
const runtimePath = join(evidence, "runtime.log");
function alive(process_) {
  return process_ && process_.exitCode === null && process_.signalCode === null;
}
async function stop() {
  if (!child?.pid) {
    if (logFd !== undefined) closeSync(logFd);
    logFd = undefined;
    return;
  }
  const pid = child.pid;
  try {
    process.kill(-pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  for (let i = 0; i < 30 && alive(child); i++) await pause(100);
  // Kill surviving descendants as well, even if their group leader already exited.
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  if (logFd !== undefined) closeSync(logFd);
  child = undefined;
  logFd = undefined;
}
const interrupted = () => {
  void stop().finally(() => process.exit(130));
};
process.once("SIGINT", interrupted);
process.once("SIGTERM", interrupted);
function records(log) {
  return log.split("\n").flatMap((line) => {
    const start = line.indexOf('{"event":');
    if (start < 0) return [];
    try {
      return [JSON.parse(line.slice(start).trim())];
    } catch {
      throw new Error("Malformed structured probe record");
    }
  });
}
try {
  const buildFd = openSync(join(evidence, "build.log"), "w");
  try {
    const build = spawnSync(process.execPath, [astro, "build"], {
      cwd: root,
      env,
      stdio: ["ignore", buildFd, buildFd],
      timeout: 180_000,
    });
    assert.equal(build.status, 0, `Probe build failed; see ${evidence}/build.log`);
  } finally {
    closeSync(buildFd);
  }
  logFd = openSync(runtimePath, "w");
  child = spawn(process.execPath, [astro, "preview", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  let launchError;
  child.once("error", (error) => {
    launchError = error;
  });
  let ready = false;
  for (let i = 0; i < 200; i++) {
    if (launchError) throw launchError;
    assert(alive(child), `Preview exited; see ${runtimePath}`);
    try {
      const response = await fetch(base, { signal: globalThis.AbortSignal.timeout(1000) });
      await response.text();
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Startup may precede the listener becoming available. */
    }
    await pause(100);
  }
  assert(ready, `Preview not ready; see ${runtimePath}`);
  await pause(200);
  for (const locale of ["pl", "en"]) {
    for (const probe of cases) {
      const start = readFileSync(runtimePath, "utf8").length;
      const response = await fetch(base + probe.path, {
        headers: { "x-observability-probe": probe.id, "x-request-id": spoofedId, Cookie: `locale=${locale}` },
        redirect: "manual",
        signal: globalThis.AbortSignal.timeout(10_000),
      });
      const body = await response.text();
      await pause(150);
      const log = readFileSync(runtimePath, "utf8").slice(start);
      const allRecords = records(log);
      const events = allRecords.filter((record) => record.event !== "probe_backend_call");
      const backendCalls = allRecords
        .filter((record) => record.event === "probe_backend_call")
        .map((record) => record.table);
      const semantic = body.replace(/&#x27;|&#39;|&apos;/g, "'");
      let uiMatches = true;
      if (probe.ui === "healthyProfile") uiMatches = body.includes("Synthetic") && body.includes("Probe");
      else if (probe.ui === "healthyNote") uiMatches = body.includes("Synthetic probe note");
      else if (probe.ui) uiMatches = semantic.includes(texts[locale][probe.ui]);
      const row = {
        id: probe.id,
        locale,
        status: response.status,
        location: response.headers.get("location"),
        ui: probe.ui ?? null,
        uiMatches,
        bodyHash: createHash("sha256").update(body).digest("hex"),
        bodyLength: body.length,
        events,
        backendCalls,
        console: log,
      };
      rows.push(row);
      assert.equal(response.status, probe.status, `${probe.id}/${locale}: HTTP`);
      assert(uiMatches, `${probe.id}/${locale}: UI message`);
      if (probe.status === 302) assert.equal(row.location, "/auth/signin");
      if (probe.status === 200) assert(body.includes(`lang="${locale}"`), `${probe.id}: locale`);
      assert(!body.includes(privateSeed) && !log.includes(privateSeed), `${probe.id}: private seed leaked`);
      assert(
        !body.includes("application_failure") && !body.includes("diagnostic_normalization_failed"),
        "Diagnostics reached HTTP body",
      );
      const incident = expectation === "after" && Boolean(probe.operation);
      assert.equal(events.length, incident ? 1 : 0, `${probe.id}/${locale}: diagnostic count`);
      if (incident) {
        const event = events[0];
        const exception = probe.id.endsWith("throw");
        const expected = {
          event: "application_failure",
          version: 1,
          operation: probe.operation,
          kind: exception ? "exception" : "result",
          callsite: callsites[probe.operation],
          error_type: probe.type ?? (exception ? "TypeError" : "PostgrestError"),
          request_id: event.request_id,
          upstream_code: probe.code ?? (exception ? "unknown" : "PGRST003"),
        };
        if (probe.id !== "auth-transport") expected.upstream_status = probe.upstream ?? 503;
        assert.deepEqual(event, expected, `${probe.id}: event schema`);
        assert.match(event.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        assert.notEqual(event.request_id, spoofedId, "Untrusted request ID copied");
        assert(!requestIds.has(event.request_id), "Request ID reused across requests");
        requestIds.add(event.request_id);
      }
      if (probe.id === "auth-throw") {
        assert(log.includes("Probe unhandled Auth control"), "Framework exception cause missing");
        assert(/supabase|middleware|Error/.test(log), "Framework exception context missing");
      }
      if (expectation === "after" && probe.id.startsWith("timeline-profile-")) {
        assert(!backendCalls.includes("timeline_notes"), "Profile failure cascaded into notes");
      }
      console.log(JSON.stringify({ id: row.id, locale, status: row.status, uiMatches, events: events.length }));
    }
  }
  assert(!readFileSync(runtimePath, "utf8").includes(privateSeed), "Runtime log contains private seed");
  assert(!readFileSync(join(evidence, "build.log"), "utf8").includes(privateSeed), "Build log contains private seed");
  writeFileSync(join(evidence, "results.json"), JSON.stringify({ ...copyManifest, passed: true, rows }, null, 2));
  console.log(`PASS ${rows.length} probes; evidence: ${evidence}/results.json`);
} catch (error) {
  writeFileSync(
    join(evidence, "results.json"),
    JSON.stringify({ ...copyManifest, passed: false, failure: String(error), rows }, null, 2),
  );
  throw error;
} finally {
  await stop();
  process.removeListener("SIGINT", interrupted);
  process.removeListener("SIGTERM", interrupted);
}
