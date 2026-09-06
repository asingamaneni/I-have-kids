import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export interface StoredArtifact {
  id: string;
  sha256: string;
  mediaType: string;
  byteLength: number;
  relativePath: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ArtifactStoreOptions {
  rootDir?: string;
  clock?: () => string;
  idFactory?: (sha256: string) => string;
}

export interface PutArtifactOptions {
  mediaType?: string;
  fileExtension?: string;
  metadata?: Record<string, unknown>;
  id?: string;
}

interface LineageEdge { parentArtifactId: string; childArtifactId: string; relation: string; createdAt: string; }

function extensionFor(mediaType: string, requested?: string): string {
  const candidate = requested ?? (mediaType === "text/plain" ? ".txt" : mediaType === "application/json" ? ".json" : "");
  if (!candidate) return "";
  const ext = candidate.startsWith(".") ? candidate : `.${candidate}`;
  return /^\.[a-zA-Z0-9]{1,12}$/.test(ext) ? ext.toLowerCase() : "";
}

function safeRelativePath(root: string, candidate: string): string {
  const absolute = resolve(root, candidate);
  const rel = relative(resolve(root), absolute);
  if (!rel || rel.startsWith("..") || rel.includes(`${"/"}..${"/"}`) || rel.includes("\\")) throw new Error("unsafe artifact path");
  return rel;
}

export class ArtifactStore {
  readonly rootDir: string;
  readonly clock: () => string;
  readonly idFactory: (sha256: string) => string;
  private readonly lineagePath: string;

  constructor(options: ArtifactStoreOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? process.env.LEARNING_WORKTABLE_ARTIFACTS ?? ".data/artifacts");
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? ((sha256) => `artifact-${sha256.slice(0, 24)}`);
    this.lineagePath = join(this.rootDir, "lineage.json");
  }

  async put(data: Uint8Array | string, options: PutArtifactOptions = {}): Promise<StoredArtifact> {
    const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const mediaType = options.mediaType ?? "application/octet-stream";
    const ext = extensionFor(mediaType, options.fileExtension);
    const relativePath = `${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}${ext}`;
    const safePath = safeRelativePath(this.rootDir, relativePath);
    const absolutePath = join(this.rootDir, safePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    try {
      await stat(absolutePath);
    } catch {
      const tempPath = join(dirname(absolutePath), `.${sha256}.${randomUUID()}.tmp`);
      await writeFile(tempPath, bytes, { flag: "wx", mode: 0o600 });
      await rename(tempPath, absolutePath);
    }
    const record: StoredArtifact = {
      id: options.id ?? this.idFactory(sha256), sha256, mediaType, byteLength: bytes.byteLength,
      relativePath: safePath, metadata: options.metadata ?? {}, createdAt: this.clock()
    };
    const metadataPath = `${absolutePath}.metadata.json`;
    try { await stat(metadataPath); } catch {
      const tempMeta = `${metadataPath}.${randomUUID()}.tmp`;
      await writeFile(tempMeta, JSON.stringify(record), { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(tempMeta, metadataPath);
    }
    return record;
  }

  async putText(text: string, metadata: Record<string, unknown> = {}): Promise<StoredArtifact> {
    return this.put(text, { mediaType: "text/plain", fileExtension: ".txt", metadata });
  }

  async read(record: Pick<StoredArtifact, "relativePath"> | string): Promise<Buffer> {
    const rel = typeof record === "string" ? record : record.relativePath;
    return readFile(join(this.rootDir, safeRelativePath(this.rootDir, rel)));
  }

  async readMetadata(record: Pick<StoredArtifact, "relativePath"> | string): Promise<StoredArtifact> {
    const rel = typeof record === "string" ? record : record.relativePath;
    const value = await readFile(join(this.rootDir, `${safeRelativePath(this.rootDir, rel)}.metadata.json`), "utf8");
    return JSON.parse(value) as StoredArtifact;
  }

  async addLineageEdge(parentArtifactId: string, childArtifactId: string, relation: string): Promise<LineageEdge> {
    if (parentArtifactId === childArtifactId) throw new Error("artifact lineage cannot contain a self-edge");
    const [parent, child] = await Promise.all([this.findById(parentArtifactId), this.findById(childArtifactId)]);
    if (!parent || !child) throw new Error("lineage edge references a missing artifact");
    return this.withLineageLock(async () => {
      const edges = await this.lineageEdges();
      if (this.reaches(edges, childArtifactId, parentArtifactId)) throw new Error("artifact lineage edge would create a cycle");
      const existing = edges.find((edge) => edge.parentArtifactId === parentArtifactId && edge.childArtifactId === childArtifactId && edge.relation === relation);
      if (existing) return existing;
      const edge = { parentArtifactId, childArtifactId, relation, createdAt: this.clock() };
      await this.atomicJsonWrite(this.lineagePath, [...edges, edge]);
      return edge;
    });
  }

  async lineageEdges(): Promise<LineageEdge[]> {
    try { return JSON.parse(await readFile(this.lineagePath, "utf8")) as LineageEdge[]; }
    catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }

  async findById(id: string): Promise<StoredArtifact | undefined> {
    const files = await this.findMetadataFiles();
    for (const file of files) {
      const value = JSON.parse(await readFile(file, "utf8")) as StoredArtifact;
      if (value.id === id) return value;
    }
    return undefined;
  }

  private async findMetadataFiles(): Promise<string[]> {
    const result: string[] = [];
    const visit = async (dir: string): Promise<void> => {
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); }
      catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) await visit(full);
        else if (entry.isFile() && entry.name.endsWith(".metadata.json")) result.push(full);
      }
    };
    await visit(this.rootDir);
    return result;
  }

  private async withLineageLock<T>(work: () => Promise<T>): Promise<T> {
    await mkdir(this.rootDir, { recursive: true });
    const lockPath = `${this.lineagePath}.lock`;
    let handle;
    for (let attempt = 0; attempt < 400; attempt += 1) {
      try { handle = await open(lockPath, "wx", 0o600); break; }
      catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await new Promise((resolveWait) => setTimeout(resolveWait, 5));
      }
    }
    if (!handle) throw new Error("timed out waiting for artifact lineage lock");
    try { return await work(); }
    finally { await handle.close(); await unlink(lockPath).catch(() => undefined); }
  }

  private reaches(edges: LineageEdge[], from: string, target: string, seen = new Set<string>()): boolean {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return edges.filter((edge) => edge.parentArtifactId === from).some((edge) => this.reaches(edges, edge.childArtifactId, target, seen));
  }

  private async atomicJsonWrite(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temp, path);
  }
}

export const ContentAddressedArtifactStore = ArtifactStore;
