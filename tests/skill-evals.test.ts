// Static guard for the skill eval corpus: every skill has cases, every case parses, the DSL is
// well-formed, and placeholders resolve. Runs in `pnpm test` without touching Claude.
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileRegex, evaluateAssertion, parseAssertion, placeholderKeys } from "../evals/assertions.ts";
import { buildPrompt, loadCases, parseCase, type EvalCase } from "../evals/cases.ts";
import { FIXTURES } from "../evals/fixtures.ts";
import { parseStreamJson } from "../evals/transcript.ts";

const projectRoot = resolve(import.meta.dirname, "..");

async function directories(path: string): Promise<string[]> {
  return (await readdir(path, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function fakeValues(fixture: string): Record<string, string> {
  return Object.fromEntries((FIXTURES[fixture]?.provides ?? []).map((key) => [key, `${key}-value.1`]));
}

describe("skill eval corpus", () => {
  it("gives every reusable skill and entry skill at least one case", async () => {
    const cases = await loadCases(projectRoot);
    const skills = await directories(join(projectRoot, "plugin/skills"));
    const commands = (await readdir(join(projectRoot, "plugin/commands"))).filter((name) => name.endsWith(".md")).map((name) => name.replace(/\.md$/, ""));
    const covered = new Set(cases.map((entry) => entry.skill));
    expect(skills.filter((skill) => !covered.has(skill))).toEqual([]);
    expect(commands.filter((command) => !covered.has(command))).toEqual([]);
    expect(cases.length).toBeGreaterThanOrEqual(skills.length + commands.length);
  });

  it("keeps every case consistent with its folder, fixture, and placeholders", async () => {
    const cases = await loadCases(projectRoot);
    const skills = new Set(await directories(join(projectRoot, "plugin/skills")));
    for (const evalCase of cases) {
      const folder = evalCase.entry ? evalCase.path.split("/")[3] : evalCase.path.split("/")[2];
      expect(evalCase.skill, evalCase.path).toBe(folder);
      expect(evalCase.entry, evalCase.path).toBe(!skills.has(evalCase.skill));
      expect(Object.keys(FIXTURES), evalCase.path).toContain(evalCase.fixture);
      const provided = new Set(FIXTURES[evalCase.fixture]!.provides);
      const referenced = [...placeholderKeys(evalCase.args), ...placeholderKeys(evalCase.prompt ?? ""), ...evalCase.assertions.flatMap((entry) => placeholderKeys(entry.line))];
      expect(referenced.filter((key) => !provided.has(key)), `${evalCase.path} references placeholders the fixture does not provide`).toEqual([]);
      expect(evalCase.assertions.some((entry) => entry.tier === 0), evalCase.path).toBe(true);
      expect(evalCase.assertions.filter((entry) => entry.tier === 0 && entry.assertion.kind === "judge"), evalCase.path).toEqual([]);
      const values = fakeValues(evalCase.fixture);
      expect(() => buildPrompt(evalCase, values), evalCase.path).not.toThrow();
      for (const entry of evalCase.assertions) if ("regex" in entry.assertion) expect(() => compileRegex(entry.assertion.regex, values), `${evalCase.path}: ${entry.line}`).not.toThrow();
    }
  });

  it("rejects malformed cases", () => {
    const base = "---\nname: x\nskill: check-work\nfixture: empty\n---\n\nScenario.\n\n## Assertions\n\n";
    expect(() => parseCase("x.md", `${base}### Tier 0 (Critical)\n- [ ] judge "no"\n`)).toThrow(/judge assertions are not allowed in Tier 0/);
    expect(() => parseCase("x.md", `${base}### Tier 0 (Critical)\n- [ ] tool.summoned foo\n`)).toThrow(/unknown assertion/);
    expect(() => parseCase("x.md", `${base}### Tier 1 (Important)\n- [ ] tool.called foo\n`)).toThrow(/Tier 0 must contain/);
    expect(() => parseCase("x.md", `${base}### Tier 0 (Critical)\n- [ ] tool.called foo\nstray prose\n`)).toThrow(/unexpected line/);
    expect(() => parseCase("x.md", `${base}### Tier 3 (Bonus)\n- [ ] tool.called foo\n`)).toThrow(/unknown tier heading/);
  });

  it("parses the assertion grammar precisely", () => {
    expect(parseAssertion('run.subtype == "success"')).toEqual({ kind: "run.subtype", expected: "success" });
    expect(parseAssertion("tool.call_count get_activity <= 3")).toEqual({ kind: "tool.call_count", tool: "get_activity", cmp: { op: "<=", value: 3 } });
    expect(parseAssertion("tool.call_count >= 1")).toEqual({ kind: "tool.call_count", cmp: { op: ">=", value: 1 } });
    expect(parseAssertion('final.matches /a\\/b "quoted"/i')).toEqual({ kind: "final.matches", regex: { body: 'a\\/b "quoted"', flags: "i" } });
    expect(parseAssertion('db.scalar "SELECT COUNT(*) FROM activities WHERE id = \'{{activityId}}\'" == 1')).toMatchObject({ kind: "db.scalar", cmp: { op: "==", value: 1 } });
    expect(() => parseAssertion('db.scalar "DELETE FROM activities" == 0')).toThrow(/only accepts SELECT/);
    expect(() => parseAssertion("final.matches /abc/q")).toThrow(/invalid regex flags/);
    expect(() => parseAssertion("tool.called")).toThrow(/expected a name/);
    expect(() => parseAssertion("db.count activities == 1 extra")).toThrow(/trailing/);
  });

  it("parses stream-json transcripts tolerantly", async () => {
    const raw = await readFile(join(projectRoot, "tests/fixtures/eval-transcript.jsonl"), "utf8");
    const transcript = parseStreamJson(raw, 0);
    expect(transcript.init?.mcpServers[0]?.status).toBe("connected");
    expect(transcript.toolCalls.map((call) => call.shortName)).toEqual(["get_activity", "get_progress"]);
    expect(transcript.toolCalls[0]?.resultText).toContain("activity-1");
    expect(transcript.toolCalls[1]?.isError).toBe(true);
    expect(transcript.finalText).toContain("scored 5 of 5");
    expect(transcript.result).toMatchObject({ subtype: "success", numTurns: 3, costUsd: 0.0123 });
    expect(transcript.parseErrors).toBe(1);
  });

  it("evaluates assertions against a parsed transcript", async () => {
    const raw = await readFile(join(projectRoot, "tests/fixtures/eval-transcript.jsonl"), "utf8");
    const transcript = parseStreamJson(raw, 0);
    const ctx = { transcript, rawTranscript: raw, values: { submissionId: "submission-1" }, scenario: "", queryScalar: () => 2, artifactsDir: join(projectRoot, "tests/fixtures") };
    const run = async (line: string) => (await evaluateAssertion(parseAssertion(line), ctx)).passed;
    expect(await run('run.subtype == "success"')).toBe(true);
    expect(await run("tool.called get_activity")).toBe(true);
    expect(await run("tool.not_called apply_override")).toBe(true);
    expect(await run("tool.called_before get_activity get_progress")).toBe(true);
    expect(await run("tool.call_count get_activity == 1")).toBe(true);
    expect(await run("tool.errors == 1")).toBe(true);
    expect(await run('tool.input get_activity /"adult":\\s*true/')).toBe(true);
    expect(await run('final.contains "{{submissionId}}"')).toBe(true);
    expect(await run("final.matches /{{submissionId}} scored/")).toBe(true);
    expect(await run("final.not_matches /traceback|panic/i")).toBe(true);
    expect(await run("db.count evaluations >= 2")).toBe(true);
    expect(await run("run.duration_seconds < 5")).toBe(true);
    expect(await run("artifacts.count >= 1")).toBe(true);
    expect(await run('judge "anything"')).toBe(false);
  });

  it("builds slash prompts for reusable and entry skills", () => {
    const base: Omit<EvalCase, "skill" | "entry" | "args"> = { path: "x", name: "x", fixture: "empty", invoke: "slash", timeoutSeconds: 1, maxTurns: 1, tools: [], scenario: "", assertions: [] };
    expect(buildPrompt({ ...base, skill: "check-work", entry: false, args: "{{a}} b" }, { a: "A" })).toBe("/child-learning:check-work A b");
    expect(buildPrompt({ ...base, skill: "child-learning-start", entry: true, args: "" }, {})).toBe("/child-learning:child-learning-start");
  });
});
