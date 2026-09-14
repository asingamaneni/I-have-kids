// Assertion DSL for skill eval cases. One assertion per `- [ ]` line:
//
//   run.subtype == "success" | run.exit_code cmp | run.duration_seconds cmp | run.turns cmp | run.cost_usd cmp
//   final.contains "s" | final.not_contains "s" | final.matches /re/ | final.not_matches /re/
//   transcript.contains | transcript.not_contains | transcript.matches | transcript.not_matches
//   tool.called name | tool.not_called name | tool.called_before a b | tool.call_count [name] cmp
//   tool.errors cmp | tool.input name /re/ | tool.result name /re/
//   db.count table cmp | db.scalar "SELECT ..." cmp | artifacts.count cmp
//   judge "rubric"   (Tier 1/2 only; LLM graded)
//
// `cmp` is one of == != < <= > >= followed by a number. Strings are JSON string literals.
// `{{key}}` placeholders are substituted at evaluation time (regex-escaped inside /re/).
import { readdir } from "node:fs/promises";
import type { ParsedTranscript } from "./transcript.ts";

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function placeholderKeys(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((match) => match[1]!);
}

/** Substitute {{key}} placeholders. Unknown keys throw so a typo fails loudly. */
export function renderPlaceholders(text: string, values: Record<string, string>, options: { regexEscape?: boolean } = {}): string {
  return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`unknown placeholder {{${key}}}`);
    return options.regexEscape ? escapeRegExp(value) : value;
  });
}

export type Comparator = "==" | "!=" | "<" | "<=" | ">" | ">=";
export interface Comparison { op: Comparator; value: number; }
export interface RegexArg { body: string; flags: string; }

export type Assertion =
  | { kind: "run.subtype"; expected: string }
  | { kind: "run.exit_code" | "run.duration_seconds" | "run.turns" | "run.cost_usd"; cmp: Comparison }
  | { kind: "final.contains" | "final.not_contains" | "transcript.contains" | "transcript.not_contains"; text: string }
  | { kind: "final.matches" | "final.not_matches" | "transcript.matches" | "transcript.not_matches"; regex: RegexArg }
  | { kind: "tool.called" | "tool.not_called"; tool: string }
  | { kind: "tool.called_before"; first: string; second: string }
  | { kind: "tool.call_count"; tool?: string; cmp: Comparison }
  | { kind: "tool.errors"; cmp: Comparison }
  | { kind: "tool.input" | "tool.result"; tool: string; regex: RegexArg }
  | { kind: "db.count"; table: string; cmp: Comparison }
  | { kind: "db.scalar"; sql: string; cmp: Comparison }
  | { kind: "artifacts.count"; cmp: Comparison }
  | { kind: "judge"; rubric: string };

const COMPARATORS: Comparator[] = ["==", "!=", "<=", ">=", "<", ">"];
const IDENT = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

type Token = { type: "string"; value: string } | { type: "regex"; value: RegexArg } | { type: "word"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index]!;
    if (char === " " || char === "\t") { index += 1; continue; }
    if (char === '"') {
      let end = index + 1;
      while (end < input.length) {
        if (input[end] === "\\") { end += 2; continue; }
        if (input[end] === '"') break;
        end += 1;
      }
      if (end >= input.length) throw new Error(`unterminated string in "${input}"`);
      tokens.push({ type: "string", value: JSON.parse(input.slice(index, end + 1)) as string });
      index = end + 1;
      continue;
    }
    if (char === "/") {
      let end = index + 1;
      while (end < input.length) {
        if (input[end] === "\\") { end += 2; continue; }
        if (input[end] === "/") break;
        end += 1;
      }
      if (end >= input.length) throw new Error(`unterminated regex in "${input}"`);
      const body = input.slice(index + 1, end);
      let flagsEnd = end + 1;
      while (flagsEnd < input.length && /[a-z]/.test(input[flagsEnd]!)) flagsEnd += 1;
      const flags = input.slice(end + 1, flagsEnd);
      if (!/^[gimsuy]*$/.test(flags)) throw new Error(`invalid regex flags "${flags}" in "${input}"`);
      tokens.push({ type: "regex", value: { body, flags } });
      index = flagsEnd;
      continue;
    }
    let end = index;
    while (end < input.length && input[end] !== " " && input[end] !== "\t") end += 1;
    tokens.push({ type: "word", value: input.slice(index, end) });
    index = end;
  }
  return tokens;
}

