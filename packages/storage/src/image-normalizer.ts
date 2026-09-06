import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 40_000_000;

function validateDimensions(width: number, height: number): void {
  if (!width || !height) throw imageError("image dimensions must be non-zero");
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) throw imageError("image dimensions are too large for local review");
}

export type CanonicalImageMime = "image/png" | "image/jpeg";

export interface NormalizedImage {
  bytes: Uint8Array;
  mediaType: CanonicalImageMime;
  extension: ".png" | ".jpg";
}

function imageError(message: string): Error {
  return new Error(`Invalid image upload: ${message}`);
}

function equalBytes(bytes: Uint8Array, expected: Uint8Array, offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function byteAt(bytes: ArrayLike<number>, index: number): number {
  const value = bytes[index];
  if (value === undefined) throw imageError("image bytes are truncated");
  return value;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

let crcTable: Uint32Array | undefined;
function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    crcTable[index] = value >>> 0;
  }
  return crcTable;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  const table = getCrcTable();
  for (const byte of bytes) value = byteAt(table, (value ^ byte) & 0xff) ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(byteAt(bytes, offset), byteAt(bytes, offset + 1), byteAt(bytes, offset + 2), byteAt(bytes, offset + 3));
}

function validatePng(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength < PNG_SIGNATURE.byteLength + 12 || !equalBytes(bytes, PNG_SIGNATURE)) {
    throw imageError("expected a PNG signature");
  }

  const chunks: Uint8Array[] = [bytes.slice(0, PNG_SIGNATURE.byteLength)];
  let offset = PNG_SIGNATURE.byteLength;
  let sawHeader = false;
  let sawData = false;
  let sawEnd = false;
  let sawPalette = false;
  let sawTransparency = false;
  let idatEnded = false;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  const imageData: Uint8Array[] = [];

  while (offset < bytes.byteLength) {
    if (bytes.byteLength - offset < 12) throw imageError("PNG chunk header or trailer is truncated");
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    const length = view.getUint32(0, false);
    const chunkTotal = 12 + length;
    if (chunkTotal > bytes.byteLength - offset) throw imageError("PNG chunk length exceeds the file bounds");
    const type = pngChunkType(bytes, offset + 4);
    if (!/^[A-Za-z]{4}$/.test(type)) throw imageError("PNG chunk type is malformed");
    const typeBytes = bytes.slice(offset + 4, offset + 8);
    const chunk = bytes.slice(offset, offset + chunkTotal);
    const payload = bytes.slice(offset + 8, offset + 8 + length);
    const storedCrc = new DataView(bytes.buffer, bytes.byteOffset + offset + 8 + length, 4).getUint32(0, false);
    const computedCrc = crc32(concat([typeBytes, payload]));
    if (storedCrc !== computedCrc) throw imageError(`PNG chunk ${type} has an invalid checksum`);

    if (!sawHeader && type !== "IHDR") throw imageError("PNG must begin with IHDR");
    if (sawEnd) throw imageError("PNG contains data after IEND");
    if (type === "IHDR") {
      if (sawHeader || length !== 13) throw imageError("PNG IHDR is missing or malformed");
      const header = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      width = header.getUint32(0, false);
      height = header.getUint32(4, false);
      bitDepth = byteAt(payload, 8);
      colorType = byteAt(payload, 9);
      validateDimensions(width, height);
      if (byteAt(payload, 10) !== 0 || byteAt(payload, 11) !== 0) throw imageError("PNG uses an unsupported compression or filter method");
      if (byteAt(payload, 12) !== 0) throw imageError("interlaced PNGs are not supported; upload a non-interlaced PNG");
      const validDepth = colorType === 0 ? [1, 2, 4, 8, 16].includes(bitDepth)
        : colorType === 2 ? [8, 16].includes(bitDepth)
          : colorType === 3 ? [1, 2, 4, 8].includes(bitDepth)
            : colorType === 4 || colorType === 6 ? [8, 16].includes(bitDepth) : false;
      if (!validDepth) throw imageError("PNG color type or bit depth is unsupported");
      sawHeader = true;
      chunks.push(chunk);
    } else if (type === "PLTE") {
      if (!sawHeader || sawData || sawPalette || length === 0 || length % 3 !== 0 || length > 768) throw imageError("PNG palette is malformed");
      sawPalette = true;
      chunks.push(chunk);
    } else if (type === "tRNS") {
      if (!sawHeader || sawData || sawTransparency) throw imageError("PNG transparency chunk is misplaced or duplicated");
      sawTransparency = true;
      chunks.push(chunk);
    } else if (type === "IDAT") {
      if (!sawHeader || idatEnded || !length) throw imageError("PNG image data is missing or malformed");
      sawData = true;
      imageData.push(payload);
      chunks.push(chunk);
    } else if (type === "IEND") {
      if (!sawHeader || !sawData || length !== 0) throw imageError("PNG IEND is missing or misplaced");
      sawEnd = true;
      chunks.push(chunk);
    } else if (type === "acTL" || type === "fcTL" || type === "fdAT") {
      throw imageError("animated PNGs are not supported; upload a static PNG");
    } else {
      const critical = (byteAt(bytes, offset + 4) & 0x20) === 0;
      if (critical) throw imageError(`PNG chunk ${type} is unsupported`);
      // Ancillary chunks are intentionally omitted to remove metadata and minimize the review artifact.
    }

    if (type !== "IDAT" && sawData) idatEnded = true;
    offset += chunkTotal;
  }

  if (!sawHeader || !sawData || !sawEnd || offset !== bytes.byteLength) throw imageError("PNG must contain IHDR, IDAT, and a final IEND");
  // PLTE is required for indexed-color images; checking it here keeps malformed files out.
  if (colorType === 3 && !sawPalette) throw imageError("indexed PNG is missing its palette");
  const channels = colorType === 0 || colorType === 3 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
  let inflated: Uint8Array;
  try { inflated = new Uint8Array(inflateSync(concat(imageData))); }
  catch { throw imageError("PNG image data cannot be decoded"); }
  if (inflated.byteLength !== height * (rowBytes + 1)) throw imageError("PNG image data length does not match its dimensions");
  for (let row = 0; row < height; row += 1) if (byteAt(inflated, row * (rowBytes + 1)) > 4) throw imageError("PNG row uses an invalid filter type");
  return concat(chunks);
}

