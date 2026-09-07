import { access, readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

const projectRoot = resolve(process.env.KINDERGARTEN_PROJECT_ROOT ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const commandSourceRoot = resolve(projectRoot, "plugin/commands");
const skillSourceRoot = resolve(projectRoot, "plugin/skills");
const outputRoot = resolve(projectRoot, "dist/plugin/claude");
const failures: string[] = [];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function markdownBody(source: string): string {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Expected YAML frontmatter followed by a Markdown body.");
  return match[1]!.trim();
}

function frontmatterValue(source: string, key: string): string | undefined {
  const match = source.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"));
  return match?.[1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasYamlScalar(source: string, key: string, value: string): boolean {
  return new RegExp(`^${escapeRegExp(key)}:\\s*["']?${escapeRegExp(value)}["']?\\s*$`, "m").test(source);
}

const commandFiles = (await readdir(commandSourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort();

for (const commandFile of commandFiles) {
  const name = basename(commandFile, ".md");
  const source = await readFile(resolve(commandSourceRoot, commandFile), "utf8");
  const outputPath = resolve(outputRoot, "skills", name, "SKILL.md");

  if (!(await exists(outputPath))) {
    failures.push(`Missing generated entry skill: skills/${name}/SKILL.md`);
    continue;
  }

  const output = await readFile(outputPath, "utf8");
  const argumentHint = frontmatterValue(source, "argumentHint");
  if (!hasYamlScalar(output, "name", name)) failures.push(`${name}: generated name is missing or incorrect`);
  if (!hasYamlScalar(output, "disable-model-invocation", "true")) failures.push(`${name}: disable-model-invocation must be true`);
  if (!hasYamlScalar(output, "user-invocable", "true")) failures.push(`${name}: user-invocable must be true`);
  if (argumentHint && !hasYamlScalar(output, "argument-hint", argumentHint)) failures.push(`${name}: argument hint was not preserved`);
  if (!output.includes(markdownBody(source))) failures.push(`${name}: command body was not preserved`);
}

const reusableSkillNames = (await readdir(skillSourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of reusableSkillNames) {
  if (!(await exists(resolve(outputRoot, "skills", name, "SKILL.md")))) failures.push(`Missing reusable skill: skills/${name}/SKILL.md`);
}

if (await exists(resolve(outputRoot, "commands"))) failures.push("Generated Claude output still contains the legacy commands/ directory");

if (failures.length > 0) {
  throw new Error(`Claude plugin output verification failed:\n- ${failures.join("\n- ")}`);
}

process.stdout.write(`Verified ${commandFiles.length} manual entry skills and ${reusableSkillNames.length} reusable skills in ${outputRoot}\n`);
