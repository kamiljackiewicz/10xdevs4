#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

// No shell interpolation of payload paths; all tools receive argument arrays.
const mode = process.argv[2];
const deadline = Date.now() + (mode === "stop" ? 105000 : 25000);
const env = { ...process.env, NO_COLOR: "1" };
delete env.FORCE_COLOR;
let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  payload = {};
}
if (!payload || typeof payload !== "object") payload = {};
const git = (cwd, args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 5000, env });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr || result.error}`);
  return result.stdout.trim();
};
const rootOf = (cwd) => git(cwd, ["rev-parse", "--show-toplevel"]);
const commonOf = (cwd) => realpathSync(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
const homeRoot = rootOf(dirname(fileURLToPath(import.meta.url)));
const common = commonOf(homeRoot);
const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
const supported = (file) => /\.(?:[cm]?js|jsx|ts|tsx|astro)$/.test(file);
const dashboard = new Set([
  "src/pages/dashboard.astro",
  "src/components/patient/PatientProfile.tsx",
  "src/components/patient/PatientProfileView.tsx",
]);
const failures = [];
function run(root, command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...env, ...extraEnv },
    encoding: "utf8",
    timeout: Math.max(1, deadline - Date.now()),
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    failures.push(
      `${root}: ${command} ${args.join(" ")}\n${result.error || ""}\n${result.stdout || ""}${result.stderr || ""}`,
    );
  }
}
function lint(root, files) {
  if (!files.length) return;
  run(root, join(root, "node_modules/.bin/eslint"), ["--no-warn-ignored", ...files]);
  const views = files.filter((file) => dashboard.has(file));
  if (views.length) run(root, process.execPath, ["scripts/check-dashboard-ui.mjs", ...views]);
}
const hash = (value) => createHash("sha256").update(value).digest("hex");
// Each checkout has its own entry, so concurrent edits cannot overwrite siblings.
const sessionDir =
  typeof payload.session_id === "string"
    ? join(tmpdir(), "medlab-agent-hooks", hash(common + payload.session_id))
    : null;
try {
  if (mode === "stop" && payload.stop_hook_active === true) {
    process.stdout.write("{}");
    process.exit(0);
  }
  if (mode === "edit") {
    const patch = payload.tool_input?.command;
    const groups = new Map();
    for (const match of (typeof patch === "string" ? patch : "").matchAll(
      /^\*\*\* (?:Update File|Add File|Move to): (.+)\r?$/gm,
    )) {
      const file = resolve(cwd, match[1].trimEnd());
      if (!existsSync(file)) continue;
      const actual = realpathSync(file);
      let root;
      try {
        root = rootOf(dirname(actual));
        if (commonOf(root) !== common) continue;
      } catch {
        continue;
      }
      if (sessionDir) {
        mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
        writeFileSync(join(sessionDir, hash(root)), root, { mode: 0o600 });
      }
      if (supported(actual)) groups.set(root, [...(groups.get(root) || []), relative(root, actual)]);
    }
    for (const [root, files] of groups) lint(root, [...new Set(files)]);
  } else if (mode === "stop") {
    const roots = new Set([rootOf(cwd)]);
    if (sessionDir && existsSync(sessionDir)) {
      for (const name of readdirSync(sessionDir)) roots.add(readFileSync(join(sessionDir, name), "utf8"));
    }
    for (const root of roots) {
      if (!existsSync(root) || commonOf(root) !== common) continue;
      const changed = new Set([
        ...git(root, ["diff", "--name-only", "-z", "HEAD"]).split("\0"),
        ...git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
      ]);
      changed.delete("");
      if (!changed.size) continue;
      lint(
        root,
        [...changed].filter((file) => supported(file) && existsSync(join(root, file))),
      );
      run(root, "npm", ["run", "test:unit"]);
      run(root, "npm", ["run", "test:interaction"]);
      // Sync starts Vite: never share its optimizer cache with dev/build or another hook.
      const cacheDir = mkdtempSync(join(tmpdir(), "medlab-hook-vite-"));
      try {
        run(
          root,
          join(root, "node_modules/.bin/astro"),
          ["check", "--config", "scripts/agent-hooks/astro.config.mjs"],
          {
            MEDLAB_HOOK_VITE_CACHE: cacheDir,
          },
        );
      } finally {
        rmSync(cacheDir, { recursive: true, force: true });
      }
    }
  }
} catch (error) {
  failures.push(String(error));
}
if (failures.length) {
  process.stderr.write(`Agent quality checks failed; fix before finishing:\n${failures.join("\n\n")}\n`);
  process.exitCode = 2;
} else if (mode === "stop") process.stdout.write("{}");