function expectString(tokens: Token[], at: number, context: string): string {
  const token = tokens[at];
  if (!token || token.type !== "string") throw new Error(`${context}: expected a "quoted string"`);
  return token.value;
}
function expectRegex(tokens: Token[], at: number, context: string): RegexArg {
  const token = tokens[at];
  if (!token || token.type !== "regex") throw new Error(`${context}: expected a /regex/`);
  return token.value;
}
function expectWord(tokens: Token[], at: number, context: string): string {
  const token = tokens[at];
  if (!token || token.type !== "word" || !IDENT.test(token.value)) throw new Error(`${context}: expected a name`);
  return token.value;
}
function expectComparison(tokens: Token[], at: number, context: string): Comparison {
  const op = tokens[at];
  const num = tokens[at + 1];
  if (!op || op.type !== "word" || !COMPARATORS.includes(op.value as Comparator)) throw new Error(`${context}: expected a comparator (== != < <= > >=)`);
  if (!num || num.type !== "word" || Number.isNaN(Number(num.value))) throw new Error(`${context}: expected a number after ${op.value}`);
  return { op: op.value as Comparator, value: Number(num.value) };
}
function expectEnd(tokens: Token[], at: number, context: string): void {
  if (tokens.length > at) throw new Error(`${context}: unexpected trailing input`);
}

export function parseAssertion(line: string): Assertion {
  const tokens = tokenize(line.trim());
  const head = tokens[0];
  if (!head || head.type !== "word") throw new Error(`cannot parse assertion "${line}"`);
  const kind = head.value;
  const ctx = `"${line}"`;
  switch (kind) {
    case "run.subtype": {
      const op = tokens[1];
      if (!op || op.type !== "word" || op.value !== "==") throw new Error(`${ctx}: expected ==`);
      const expected = expectString(tokens, 2, ctx); expectEnd(tokens, 3, ctx);
      return { kind, expected };
    }
    case "run.exit_code": case "run.duration_seconds": case "run.turns": case "run.cost_usd": {
      const cmp = expectComparison(tokens, 1, ctx); expectEnd(tokens, 3, ctx);
      return { kind, cmp };
    }
    case "final.contains": case "final.not_contains": case "transcript.contains": case "transcript.not_contains": {
      const text = expectString(tokens, 1, ctx); expectEnd(tokens, 2, ctx);
      return { kind, text };
    }
    case "final.matches": case "final.not_matches": case "transcript.matches": case "transcript.not_matches": {
      const regex = expectRegex(tokens, 1, ctx); expectEnd(tokens, 2, ctx);
      return { kind, regex };
    }
    case "tool.called": case "tool.not_called": {
      const tool = expectWord(tokens, 1, ctx); expectEnd(tokens, 2, ctx);
      return { kind, tool };
    }
    case "tool.called_before": {
      const first = expectWord(tokens, 1, ctx); const second = expectWord(tokens, 2, ctx); expectEnd(tokens, 3, ctx);
      return { kind, first, second };
    }
    case "tool.call_count": {
      const maybeName = tokens[1];
      if (maybeName && maybeName.type === "word" && !COMPARATORS.includes(maybeName.value as Comparator)) {
        const tool = expectWord(tokens, 1, ctx); const cmp = expectComparison(tokens, 2, ctx); expectEnd(tokens, 4, ctx);
        return { kind, tool, cmp };
      }
      const cmp = expectComparison(tokens, 1, ctx); expectEnd(tokens, 3, ctx);
      return { kind, cmp };
    }
    case "tool.errors": {
      const cmp = expectComparison(tokens, 1, ctx); expectEnd(tokens, 3, ctx);
      return { kind, cmp };
    }
    case "tool.input": case "tool.result": {
      const tool = expectWord(tokens, 1, ctx); const regex = expectRegex(tokens, 2, ctx); expectEnd(tokens, 3, ctx);
      return { kind, tool, regex };
    }
    case "db.count": {
      const table = expectWord(tokens, 1, ctx); const cmp = expectComparison(tokens, 2, ctx); expectEnd(tokens, 4, ctx);
      return { kind, table, cmp };
    }
    case "db.scalar": {
      const sql = expectString(tokens, 1, ctx); const cmp = expectComparison(tokens, 2, ctx); expectEnd(tokens, 4, ctx);
      if (!/^\s*select\b/i.test(sql)) throw new Error(`${ctx}: db.scalar only accepts SELECT statements`);
      return { kind, sql, cmp };
    }
    case "artifacts.count": {
      const cmp = expectComparison(tokens, 1, ctx); expectEnd(tokens, 3, ctx);
      return { kind, cmp };
    }
    case "judge": {
      const rubric = expectString(tokens, 1, ctx); expectEnd(tokens, 2, ctx);
      return { kind, rubric };
    }
    default:
      throw new Error(`${ctx}: unknown assertion "${kind}"`);
  }
}

