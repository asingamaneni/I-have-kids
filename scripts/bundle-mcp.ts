import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(process.env.KINDERGARTEN_PROJECT_ROOT ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const sourceRoots = ["contracts", "domain", "database", "storage", "demo", "mcp-server"].map((name) => resolve(projectRoot, "packages", name, "src"));
async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? collectTypeScriptFiles(join(directory, entry.name))
    : entry.isFile() && entry.name.endsWith(".ts") ? [join(directory, entry.name)] : []));
  return files.flat();
}
const sourceFiles = (await Promise.all(sourceRoots.map(collectTypeScriptFiles))).flat().sort();
const entry = resolve(projectRoot, "packages/mcp-server/src/server.ts");
const outfile = resolve(projectRoot, "plugin/hooks/scripts/kindergarten-mcp.mjs");

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
  banner: { js: `/* kindergarten-mcp-source-sha256: ${sourceHash} */` },
  plugins: [{
    name: "local-better-sqlite3",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^better-sqlite3$/ }, () => ({ path: resolve(projectRoot, "packages/mcp-server/src/better-sqlite3-shim.ts") }));
      pluginBuild.onResolve({ filter: /^@kindergarten\/demo$/ }, () => ({ path: resolve(projectRoot, "packages/demo/src/seed.ts") }));
      // The demo package has a CLI entrypoint guard. Strip that side effect from
      // the embedded module so importing the MCP bundle never writes to stdout.
      pluginBuild.onLoad({ filter: /seed\.ts$/ }, async (args) => ({
        contents: (await readFile(args.path, "utf8")).replace(/\nif \(import\.meta\.url[\s\S]*$/, ""),
        loader: "ts",
      }));
    },
  }],
  logLevel: "info",
});
process.stdout.write(`Bundled local MCP server to ${outfile}\n`);
