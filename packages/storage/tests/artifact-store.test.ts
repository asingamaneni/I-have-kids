import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ArtifactStore } from "../src/index.js";

describe("content-addressed artifact store", () => {
  it("writes atomically at the SHA-256 path and preserves metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-artifacts-"));
    try {
      const store = new ArtifactStore({ rootDir: root, clock: () => "2026-01-01T00:00:00.000Z" });
      const value = "demo text";
      const artifact = await store.putText(value, { purpose: "test" });
      const hash = createHash("sha256").update(value).digest("hex");
      expect(artifact.sha256).toBe(hash);
      expect(artifact.relativePath).toContain(`${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}`);
      expect((await store.read(artifact)).toString()).toBe(value);
      expect((await store.readMetadata(artifact)).metadata).toEqual({ purpose: "test" });
      expect(await readFile(join(root, artifact.relativePath), "utf8")).toBe(value);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("preserves concurrent lineage writes from separate store instances", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-lineage-concurrent-"));
    try {
      const first = new ArtifactStore({ rootDir: root });
      const second = new ArtifactStore({ rootDir: root });
      const [a, b, c, d] = await Promise.all([first.put("a", { id: "a" }), first.put("b", { id: "b" }), first.put("c", { id: "c" }), first.put("d", { id: "d" })]);
      await Promise.all([first.addLineageEdge(a.id, b.id, "generated"), second.addLineageEdge(c.id, d.id, "generated")]);
      expect(await first.lineageEdges()).toEqual(expect.arrayContaining([expect.objectContaining({ parentArtifactId: "a", childArtifactId: "b" }), expect.objectContaining({ parentArtifactId: "c", childArtifactId: "d" })]));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects missing-parent and cyclic lineage edges", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-lineage-"));
    try {
      const store = new ArtifactStore({ rootDir: root });
      const a = await store.put("a", { id: "a", mediaType: "text/plain", fileExtension: ".txt" });
      const b = await store.put("b", { id: "b", mediaType: "text/plain", fileExtension: ".txt" });
      await expect(store.addLineageEdge("missing", b.id, "generated")).rejects.toThrow(/missing artifact/);
      await store.addLineageEdge(a.id, b.id, "generated");
      await expect(store.addLineageEdge(b.id, a.id, "corrected")).rejects.toThrow(/cycle/);
      expect((await store.lineageEdges()).length).toBe(1);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
