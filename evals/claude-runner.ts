// Spawns headless `claude -p` runs for skill evals against the built plugin in dist/plugin/claude.
import { spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseStreamJson, type ParsedTranscript } from "./transcript.ts";

export const MCP_TOOL_PREFIX = "mcp__plugin_child-learning_child-learning-local__";
export const MCP_SERVER_NAME = "child-learning-local";
/** Read-only built-ins every case gets: skills read their references/*.md, and Claude spills large MCP results to disk and reads them back. */
export const DEFAULT_BUILTIN_TOOLS = ["Read", "Glob", "Grep"];

export interface ClaudeRunOptions {
  projectRoot: string;
  prompt: string;
  cwd: string;
  dataDir: { databasePath: string; artifactsDir: string };
  outputPath: string;
  timeoutMs: number;
  maxTurns: number;
  model: string;
  maxBudgetUsd: number;
  /** Extra built-in tools to expose on top of DEFAULT_BUILTIN_TOOLS (e.g. Bash for verification skills). */
  builtInTools?: string[];
}

export interface ClaudeRunOutcome {
  transcript: ParsedTranscript;
  rawTranscript: string;
  exitCode: number;
  timedOut: boolean;
  stderrPath: string;
}

export function pluginDir(projectRoot: string): string {
  return join(projectRoot, "dist/plugin/claude");
}

export function buildArgs(options: Pick<ClaudeRunOptions, "projectRoot" | "prompt" | "maxTurns" | "model" | "maxBudgetUsd" | "builtInTools">): string[] {
  const builtIns = [...new Set([...DEFAULT_BUILTIN_TOOLS, ...(options.builtInTools ?? [])])];
  return [
    "-p", options.prompt,
    "--output-format", "stream-json",
    "--verbose",
    "--no-session-persistence",
    "--plugin-dir", pluginDir(options.projectRoot),
    "--setting-sources", "local",
    "--settings", JSON.stringify({ disableAllHooks: true }),
    "--permission-mode", "dontAsk",
    "--permission-prompts", "none",
    "--allowedTools", [`${MCP_TOOL_PREFIX}*`, ...builtIns].join(","),
    "--tools", builtIns.join(","),
    "--max-turns", String(options.maxTurns),
    "--max-budget-usd", String(options.maxBudgetUsd),
    "--model", options.model
  ];
}

export function buildEnv(projectRoot: string, dataDir: { databasePath: string; artifactsDir: string }): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of ["CLAUDE_PROJECT_DIR", "KINDERGARTEN_PROJECT_ROOT", "KINDERGARTEN_DB_PATH", "KINDERGARTEN_ARTIFACTS_DIR", "LEARNING_WORKTABLE_DB", "LEARNING_WORKTABLE_ARTIFACTS", "CLAUDECODE"]) delete env[key];
  env.CHILD_LEARNING_PROJECT_ROOT = projectRoot;
  env.CHILD_LEARNING_DB_PATH = dataDir.databasePath;
  env.CHILD_LEARNING_ARTIFACTS_DIR = dataDir.artifactsDir;
  return env;
}

export async function runClaude(options: ClaudeRunOptions): Promise<ClaudeRunOutcome> {
  await mkdir(dirname(options.outputPath), { recursive: true });
  const stderrPath = join(dirname(options.outputPath), "_eval_stderr.log");
  const stdout = createWriteStream(options.outputPath);
  const stderr = createWriteStream(stderrPath);
  const child = spawn("claude", buildArgs(options), { cwd: options.cwd, env: buildEnv(options.projectRoot, options.dataDir), stdio: ["ignore", "pipe", "pipe"], detached: true });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try { process.kill(-child.pid!, "SIGTERM"); } catch { child.kill("SIGTERM"); }
    setTimeout(() => { try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already gone */ } }, 5000).unref();
  }, options.timeoutMs);
  const exitCode = await new Promise<number>((resolve) => {
    child.on("error", () => resolve(127));
    child.on("close", (code) => resolve(code ?? (timedOut ? 124 : 1)));
  });
  clearTimeout(timer);
  await Promise.all([new Promise((resolve) => stdout.end(resolve)), new Promise((resolve) => stderr.end(resolve))]);
  const rawTranscript = await readFile(options.outputPath, "utf8");
  const transcript = parseStreamJson(rawTranscript, timedOut ? 124 : exitCode);
  if (timedOut) transcript.result = { ...transcript.result, subtype: "timeout", isError: true };
  return { transcript, rawTranscript, exitCode: timedOut ? 124 : exitCode, timedOut, stderrPath };
}

export interface PreflightResult { ok: boolean; problems: string[]; model?: string; }

/** One cheap run per eval session to confirm the plugin, MCP server, and tool allowlist are wired. */
export async function preflight(projectRoot: string, workDir: string, dataDir: { databasePath: string; artifactsDir: string }, model: string): Promise<PreflightResult> {
  const problems: string[] = [];
  const dir = pluginDir(projectRoot);
  if (!existsSync(join(dir, ".claude-plugin/plugin.json"))) problems.push(`Built plugin not found at ${dir}. Run \`pnpm plugin:build\` first.`);
  if (!existsSync(join(dir, "hooks/scripts/child-learning-mcp.mjs"))) problems.push("Bundled MCP server missing from the built plugin. Run `pnpm plugin:build` first.");
  if (problems.length > 0) return { ok: false, problems };
  const outcome = await runClaude({ projectRoot, prompt: "Reply with exactly: OK", cwd: workDir, dataDir, outputPath: join(workDir, "_preflight_output.jsonl"), timeoutMs: 120_000, maxTurns: 1, model, maxBudgetUsd: 1 });
  const init = outcome.transcript.init;
  if (!init) problems.push(`Preflight run produced no system.init line (exit ${outcome.exitCode}); see ${outcome.stderrPath}.`);
  else {
    const server = init.mcpServers.find((entry) => entry.name.includes(MCP_SERVER_NAME));
    if (!server) problems.push(`MCP server ${MCP_SERVER_NAME} is not registered in the headless session (servers: ${init.mcpServers.map((entry) => entry.name).join(", ") || "none"}).`);
    else if (server.status !== "connected") problems.push(`MCP server ${MCP_SERVER_NAME} status is ${server.status}, expected connected; see ${outcome.stderrPath}.`);
    if (!init.tools.some((tool) => tool.startsWith(MCP_TOOL_PREFIX))) problems.push(`No tools with prefix ${MCP_TOOL_PREFIX} were exposed (saw: ${init.tools.filter((tool) => tool.startsWith("mcp__")).slice(0, 5).join(", ") || "no mcp tools"}).`);
  }
  if (outcome.transcript.result.subtype !== "success") problems.push(`Preflight run ended with ${outcome.transcript.result.subtype}; see ${outcome.stderrPath}.`);
  return { ok: problems.length === 0, problems, ...(init?.model ? { model: init.model } : {}) };
}
