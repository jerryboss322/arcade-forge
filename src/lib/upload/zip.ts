// Minimal client-side ZIP reader (central directory parsing + deflate-raw via DecompressionStream).
// Used by the /upload Dev Portal to inspect bundles before publishing. No external deps.

export interface ZipEntryInfo {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  method: number; // 0 = stored, 8 = deflate
  localHeaderOffset: number;
}

export function listZipEntries(buf: ArrayBuffer): ZipEntryInfo[] {
  const view = new DataView(buf);
  // Find End Of Central Directory record (signature 0x06054b50), scanning backwards
  let eocd = -1;
  const minPos = Math.max(0, buf.byteLength - 65557);
  for (let i = buf.byteLength - 22; i >= minPos; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid ZIP file (no end-of-central-directory record).");

  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntryInfo[] = [];

  for (let i = 0; i < count; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) {
      throw new Error("Corrupt ZIP central directory.");
    }
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const uncompressedSize = view.getUint32(ptr + 24, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(new Uint8Array(buf, ptr + 46, nameLen));
    if (!name.endsWith("/")) {
      entries.push({ name, compressedSize, uncompressedSize, method, localHeaderOffset });
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function readZipEntryText(buf: ArrayBuffer, entry: ZipEntryInfo): Promise<string> {
  const view = new DataView(buf);
  const off = entry.localHeaderOffset;
  if (view.getUint32(off, true) !== 0x04034b50) throw new Error("Corrupt local file header.");
  const nameLen = view.getUint16(off + 26, true);
  const extraLen = view.getUint16(off + 28, true);
  const dataStart = off + 30 + nameLen + extraLen;
  const raw = new Uint8Array(buf, dataStart, entry.compressedSize);

  if (entry.method === 0) {
    return new TextDecoder().decode(raw);
  }
  if (entry.method === 8) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot decompress ZIP entries (DecompressionStream unavailable).");
    }
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(stream).text();
  }
  throw new Error(`Unsupported ZIP compression method ${entry.method}.`);
}
