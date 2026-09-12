// Skill eval runner: `pnpm eval:skills [skill[:case]] [--dry-run] [--keep] [--concurrency N] [--model M] [--budget USD]`
// Runs each case headlessly against an isolated data store and writes eval-results.json / eval-results.md
// into a timestamped RESULTS_DIR under .data/evals/. The last stdout line is `RESULTS_DIR=<path>`.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase, closeDatabase } from "../packages/database/src/db.ts";
import { evaluateAssertion, type AssertionResult, type Judge } from "./assertions.ts";
import { buildPrompt, loadCases, parseFilter, renderPlaceholders, TIER_LABELS, type EvalCase, type TierId } from "./cases.ts";
import { preflight, runClaude } from "./claude-runner.ts";
import { seedFixture } from "./fixtures.ts";

interface CliOptions { filter: string | undefined; dryRun: boolean; keep: boolean; concurrency: number; model: string; judgeModel: string; budgetUsd: number; }

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { filter: undefined, dryRun: false, keep: false, concurrency: 3, model: "sonnet", judgeModel: "haiku", budgetUsd: 1 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const next = () => { index += 1; const value = argv[index]; if (value === undefined) throw new Error(`${arg} requires a value`); return value; };
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--keep") options.keep = true;
    else if (arg === "--concurrency") options.concurrency = Math.max(1, Number(next()));
    else if (arg === "--model") options.model = next();
    else if (arg === "--judge-model") options.judgeModel = next();
    else if (arg === "--budget") options.budgetUsd = Number(next());
    else if (arg === "--help" || arg === "-h") { process.stdout.write("usage: pnpm eval:skills [skill[:case]] [--dry-run] [--keep] [--concurrency N] [--model M] [--judge-model M] [--budget USD]\n"); process.exit(0); }
    else if (arg.startsWith("--")) throw new Error(`unknown flag ${arg}`);
    else options.filter = arg;
  }
  return options;
}

interface TierReport { label: string; total: number; passed: number; score: number | null; assertions: Array<{ text: string; passed: boolean; detail: string }>; }
interface CaseReport {
  skill: string; case: string; path: string; fixture: string; prompt: string; passed: boolean; status: "passed" | "failed" | "error" | "dry-run";
  duration_seconds: number; cost_usd: number; turns: number; tool_calls: string[]; permission_denials: number; harness_error?: string;
  tiers: Record<"tier0" | "tier1" | "tier2", TierReport>; results_dir: string;
}


function makeJudge(model: string, budgetUsd: number): Judge {
  return async (rubric, finalText, scenario) => {
    const prompt = [
      "You are grading the final message of an AI assistant against one rubric. Reply with exactly PASS or FAIL on the first line, then one short sentence of justification.",
      `Scenario: ${scenario || "(none)"}`,
      `Rubric: ${rubric}`,
      "Final message:",
      "<<<",
      finalText.slice(0, 12_000),
      ">>>"
    ].join("\n");
    const output = await new Promise<string>((resolveOutput) => {
      const child = spawn("claude", ["-p", prompt, "--output-format", "text", "--model", model, "--max-turns", "1", "--max-budget-usd", String(budgetUsd), "--tools", "", "--no-session-persistence", "--setting-sources", "local", "--settings", JSON.stringify({ disableAllHooks: true })], { cwd: tmpdir(), env: { ...process.env, CLAUDECODE: undefined }, stdio: ["ignore", "pipe", "ignore"] });
      let text = "";
      child.stdout.on("data", (chunk: Buffer) => { text += chunk.toString(); });
      child.on("close", () => resolveOutput(text));
      child.on("error", () => resolveOutput(""));
    });
    const firstLine = output.trim().split(/\r?\n/)[0] ?? "";
    const passed = /^\s*PASS\b/i.test(firstLine);
    return { passed, detail: output.trim().slice(0, 300) || "judge produced no output" };
  };
}

function tierReport(tier: TierId, entries: Array<{ text: string; result: AssertionResult }>): TierReport {
  const passed = entries.filter((entry) => entry.result.passed).length;
  return { label: TIER_LABELS[tier], total: entries.length, passed, score: entries.length === 0 ? null : Number((passed / entries.length).toFixed(3)), assertions: entries.map((entry) => ({ text: entry.text, passed: entry.result.passed, detail: entry.result.detail })) };
}

