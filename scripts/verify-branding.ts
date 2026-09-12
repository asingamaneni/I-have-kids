import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const tracked = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);

const excludedPaths = new Set([
  "kindergarten_learning_plugin_build_prompt.docx",
  "scripts/verify-branding.ts",
]);

const allowed: Record<string, RegExp[]> = {
  "README.md": [
    /KINDERGARTEN_(?:PROJECT_ROOT|DB_PATH|ARTIFACTS_DIR)/,
    /kindergarten-learning/,
    /\.claude\/plugins\/kindergarten-learning/,
    /kindergarten:\/\//,
    /\/kindergarten-\*/,
  ],
  "packages/mcp-server/src/better-sqlite3-shim.ts": [/KINDERGARTEN_PROJECT_ROOT/],
  "packages/mcp-server/src/service.ts": [/KINDERGARTEN_(?:PROJECT_ROOT|DB_PATH|ARTIFACTS_DIR)/],
  "packages/mcp-server/src/server.ts": [/kindergarten:\/\//],
  "packages/mcp-server/tests/mcp-server.test.ts": [/KINDERGARTEN_(?:DB_PATH|ARTIFACTS_DIR)/],
  "plugin/hooks/scripts/fast-verify.sh": [/KINDERGARTEN_PROJECT_ROOT/],
  "plugin/hooks/scripts/session-status.sh": [/KINDERGARTEN_PROJECT_ROOT/],
  "scripts/bundle-mcp.ts": [/KINDERGARTEN_PROJECT_ROOT/],
  "evals/claude-runner.ts": [/KINDERGARTEN_(?:PROJECT_ROOT|DB_PATH|ARTIFACTS_DIR)/],
  "scripts/verify-claude-plugin-output.ts": [/KINDERGARTEN_PROJECT_ROOT/],
};

const failures: string[] = [];
for (const path of tracked) {
  if (excludedPaths.has(path)) continue;
  const bytes = readFileSync(resolve(root, path));
  if (bytes.includes(0)) continue;
  const lines = bytes.toString("utf8").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!/kindergarten/i.test(line)) continue;
    if ((allowed[path] ?? []).some((pattern) => pattern.test(line))) continue;
    failures.push(`${path}:${index + 1}: ${line.trim()}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Unallowlisted kindergarten branding remains:\n${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Branding scan passed: only documented legacy compatibility and the archival brief remain.\n");
}