export function compare(actual: number, cmp: Comparison): boolean {
  switch (cmp.op) {
    case "==": return actual === cmp.value;
    case "!=": return actual !== cmp.value;
    case "<": return actual < cmp.value;
    case "<=": return actual <= cmp.value;
    case ">": return actual > cmp.value;
    case ">=": return actual >= cmp.value;
  }
}

export function compileRegex(regex: RegexArg, values: Record<string, string>): RegExp {
  return new RegExp(renderPlaceholders(regex.body, values, { regexEscape: true }), regex.flags);
}

export interface AssertionResult { passed: boolean; detail: string; }

export type Judge = (rubric: string, finalText: string, scenario: string) => Promise<AssertionResult>;

export interface EvaluationContext {
  transcript: ParsedTranscript;
  rawTranscript: string;
  values: Record<string, string>;
  scenario: string;
  /** Read-only SQLite scalar query against the case database. */
  queryScalar: (sql: string) => number;
  artifactsDir: string;
  judge?: Judge;
}

function numberResult(actual: number, cmp: Comparison, label: string): AssertionResult {
  return { passed: compare(actual, cmp), detail: `${label} = ${actual}` };
}

function truncate(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function evaluateAssertion(assertion: Assertion, ctx: EvaluationContext): Promise<AssertionResult> {
  const { transcript } = ctx;
  const calls = transcript.toolCalls;
  const shortNames = calls.map((call) => call.shortName);
  const render = (text: string) => renderPlaceholders(text, ctx.values);
  switch (assertion.kind) {
    case "run.subtype": return { passed: transcript.result.subtype === assertion.expected, detail: `subtype = ${transcript.result.subtype}` };
    case "run.exit_code": return numberResult(transcript.exitCode, assertion.cmp, "exit_code");
    case "run.duration_seconds": return numberResult(transcript.result.durationMs / 1000, assertion.cmp, "duration_seconds");
    case "run.turns": return numberResult(transcript.result.numTurns, assertion.cmp, "turns");
    case "run.cost_usd": return numberResult(transcript.result.costUsd, assertion.cmp, "cost_usd");
    case "final.contains": { const text = render(assertion.text); const hit = transcript.finalText.includes(text); return { passed: hit, detail: hit ? "found" : `final message lacks "${truncate(text, 80)}"` }; }
    case "final.not_contains": { const text = render(assertion.text); const hit = transcript.finalText.includes(text); return { passed: !hit, detail: hit ? `final message contains "${truncate(text, 80)}"` : "absent" }; }
    case "final.matches": { const re = compileRegex(assertion.regex, ctx.values); const match = transcript.finalText.match(re); return { passed: Boolean(match), detail: match ? `matched "${truncate(match[0], 80)}"` : `no match for ${re}` }; }
    case "final.not_matches": { const re = compileRegex(assertion.regex, ctx.values); const match = transcript.finalText.match(re); return { passed: !match, detail: match ? `matched "${truncate(match[0], 80)}"` : "no match" }; }
    case "transcript.contains": { const text = render(assertion.text); const hit = ctx.rawTranscript.includes(text); return { passed: hit, detail: hit ? "found" : `transcript lacks "${truncate(text, 80)}"` }; }
    case "transcript.not_contains": { const text = render(assertion.text); const hit = ctx.rawTranscript.includes(text); return { passed: !hit, detail: hit ? `transcript contains "${truncate(text, 80)}"` : "absent" }; }
    case "transcript.matches": { const re = compileRegex(assertion.regex, ctx.values); const match = ctx.rawTranscript.match(re); return { passed: Boolean(match), detail: match ? `matched "${truncate(match[0], 80)}"` : `no match for ${re}` }; }
    case "transcript.not_matches": { const re = compileRegex(assertion.regex, ctx.values); const match = ctx.rawTranscript.match(re); return { passed: !match, detail: match ? `matched "${truncate(match[0], 80)}"` : "no match" }; }
    case "tool.called": { const hit = shortNames.includes(assertion.tool); return { passed: hit, detail: hit ? "called" : `not called; tools used: ${[...new Set(shortNames)].join(", ") || "none"}` }; }
    case "tool.not_called": { const count = shortNames.filter((name) => name === assertion.tool).length; return { passed: count === 0, detail: count === 0 ? "not called" : `called ${count}×` }; }
    case "tool.called_before": {
      const first = shortNames.indexOf(assertion.first);
      const second = shortNames.indexOf(assertion.second);
      if (first === -1 || second === -1) return { passed: false, detail: `${first === -1 ? assertion.first : assertion.second} was never called` };
      return { passed: first < second, detail: `${assertion.first}@${first}, ${assertion.second}@${second}` };
    }
    case "tool.call_count": {
      const count = assertion.tool ? shortNames.filter((name) => name === assertion.tool).length : shortNames.length;
      return numberResult(count, assertion.cmp, assertion.tool ? `calls(${assertion.tool})` : "calls");
    }
    case "tool.errors": return numberResult(calls.filter((call) => call.isError).length, assertion.cmp, "tool errors");
    case "tool.input": {
      const re = compileRegex(assertion.regex, ctx.values);
      const matching = calls.filter((call) => call.shortName === assertion.tool);
      if (matching.length === 0) return { passed: false, detail: `${assertion.tool} was never called` };
      const hit = matching.some((call) => re.test(JSON.stringify(call.input)));
      return { passed: hit, detail: hit ? "input matched" : `no ${assertion.tool} input matched ${re}` };
    }
    case "tool.result": {
      const re = compileRegex(assertion.regex, ctx.values);
      const matching = calls.filter((call) => call.shortName === assertion.tool);
      if (matching.length === 0) return { passed: false, detail: `${assertion.tool} was never called` };
      const hit = matching.some((call) => re.test(call.resultText));
      return { passed: hit, detail: hit ? "result matched" : `no ${assertion.tool} result matched ${re}` };
    }
    case "db.count": {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(assertion.table)) return { passed: false, detail: `invalid table name ${assertion.table}` };
      try { return numberResult(ctx.queryScalar(`SELECT COUNT(*) FROM ${assertion.table}`), assertion.cmp, `count(${assertion.table})`); } catch (error) { return { passed: false, detail: `query failed: ${error instanceof Error ? error.message : String(error)}` }; }
    }
    case "db.scalar": {
      try { return numberResult(ctx.queryScalar(render(assertion.sql)), assertion.cmp, "scalar"); } catch (error) { return { passed: false, detail: `query failed: ${error instanceof Error ? error.message : String(error)}` }; }
    }
    case "artifacts.count": {
      let count = 0;
      const walk = async (dir: string): Promise<void> => {
        let entries: import("node:fs").Dirent[];
        try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          if (entry.isDirectory()) await walk(`${dir}/${entry.name}`);
          else if (entry.isFile() && entry.name !== "lineage.json") count += 1;
        }
      };
      await walk(ctx.artifactsDir);
      return numberResult(count, assertion.cmp, "artifacts");
    }
    case "judge": {
      if (!ctx.judge) return { passed: false, detail: "judge unavailable (dry run)" };
      return ctx.judge(render(assertion.rubric), transcript.finalText, ctx.scenario);
    }
  }
}