async function runCase(evalCase: EvalCase, projectRoot: string, resultsDir: string, options: CliOptions, judge: Judge | undefined): Promise<CaseReport> {
  const caseDir = join(resultsDir, evalCase.skill, evalCase.name);
  await mkdir(caseDir, { recursive: true });
  const scratch = await mkdtemp(join(tmpdir(), `skill-eval-${evalCase.skill}-`));
  const workDir = join(scratch, "workdir");
  await mkdir(workDir, { recursive: true });
  const base: Omit<CaseReport, "passed" | "status" | "tiers" | "duration_seconds" | "cost_usd" | "turns" | "tool_calls" | "permission_denials" | "prompt"> = { skill: evalCase.skill, case: evalCase.name, path: evalCase.path, fixture: evalCase.fixture, results_dir: caseDir };
  const emptyTiers = { tier0: tierReport(0, []), tier1: tierReport(1, []), tier2: tierReport(2, []) };
  try {
    const store = await seedFixture(evalCase.fixture, join(scratch, "data"), projectRoot);
    const prompt = buildPrompt(evalCase, store.values);
    await writeFile(join(caseDir, "_eval_case.json"), JSON.stringify({ case: evalCase.path, prompt, fixture: evalCase.fixture, values: store.values }, null, 2));
    if (options.dryRun) {
      for (const entry of evalCase.assertions) renderPlaceholders(entry.line, store.values);
      return { ...base, prompt, passed: true, status: "dry-run", duration_seconds: 0, cost_usd: 0, turns: 0, tool_calls: [], permission_denials: 0, tiers: emptyTiers };
    }
    const outcome = await runClaude({ projectRoot, prompt, cwd: workDir, dataDir: store, outputPath: join(caseDir, "_eval_output.jsonl"), timeoutMs: evalCase.timeoutSeconds * 1000, maxTurns: evalCase.maxTurns, model: options.model, maxBudgetUsd: evalCase.maxBudgetUsd ?? options.budgetUsd, ...(evalCase.tools.length > 0 ? { builtInTools: evalCase.tools } : {}) });
    const db = openDatabase({ filename: store.databasePath, readonly: true });
    const queryScalar = (sql: string): number => {
      const row = db.prepare(sql).raw().get() as unknown[] | undefined;
      const value = row?.[0];
      if (typeof value === "number") return value;
      if (typeof value === "bigint") return Number(value);
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
      throw new Error(`query did not return a numeric scalar: ${JSON.stringify(value)}`);
    };
    const perTier: Record<TierId, Array<{ text: string; result: AssertionResult }>> = { 0: [], 1: [], 2: [] };
    try {
      for (const entry of evalCase.assertions) {
        let result: AssertionResult;
        try {
          result = await evaluateAssertion(entry.assertion, { transcript: outcome.transcript, rawTranscript: outcome.rawTranscript, values: store.values, scenario: evalCase.scenario, queryScalar, artifactsDir: store.artifactsDir, ...(judge ? { judge } : {}) });
        } catch (error) {
          result = { passed: false, detail: `assertion error: ${error instanceof Error ? error.message : String(error)}` };
        }
        perTier[entry.tier].push({ text: entry.line, result });
      }
    } finally {
      closeDatabase(db);
    }
    const tiers = { tier0: tierReport(0, perTier[0]), tier1: tierReport(1, perTier[1]), tier2: tierReport(2, perTier[2]) };
    const denials = outcome.transcript.result.permissionDenials.length;
    const passed = tiers.tier0.passed === tiers.tier0.total && denials === 0;
    const toolCalls = outcome.transcript.toolCalls.map((call) => call.shortName);
    const report: CaseReport = { ...base, prompt, passed, status: passed ? "passed" : "failed", duration_seconds: Number((outcome.transcript.result.durationMs / 1000).toFixed(1)), cost_usd: outcome.transcript.result.costUsd, turns: outcome.transcript.result.numTurns, tool_calls: toolCalls, permission_denials: denials, tiers };
    if (denials > 0) report.harness_error = `${denials} permission denial(s): the tool allowlist is misconfigured, not the skill.`;
    else if (outcome.timedOut) report.harness_error = `timed out after ${evalCase.timeoutSeconds}s`;
    await writeFile(join(caseDir, "_eval_final_message.md"), outcome.transcript.finalText);
    return report;
  } catch (error) {
    return { ...base, prompt: "", passed: false, status: "error", duration_seconds: 0, cost_usd: 0, turns: 0, tool_calls: [], permission_denials: 0, harness_error: error instanceof Error ? error.message : String(error), tiers: emptyTiers };
  } finally {
    if (!options.keep) await rm(scratch, { recursive: true, force: true });
    else process.stderr.write(`kept scratch for ${evalCase.skill}:${evalCase.name} at ${scratch}\n`);
  }
}