function isSof(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
}

function jpegMarkerName(marker: number): string {
  return `0x${marker.toString(16).padStart(2, "0")}`;
}

function validateJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength < 4 || byteAt(bytes, 0) !== 0xff || byteAt(bytes, 1) !== 0xd8) throw imageError("expected a JPEG SOI marker");
  const parts: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;
  let sawSof = false;
  let sawSos = false;
  let sawEoi = false;

  while (offset < bytes.byteLength) {
    if (byteAt(bytes, offset) !== 0xff) throw imageError("JPEG marker is missing its 0xFF prefix");
    while (byteAt(bytes, offset) === 0xff) offset += 1;
    if (offset >= bytes.byteLength) throw imageError("JPEG marker is truncated");
    const marker = byteAt(bytes, offset);
    offset += 1;
    if (marker === 0x00) throw imageError("JPEG contains an invalid stuffed byte outside image data");
    if (marker === 0xd9) throw imageError("JPEG scan data is missing before EOI");
    if (marker === 0xd8) throw imageError("JPEG contains a nested SOI marker");
    if (marker === 0xda) {
      if (!sawSof || sawSos) throw imageError("JPEG scan marker is missing or duplicated");
      sawSos = true;
      if (bytes.byteLength - offset < 2) throw imageError("JPEG SOS segment is truncated");
      const length = (byteAt(bytes, offset) << 8) | byteAt(bytes, offset + 1);
      const components = byteAt(bytes, offset + 2);
      if (length < 6 || !components || length !== 6 + components * 2 || length > bytes.byteLength - offset) throw imageError("JPEG SOS segment length is invalid");
      parts.push(bytes.slice(offset - 2, offset + length));
      offset += length;

      const scanStart = offset;
      let eoiOffset = -1;
      while (offset < bytes.byteLength) {
        if (byteAt(bytes, offset) !== 0xff) {
          offset += 1;
          continue;
        }
        let markerOffset = offset;
        while (markerOffset < bytes.byteLength && byteAt(bytes, markerOffset) === 0xff) markerOffset += 1;
        if (markerOffset >= bytes.byteLength) throw imageError("JPEG scan data is truncated");
        const scanMarker = byteAt(bytes, markerOffset);
        if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
          offset = markerOffset + 1;
          continue;
        }
        if (scanMarker === 0xd9) {
          eoiOffset = offset;
          offset = markerOffset + 1;
          break;
        }
        throw imageError(`JPEG contains an unsupported marker ${jpegMarkerName(scanMarker)} inside scan data`);
      }
      if (eoiOffset < 0) throw imageError("JPEG is truncated before EOI");
      parts.push(bytes.slice(scanStart, offset));
      sawEoi = true;
      if (offset !== bytes.byteLength) throw imageError("JPEG contains trailing data after EOI");
      break;
    }

    const standalone = marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
    if (standalone) throw imageError("JPEG contains an unsupported standalone marker before SOS");
    if (bytes.byteLength - offset < 2) throw imageError(`JPEG marker ${jpegMarkerName(marker)} segment is truncated`);
    const length = (byteAt(bytes, offset) << 8) | byteAt(bytes, offset + 1);
    if (length < 2 || length > bytes.byteLength - offset) throw imageError(`JPEG marker ${jpegMarkerName(marker)} has an invalid segment length`);
    const segmentStart = offset - 2;
    const segmentEnd = offset + length;
    const segment = bytes.slice(segmentStart, segmentEnd);

    if (isSof(marker)) {
      if (marker !== 0xc0) throw imageError("only baseline static JPEGs are supported");
      if (length < 8) throw imageError("JPEG frame header is malformed");
      const precision = byteAt(bytes, offset + 2);
      const height = (byteAt(bytes, offset + 3) << 8) | byteAt(bytes, offset + 4);
      const width = (byteAt(bytes, offset + 5) << 8) | byteAt(bytes, offset + 6);
      const components = byteAt(bytes, offset + 7);
      if (precision !== 8 || components < 1 || components > 4 || length !== 8 + components * 3) throw imageError("JPEG frame header is unsupported or malformed");
      validateDimensions(width, height);
      if (sawSof) throw imageError("JPEG contains multiple frame headers");
      sawSof = true;
    }

    // APP1 (EXIF/XMP), APP13 (IPTC/Photoshop), and COM are metadata and are removed.
    if (marker !== 0xe1 && marker !== 0xed && marker !== 0xfe) parts.push(segment);
    offset = segmentEnd;
  }

  if (!sawSof || !sawSos || !sawEoi) throw imageError("JPEG must contain a baseline frame, scan, and EOI");
  return concat(parts);
}

export function normalizeImage(input: Uint8Array): NormalizedImage {
  const bytes = new Uint8Array(input);
  if (equalBytes(bytes, PNG_SIGNATURE)) return { bytes: validatePng(bytes), mediaType: "image/png", extension: ".png" };
  if (bytes.byteLength >= 2 && byteAt(bytes, 0) === 0xff && byteAt(bytes, 1) === 0xd8) return { bytes: validateJpeg(bytes), mediaType: "image/jpeg", extension: ".jpg" };
  throw imageError("unsupported format; upload a valid static PNG or JPEG photo");
}
