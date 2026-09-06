import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ArtifactStore, normalizeImage } from "../src/index.js";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, payload: ArrayLike<number>): Uint8Array {
  const typeBytes = Uint8Array.from(type, (value) => value.charCodeAt(0));
  const data = Uint8Array.from(payload);
  const result = new Uint8Array(12 + data.length);
  new DataView(result.buffer).setUint32(0, data.length, false);
  result.set(typeBytes, 4);
  result.set(data, 8);
  new DataView(result.buffer).setUint32(8 + data.length, crc32(Uint8Array.from([...typeBytes, ...data])), false);
  return result;
}

function pngWithMetadata(): Uint8Array {
  const header = chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
  const metadata = chunk("tEXt", [107, 101, 121, 0, 115, 101, 99, 114, 101, 116]);
  const time = chunk("tIME", [7, 234, 1, 1, 0, 0, 0]);
  const data = chunk("IDAT", deflateSync(Uint8Array.from([0, 0, 0, 0, 0])));
  const end = chunk("IEND", []);
  return Uint8Array.from([...PNG_SIGNATURE, ...header, ...metadata, ...time, ...data, ...end]);
}

function jpegWithMetadata(): Uint8Array {
  const app1 = [0xff, 0xe1, 0, 8, 69, 120, 105, 102, 0, 0];
  const app13 = [0xff, 0xed, 0, 6, 80, 83, 0, 0];
  const comment = [0xff, 0xfe, 0, 6, 104, 105, 0, 0];
  const sof0 = [0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1, 0x11, 0];
  const sos = [0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0];
  return Uint8Array.from([0xff, 0xd8, ...app1, ...app13, ...comment, ...sof0, ...sos, 0, 0xff, 0xd9]);
}

describe("safe image normalization", () => {
  it("detects PNG bytes, removes metadata, and canonicalizes the MIME and extension", () => {
    const normalized = normalizeImage(pngWithMetadata());
    expect(normalized.mediaType).toBe("image/png");
    expect(normalized.extension).toBe(".png");
    expect(new TextDecoder().decode(normalized.bytes)).not.toContain("secret");
    expect(Array.from(normalized.bytes.slice(0, 8))).toEqual(Array.from(PNG_SIGNATURE));
  });

  it("detects JPEG bytes and removes APP1, APP13, and COM metadata", () => {
    const normalized = normalizeImage(jpegWithMetadata());
    expect(normalized.mediaType).toBe("image/jpeg");
    expect(normalized.extension).toBe(".jpg");
    expect(Array.from(normalized.bytes)).not.toContain(0xe1);
    expect(Array.from(normalized.bytes)).not.toContain(0xed);
    expect(Array.from(normalized.bytes)).not.toContain(0xfe);
    expect(normalized.bytes.at(-2)).toBe(0xff);
    expect(normalized.bytes.at(-1)).toBe(0xd9);
  });

  it("rejects MIME/content spoofing, malformed, truncated, animated, and unsupported input", () => {
    expect(() => normalizeImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toThrow(/unsupported format/i);
    expect(() => normalizeImage(Uint8Array.from([0x25, 0x50, 0x44, 0x46]))).toThrow(/unsupported format/i);
    expect(() => normalizeImage(Uint8Array.from([...PNG_SIGNATURE, ...chunk("IHDR", [0, 0, 0, 1])]))).toThrow(/chunk|IHDR|truncated/i);
    const apng = Uint8Array.from([...PNG_SIGNATURE, ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]), ...chunk("acTL", [0, 0, 0, 1, 0, 0, 0, 1]), ...chunk("IDAT", [1]), ...chunk("IEND", [])]);
    expect(() => normalizeImage(apng)).toThrow(/animated/i);
    expect(() => normalizeImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 8]))).toThrow(/JPEG|truncated/i);
    const oversized = Uint8Array.from([...PNG_SIGNATURE, ...chunk("IHDR", [0, 0, 0x4e, 0x20, 0, 0, 0, 1, 8, 6, 0, 0, 0]), ...chunk("IDAT", [1]), ...chunk("IEND", [])]);
    expect(() => normalizeImage(oversized)).toThrow(/dimensions are too large/i);
  });

  it("keeps original and normalized artifacts immutable and records lineage", async () => {
    const root = await mkdtemp(join(process.cwd(), ".tmp-image-lineage-"));
    try {
      const store = new ArtifactStore({ rootDir: root });
      const originalBytes = pngWithMetadata();
      const normalizedBytes = normalizeImage(originalBytes).bytes;
      const original = await store.put(originalBytes, { mediaType: "image/png", fileExtension: ".png", metadata: { artifactRole: "original-upload" } });
      const normalized = await store.put(normalizedBytes, { mediaType: "image/png", fileExtension: ".png", metadata: { artifactRole: "normalized-review-upload" } });
      await store.addLineageEdge(original.id, normalized.id, "normalized-from");
      expect(original.id).not.toBe(normalized.id);
      expect((await store.read(original)).byteLength).toBe(originalBytes.byteLength);
      expect((await store.read(normalized)).byteLength).toBe(normalizedBytes.byteLength);
      expect((await store.readMetadata(original)).metadata.artifactRole).toBe("original-upload");
      expect((await store.lineageEdges())).toEqual([expect.objectContaining({ parentArtifactId: original.id, childArtifactId: normalized.id, relation: "normalized-from" })]);
      expect(original.sha256).toBe(createHash("sha256").update(originalBytes).digest("hex"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