function markdownReport(summary: Record<string, unknown>, cases: CaseReport[]): string {
  const lines: string[] = [];
  lines.push(`# Skill eval results — ${summary.passed ? "PASSED" : "FAILED"}`, "");
  lines.push(`Run ${summary.run_id} started ${summary.started_at}; model ${summary.model}; ${summary.cases_passed}/${summary.cases_total} cases passed in ${summary.duration_seconds}s (cost $${summary.total_cost_usd}).`, "");
  lines.push("| Skill | Case | Result | Tier 0 | Tier 1 | Tier 2 | Turns | Seconds |", "|---|---|---|---|---|---|---|---|");
  const cell = (tier: TierReport) => tier.total === 0 ? "—" : `${tier.passed}/${tier.total}`;
  for (const entry of cases) lines.push(`| ${entry.skill} | ${entry.case} | ${entry.status === "passed" ? "PASSED" : entry.status.toUpperCase()} | ${cell(entry.tiers.tier0)} | ${cell(entry.tiers.tier1)} | ${cell(entry.tiers.tier2)} | ${entry.turns} | ${entry.duration_seconds} |`);
  const problems = cases.filter((entry) => entry.status !== "passed" || Object.values(entry.tiers).some((tier) => tier.passed < tier.total));
  if (problems.length > 0) {
    lines.push("", "## Details", "");
    for (const entry of problems) {
      lines.push(`### ${entry.skill}:${entry.case} — ${entry.status.toUpperCase()}`, "");
      if (entry.harness_error) lines.push(`Harness: ${entry.harness_error}`, "");
      if (entry.prompt) lines.push(`Prompt: \`${entry.prompt}\``, "");
      for (const tier of Object.values(entry.tiers)) {
        for (const assertion of tier.assertions) if (!assertion.passed) lines.push(`- [${tier.label}] ${assertion.text} — ${assertion.detail}`);
      }
      lines.push(`Transcript: ${entry.results_dir}/_eval_output.jsonl`, "");
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main(argv: string[]): Promise<number> {
  const options = parseArgs(argv);
  const projectRoot = resolve(process.env.CHILD_LEARNING_PROJECT_ROOT ?? process.cwd());
  const cases = await loadCases(projectRoot, parseFilter(options.filter));
  if (cases.length === 0) { process.stderr.write(`No eval cases matched ${options.filter ?? "(all)"}.\n`); return 2; }
  const startedAt = new Date();
  const runId = `${startedAt.toISOString().replace(/[:.]/g, "-")}-${randomBytes(2).toString("hex")}`;
  const resultsDir = join(projectRoot, ".data/evals", `eval-results-${runId}`);
  await mkdir(resultsDir, { recursive: true });
  process.stderr.write(`Running ${cases.length} case(s)${options.dryRun ? " (dry run)" : ` with model ${options.model}`}; results in ${resultsDir}\n`);
  let model = options.model;
  if (!options.dryRun) {
    const scratch = await mkdtemp(join(tmpdir(), "skill-eval-preflight-"));
    try {
      const store = await seedFixture("empty", join(scratch, "data"), projectRoot);
      const check = await preflight(projectRoot, scratch, store, options.model);
      if (!check.ok) { process.stderr.write(`Preflight failed:\n- ${check.problems.join("\n- ")}\n`); return 2; }
      if (check.model) model = check.model;
    } finally { await rm(scratch, { recursive: true, force: true }); }
  }
  const judge = options.dryRun ? undefined : makeJudge(options.judgeModel, 0.1);
  const reports: CaseReport[] = new Array(cases.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < cases.length) {
      const index = cursor; cursor += 1;
      const evalCase = cases[index]!;
      process.stderr.write(`▶ ${evalCase.skill}:${evalCase.name}\n`);
      const report = await runCase(evalCase, projectRoot, resultsDir, options, judge);
      reports[index] = report;
      process.stderr.write(`${report.status === "passed" || report.status === "dry-run" ? "✔" : "✘"} ${evalCase.skill}:${evalCase.name} ${report.status}${report.harness_error ? ` (${report.harness_error})` : ""}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency, cases.length) }, worker));
  const finishedAt = new Date();
  const casesPassed = reports.filter((report) => report.passed).length;
  const summary = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Number(((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)),
    model,
    dry_run: options.dryRun,
    cases_total: reports.length,
    cases_passed: casesPassed,
    cases_failed: reports.length - casesPassed,
    passed: casesPassed === reports.length,
    total_cost_usd: Number(reports.reduce((sum, report) => sum + report.cost_usd, 0).toFixed(4)),
    tier_scores: (["tier0", "tier1", "tier2"] as const).map((key) => { const total = reports.reduce((sum, report) => sum + report.tiers[key].total, 0); const passed = reports.reduce((sum, report) => sum + report.tiers[key].passed, 0); return { tier: key, total, passed, score: total === 0 ? null : Number((passed / total).toFixed(3)) }; }),
    cases: reports
  };
  await writeFile(join(resultsDir, "eval-results.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(join(resultsDir, "eval-results.md"), markdownReport(summary, reports));
  process.stderr.write(`${summary.passed ? "PASSED" : "FAILED"}: ${casesPassed}/${reports.length} cases\n`);
  process.stdout.write(`RESULTS_DIR=${resultsDir}\n`);
  return summary.passed ? 0 : 1;
}

main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 2; });
