import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MCP bundle", () => {
  it("is freshly generated and embeds the current source hash", async () => {
    const root = resolve(import.meta.dirname, "../../..");
    execFileSync("pnpm", ["exec", "tsx", "scripts/bundle-mcp.ts"], { cwd: root, stdio: "ignore" });
    const sourceRoots = ["contracts", "domain", "database", "storage", "demo", "mcp-server"].map((name) => resolve(root, "packages", name, "src"));
    const collect = async (directory: string): Promise<string[]> => {
      const entries = await readdir(directory, { withFileTypes: true });
      return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? collect(join(directory, entry.name)) : entry.isFile() && entry.name.endsWith(".ts") ? [join(directory, entry.name)] : []))).flat();
    };
    const sourcePaths = (await Promise.all(sourceRoots.map(collect))).flat().sort();
    const bundlePath = resolve(root, "plugin/hooks/scripts/child-learning-mcp.mjs");
    const source = await Promise.all(sourcePaths.map((file) => readFile(file)));
    const bundle = await readFile(bundlePath, "utf8");
    const hash = createHash("sha256").update(Buffer.concat(source)).digest("hex");
    expect(bundle).toContain(`child-learning-mcp-source-sha256: ${hash}`);
    expect((await stat(bundlePath)).mtimeMs).toBeGreaterThanOrEqual(Math.max(...(await Promise.all(sourcePaths.map(async (file) => (await stat(file)).mtimeMs)))));
    expect(bundle).toContain("child-learning-local");
  });
});
