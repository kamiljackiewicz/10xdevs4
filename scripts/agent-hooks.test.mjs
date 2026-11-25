import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const source = resolve("scripts/agent-hooks/run.mjs");
const git = (root, ...args) => {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
};
function fixture(base, name) {
  const root = join(base, name);
  mkdirSync(join(root, "scripts/agent-hooks"), { recursive: true });
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  copyFileSync(source, join(root, "scripts/agent-hooks/run.mjs"));
  const stub = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'check') {
  const cache = process.env.MEDLAB_HOOK_VITE_CACHE;
  if (!cache || !fs.existsSync(cache) || args[2] !== 'scripts/agent-hooks/astro.config.mjs') process.exit(1);
  fs.appendFileSync('CACHE_LOG', cache + '\\n');
}
for (const target of args.filter(x => /\\.(ts|astro)$/.test(x))) {
if (fs.readFileSync(target, 'utf8').includes('BROKEN')) {
  process.stderr.write(target + ': unused variable'); process.exit(1);
}
}
if (fs.existsSync('TYPE_ERROR') && args[0] === 'check') { process.stderr.write('type mismatch'); process.exit(1); }
`;
  for (const name of ["eslint", "astro"]) {
    const file = join(root, "node_modules/.bin", name);
    writeFileSync(file, stub);
    chmodSync(file, 0o755);
  }
  writeFileSync(join(root, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      scripts: {
        "test:unit": "node -e \"if(require('node:fs').existsSync('ASSERT_FAIL'))process.exit(1)\"",
        "test:interaction": 'node -e "process.exit(0)"',
      },
    }),
  );
  writeFileSync(join(root, "good.ts"), "export {};\n");
  git(root, "init", "-q");
  git(root, "add", ".");
  git(root, "-c", "user.name=Hook Test", "-c", "user.email=hooks@example.invalid", "commit", "-qm", "baseline");
  return root;
}

test("agent hooks: Codex payloads, feedback, Stop sweep, worktrees and missing tools", () => {
  const base = mkdtempSync(join(tmpdir(), "medlab-hooks-proof-"));
  try {
    const root = fixture(base, "main");
    const foreign = fixture(base, "foreign");
    const hook = join(root, "scripts/agent-hooks/run.mjs");
    const run = (mode, payload, expected = 0, command) => {
      const result = spawnSync(command ? "/bin/sh" : process.execPath, command ? ["-c", command] : [hook, mode], {
        cwd: root,
        input: typeof payload === "string" ? payload : JSON.stringify({ cwd: root, session_id: "proof", ...payload }),
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: foreign },
      });
      assert.equal(result.status, expected, result.stderr);
      if (expected === 2) {
        assert.ok(result.stderr.includes("failed"));
        assert.equal(result.stdout, "");
      } else assert.equal(result.stderr, "");
      return result;
    };
    const edit = (...files) => ({
      tool_input: { command: files.map((file) => `*** Update File: ${file}`).join("\n") },
    });
    // A clean checkout must not invoke any checker (both binaries are absent).
    const clean = fixture(base, "clean");
    rmSync(join(clean, "node_modules"), { recursive: true });
    const idle = spawnSync(process.execPath, [join(clean, "scripts/agent-hooks/run.mjs"), "stop"], {
      cwd: clean,
      input: JSON.stringify({ cwd: clean }),
      encoding: "utf8",
    });
    assert.equal(idle.status, 0, idle.stderr);
    assert.equal(idle.stdout, "{}");
    writeFileSync(join(root, "good.ts"), "export {};\n// changed\n");
    run("stop", {});
    run("stop", {});
    const caches = readFileSync(join(root, "CACHE_LOG"), "utf8").trim().split("\n");
    assert.equal(caches.length, 2);
    assert.notEqual(caches[0], caches[1]);
    assert.ok(
      caches.every((cache) => !existsSync(cache)),
      "temporary caches must be cleaned up",
    );
    for (const payload of ["", "not json", "{}", "null", { tool_input: {} }, edit("missing.ts"), edit("README.md")])
      run("edit", payload);
    run("edit", edit("good.ts"));
    writeFileSync(join(root, "bad.ts"), "BROKEN");
    assert.match(run("edit", edit("good.ts", "bad.ts"), 2).stderr, /bad.ts.*unused variable/s);
    run("edit", { tool_input: { command: "*** Move to: bad.ts" } }, 2);
    mkdirSync(join(root, "src"));
    run("edit", { cwd: join(root, "src"), ...edit("../bad.ts") }, 2);
    writeFileSync(join(foreign, "bad.ts"), "BROKEN");
    run("edit", edit(join(foreign, "bad.ts")));
    // No edit payload: Stop must discover the shell-written bad file itself.
    assert.match(run("stop", {}, 2).stderr, /bad.ts/);
    run("stop", { stop_hook_active: true });
    writeFileSync(join(root, "bad.ts"), "export {};\n");
    run("stop", {});
    writeFileSync(join(root, "ASSERT_FAIL"), "");
    assert.match(run("stop", {}, 2).stderr, /test:unit/);
    rmSync(join(root, "ASSERT_FAIL"));
    writeFileSync(join(root, "TYPE_ERROR"), "");
    assert.match(run("stop", {}, 2).stderr, /type mismatch/);
    assert.ok(
      readFileSync(join(root, "CACHE_LOG"), "utf8")
        .trim()
        .split("\n")
        .every((cache) => !existsSync(cache)),
      "failed checks must also clean up their cache",
    );
    rmSync(join(root, "TYPE_ERROR"));
    rmSync(join(root, "node_modules/.bin/astro"));
    assert.match(run("stop", {}, 2).stderr, /ENOENT/);
    rmSync(join(root, "node_modules/.bin/eslint"));
    assert.match(run("edit", edit("good.ts"), 2).stderr, /ENOENT/);

    const otherRoot = fixture(base, "worktree-main");
    const wt = join(base, "linked");
    git(otherRoot, "worktree", "add", "-qb", "proof", wt);
    // Tool binaries are ignored and must be provisioned in each worktree.
    mkdirSync(join(wt, "node_modules/.bin"), { recursive: true });
    for (const name of ["eslint", "astro"])
      copyFileSync(join(otherRoot, "node_modules/.bin", name), join(wt, "node_modules/.bin", name));
    const linkedHook = join(otherRoot, "scripts/agent-hooks/run.mjs");
    const invoke = (mode, cwd, patch) =>
      spawnSync(process.execPath, [linkedHook, mode], {
        cwd: otherRoot,
        encoding: "utf8",
        input: JSON.stringify({ cwd, session_id: "linked", ...patch }),
      });
    writeFileSync(join(wt, "good.ts"), "BROKEN");
    assert.equal(invoke("edit", otherRoot, edit(join(wt, "good.ts"))).status, 2);
    assert.equal(invoke("stop", otherRoot, {}).status, 2);
    writeFileSync(join(wt, "good.ts"), "export {};\n");
    assert.equal(invoke("stop", otherRoot, {}).status, 0);
    // Config commands resolve from the worktree even with a stale project variable.
    const config = JSON.parse(readFileSync(resolve(".codex/hooks.json"), "utf8"));
    for (const groups of Object.values(config.hooks)) {
      for (const group of groups)
        for (const handler of group.hooks) {
          const result = spawnSync("/bin/sh", ["-c", handler.command], {
            cwd: wt,
            encoding: "utf8",
            input: JSON.stringify({ cwd: wt }),
            env: { ...process.env, CLAUDE_PROJECT_DIR: "/nonexistent" },
          });
          assert.equal(result.status, 0, result.stderr);
        }
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
