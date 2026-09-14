// Skill eval case files: `plugin/skills/<skill>/evals/<case>.md` for reusable skills and
// `plugin/commands/evals/<command>/<case>.md` for entry skills. Each file is YAML-ish
// frontmatter (flat scalars only) followed by a markdown body whose `### Tier N` headings
// group `- [ ] <assertion>` lines. See docs/decisions/0010-skill-evals.md.
import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { parseAssertion, renderPlaceholders, type Assertion } from "./assertions.ts";

export type TierId = 0 | 1 | 2;
export const TIER_LABELS: Record<TierId, string> = { 0: "Tier 0 (Critical)", 1: "Tier 1 (Important)", 2: "Tier 2 (Capability Tracking)" };

export interface CaseAssertion { tier: TierId; line: string; assertion: Assertion; }

export interface EvalCase {
  /** Path relative to the project root, e.g. plugin/skills/check-work/evals/grades-stored-submission.md */
  path: string;
  name: string;
  skill: string;
  entry: boolean;
  fixture: string;
  args: string;
  /** Only used when invoke is "natural": the literal prompt instead of a slash invocation. */
  prompt?: string;
  invoke: "slash" | "natural";
  timeoutSeconds: number;
  maxTurns: number;
  /** Per-case spend cap in USD; overrides the runner default when set. */
  maxBudgetUsd?: number;
  /** Built-in Claude tools the case additionally exposes (e.g. Bash for verification skills). Default none. */
  tools: string[];
  scenario: string;
  assertions: CaseAssertion[];
}

export interface ParsedFrontmatter { fields: Record<string, string>; body: string; }

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Expected YAML frontmatter followed by a Markdown body.");
  const fields: Record<string, string> = {};
  for (const rawLine of match[1]!.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) throw new Error(`Malformed frontmatter line: ${line}`);
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    fields[key] = value;
  }
  return { fields, body: match[2]! };
}

function tierFromHeading(heading: string): TierId | undefined {
  const match = heading.match(/^###\s+Tier\s+([012])\b/i);
  return match ? (Number(match[1]) as TierId) : undefined;
}

export function parseCase(path: string, source: string): EvalCase {
  const { fields, body } = parseFrontmatter(source);
  const name = fields.name ?? basename(path, ".md");
  const skill = fields.skill;
  if (!skill) throw new Error(`${path}: frontmatter must declare skill`);
  const fixture = fields.fixture ?? "empty";
  const invoke = fields.invoke === "natural" ? "natural" : "slash";
  if (invoke === "natural" && !fields.prompt) throw new Error(`${path}: invoke: natural requires a prompt`);
  const assertions: CaseAssertion[] = [];
  const scenarioLines: string[] = [];
  let tier: TierId | undefined;
  let inAssertions = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^##\s+Assertions\b/i.test(line)) { inAssertions = true; continue; }
    if (!inAssertions) { scenarioLines.push(line); continue; }
    if (line.startsWith("###")) {
      tier = tierFromHeading(line);
      if (tier === undefined) throw new Error(`${path}: unknown tier heading "${line}"`);
      continue;
    }
    const item = line.match(/^\s*-\s+\[( |x)\]\s+(.+)$/);
    if (!item) {
      if (line.trim() === "") continue;
      throw new Error(`${path}: unexpected line inside Assertions: "${line}"`);
    }
    if (tier === undefined) throw new Error(`${path}: assertion appears before any tier heading`);
    const text = item[2]!.replace(/\s+—.*$/, "").trim();
    let assertion: Assertion;
    try { assertion = parseAssertion(text); } catch (error) { throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
    if (tier === 0 && assertion.kind === "judge") throw new Error(`${path}: judge assertions are not allowed in Tier 0`);
    assertions.push({ tier, line: text, assertion });
  }
  if (assertions.length === 0) throw new Error(`${path}: no assertions found`);
  if (!assertions.some((entry) => entry.tier === 0)) throw new Error(`${path}: Tier 0 must contain at least one assertion`);
  return {
    path, name, skill, fixture, invoke,
    entry: fields.entry === "true",
    args: fields.args ?? "",
    ...(fields.prompt ? { prompt: fields.prompt } : {}),
    timeoutSeconds: Number(fields.timeout_seconds ?? 600),
    maxTurns: Number(fields.max_turns ?? 25),
    ...(fields.max_budget_usd ? { maxBudgetUsd: Number(fields.max_budget_usd) } : {}),
    tools: (fields.tools ?? "").split(",").map((tool) => tool.trim()).filter(Boolean),
    scenario: scenarioLines.join("\n").trim(),
    assertions
  };
}

async function listCaseFiles(directory: string): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => join(directory, entry.name)).sort();
}

export interface CaseFilter { skill?: string; caseName?: string; }

export function parseFilter(value: string | undefined): CaseFilter {
  if (!value) return {};
  const [skill, caseName] = value.split(":");
  return { ...(skill ? { skill } : {}), ...(caseName ? { caseName } : {}) };
}

/** Load every case under plugin/skills/*\/evals and plugin/commands/evals/*. */
export async function loadCases(projectRoot: string, filter: CaseFilter = {}): Promise<EvalCase[]> {
  const files: string[] = [];
  const skillsRoot = join(projectRoot, "plugin/skills");
  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await listCaseFiles(join(skillsRoot, entry.name, "evals")));
  }
  const commandsRoot = join(projectRoot, "plugin/commands/evals");
  let commandDirs: import("node:fs").Dirent[] = [];
  try { commandDirs = await readdir(commandsRoot, { withFileTypes: true }); } catch { /* optional */ }
  for (const entry of commandDirs) {
    if (entry.isDirectory()) files.push(...await listCaseFiles(join(commandsRoot, entry.name)));
  }
  const cases: EvalCase[] = [];
  for (const file of files) {
    const parsed = parseCase(relative(projectRoot, file), await readFile(file, "utf8"));
    if (filter.skill && parsed.skill !== filter.skill) continue;
    if (filter.caseName && parsed.name !== filter.caseName) continue;
    cases.push(parsed);
  }
  return cases;
}

export { escapeRegExp, placeholderKeys, renderPlaceholders } from "./assertions.ts";

/** Slash invocation for a case, e.g. `/child-learning:check-work activity-1 submission-1`. */
export function buildPrompt(evalCase: EvalCase, values: Record<string, string>): string {
  if (evalCase.invoke === "natural") return renderPlaceholders(evalCase.prompt!, values);
  const args = renderPlaceholders(evalCase.args, values).trim();
  return `/child-learning:${evalCase.skill}${args ? ` ${args}` : ""}`;
}
