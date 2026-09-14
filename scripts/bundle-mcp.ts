import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(process.env.CHILD_LEARNING_PROJECT_ROOT ?? process.env.KINDERGARTEN_PROJECT_ROOT ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const sourceRoots = ["contracts", "domain", "database", "storage", "mcp-server"].map((name) => resolve(projectRoot, "packages", name, "src"));
async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? collectTypeScriptFiles(join(directory, entry.name))
    : entry.isFile() && entry.name.endsWith(".ts") ? [join(directory, entry.name)] : []));
  return files.flat();
}
const sourceFiles = (await Promise.all(sourceRoots.map(collectTypeScriptFiles))).flat().sort();
const entry = resolve(projectRoot, "packages/mcp-server/src/server.ts");
const outfile = resolve(projectRoot, "plugin/hooks/scripts/child-learning-mcp.mjs");

await mkdir(dirname(outfile), { recursive: true });
const sourceHash = createHash("sha256").update(Buffer.concat(await Promise.all(sourceFiles.map((file) => readFile(file))))).digest("hex");
await build({
  absWorkingDir: projectRoot,
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  banner: { js: `/* child-learning-mcp-source-sha256: ${sourceHash} */` },
  plugins: [{
    name: "local-better-sqlite3",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^better-sqlite3$/ }, () => ({ path: resolve(projectRoot, "packages/mcp-server/src/better-sqlite3-shim.ts") }));
    },
  }],
  logLevel: "info",
});
process.stdout.write(`Bundled local MCP server to ${outfile}\n`);
