import { Inflate, Unzip, UnzipInflate } from 'fflate';
import { OfficeToolError } from './office-errors';

export type HangulKind = 'hwp' | 'hwpx';
export const MAX_HANGUL_INPUT = 20 * 1024 * 1024;
const MAX_ENTRIES = 1_000;
const MAX_ENTRY = 32 * 1024 * 1024;
const MAX_INFLATED = 100 * 1024 * 1024;
const MAX_XML = 2 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const utf16 = new TextDecoder('utf-16le', { fatal: true });
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
function fail(code: 'officeCorrupt' | 'officeUnsupported' | 'officeTooLarge' | 'officeExternal' = 'officeCorrupt'): never { throw new OfficeToolError(code); }

interface CfbEntry { name: string; type: number; start: number; size: number; }
const END = 0xfffffffe;
const FREE = 0xffffffff;

function inspectDocInfo(bytes: Uint8Array): void {
  if (bytes.length > MAX_XML) fail('officeTooLarge');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  while (at < bytes.length) {
    if (at + 4 > bytes.length) fail();
    const header = view.getUint32(at, true); at += 4;
    const tag = header & 0x3ff;
    let size = header >>> 20;
    if (size === 0xfff) { if (at + 4 > bytes.length) fail(); size = view.getUint32(at, true); at += 4; }
    if (at + size > bytes.length) fail();
    // HWPTAG_BIN_DATA records distinguish a package image from a linked file.
    if (tag === 0x12) {
      if (size < 2) fail();
      const storage = view.getUint16(at, true) & 0x0f;
      if (storage === 0) fail('officeExternal');
      if (storage === 1) {
        if (size < 6) fail();
        const chars = view.getUint16(at + 4, true);
        if (6 + chars * 2 > size) fail();
        let extension: string;
        try { extension = utf16.decode(bytes.subarray(at + 6, at + 6 + chars * 2)); } catch { fail(); }
        if (/^svgz?$/i.test(extension.replace(/\0/g, '').trim())) fail('officeUnsupported');
      }
    }
    at += size;
  }
}

/** Parse the CFB allocation tables so protection bits come from FileHeader,
 * rather than a byte-string search that another stream could spoof. */
async function validateHwp(bytes: Uint8Array): Promise<void> {
  const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (bytes.length < 512 || !magic.every((value, index) => bytes[index] === value)) fail('officeUnsupported');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const major = view.getUint16(26, true);
  const shift = view.getUint16(30, true);
  if (view.getUint16(28, true) !== 0xfffe || !((major === 3 && shift === 9) || (major === 4 && shift === 12))
    || view.getUint16(32, true) !== 6 || view.getUint32(56, true) !== 4096) fail('officeUnsupported');
  const sectorSize = 2 ** shift;
  if (bytes.length % sectorSize || bytes.length < sectorSize * 2) fail();
  const sectorCount = bytes.length / sectorSize - 1;
  const sector = (id: number): Uint8Array => {
    if (!Number.isInteger(id) || id < 0 || id >= sectorCount) fail();
    return bytes.subarray((id + 1) * sectorSize, (id + 2) * sectorSize);
  };
  const fatCount = view.getUint32(44, true);
  const difatCount = view.getUint32(72, true);
  if (!fatCount || fatCount > sectorCount || difatCount > sectorCount) fail();
  const fatIds: number[] = [];
  const pushFat = (id: number) => { if (id !== FREE) { sector(id); fatIds.push(id); } };
  for (let index = 0; index < 109; index++) pushFat(view.getUint32(76 + index * 4, true));
  let difat = view.getUint32(68, true);
  const difatSeen = new Set<number>();
  for (let index = 0; index < difatCount; index++) {
    if (difatSeen.has(difat)) fail();
    difatSeen.add(difat);
    const chunk = sector(difat);
    const part = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let offset = 0; offset < sectorSize - 4; offset += 4) pushFat(part.getUint32(offset, true));
    difat = part.getUint32(sectorSize - 4, true);
  }
  if ((difatCount && difat !== END) || fatIds.length !== fatCount || new Set(fatIds).size !== fatIds.length) fail();
  const fat = new Uint32Array(fatCount * sectorSize / 4);
  fatIds.forEach((id, index) => {
    const chunk = sector(id); const part = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let offset = 0; offset < sectorSize; offset += 4) fat[index * sectorSize / 4 + offset / 4] = part.getUint32(offset, true);
  });
  const chain = (start: number, table: Uint32Array, max: number): number[] => {
    if (start === END) return [];
    const ids: number[] = []; const seen = new Set<number>(); let current = start;
    while (current !== END) {
      if (current >= max || current >= table.length || seen.has(current)) fail();
      seen.add(current); ids.push(current);
      if (ids.length > max) fail();
      current = table[current]!;
    }
    return ids;
  };
  const regular = (start: number, size?: number): Uint8Array => {
    if (size !== undefined && (size < 0 || size > bytes.length)) fail('officeTooLarge');
    const ids = chain(start, fat, sectorCount);
    const length = size ?? ids.length * sectorSize;
    if (length > ids.length * sectorSize || (size !== undefined && ids.length !== Math.ceil(size / sectorSize))) fail();
    const result = new Uint8Array(length);
    ids.forEach((id, index) => { const at = index * sectorSize; if (at < length) result.set(sector(id).subarray(0, Math.min(sectorSize, length - at)), at); });
    return result;
  };
  const directory = regular(view.getUint32(48, true));
  if (!directory.length || directory.length % 128) fail();
  const entries: CfbEntry[] = []; let streamBytes = 0;
  for (let offset = 0; offset < directory.length; offset += 128) {
    const data = new DataView(directory.buffer, directory.byteOffset + offset, 128);
    const type = data.getUint8(66);
    if (!type) continue;
    if (![1, 2, 5].includes(type)) fail();
    const nameBytes = data.getUint16(64, true);
    if (nameBytes < 2 || nameBytes > 64 || nameBytes % 2 || data.getUint16(nameBytes - 2, true) !== 0) fail();
    let name: string;
    try { name = utf16.decode(directory.subarray(offset, offset + nameBytes - 2)); } catch { fail(); }
    const high = data.getUint32(124, true);
    if (high) fail('officeTooLarge');
    const size = data.getUint32(120, true);
    if (size > MAX_HANGUL_INPUT) fail('officeTooLarge');
    if (type === 2 && (streamBytes += size) > MAX_INFLATED) fail('officeTooLarge');
    if (type === 2 && /\.svgz?$/i.test(name)) fail('officeUnsupported');
    entries.push({ name, type, size, start: data.getUint32(116, true) });
    if (entries.length > MAX_ENTRIES) fail('officeTooLarge');
  }
  const root = entries.find(entry => entry.type === 5);
  const headers = entries.filter(entry => entry.type === 2 && entry.name === 'FileHeader');
  if (!root || headers.length !== 1) fail('officeUnsupported');
  const miniCount = view.getUint32(64, true);
  if (miniCount > sectorCount) fail();
  const miniBytes = miniCount ? regular(view.getUint32(60, true), miniCount * sectorSize) : new Uint8Array();
  const miniFat = new Uint32Array(miniBytes.length / 4);
  const miniView = new DataView(miniBytes.buffer);
  for (let offset = 0; offset < miniBytes.length; offset += 4) miniFat[offset / 4] = miniView.getUint32(offset, true);
  let miniStream: Uint8Array | undefined;
  const readStream = (entry: CfbEntry): Uint8Array => {
    if (!entry.size) return new Uint8Array();
    if (entry.size >= 4096) return regular(entry.start, entry.size);
    miniStream ??= regular(root.start, root.size);
    const ids = chain(entry.start, miniFat, Math.ceil(miniStream.length / 64));
    if (ids.length !== Math.ceil(entry.size / 64)) fail();
    const result = new Uint8Array(entry.size);
    ids.forEach((id, index) => {
      const start = id * 64; const count = Math.min(64, entry.size - index * 64);
      if (start + count > miniStream!.length) fail();
      result.set(miniStream!.subarray(start, start + count), index * 64);
    });
    return result;
  };
  const header = readStream(headers[0]!);
  if (header.length < 40 || new TextDecoder().decode(header.subarray(0, 32)).replace(/\0.*$/s, '') !== 'HWP Document File' || header[35] !== 5) fail('officeUnsupported');
  const flags = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(36, true);
  // Password, distribution encryption, DRM, certificate encryption and
  // certificate DRM require a separate authenticated workflow.
  if (flags & ((1 << 1) | (1 << 2) | (1 << 4) | (1 << 8) | (1 << 9))) fail('officeUnsupported');
  if (entries.filter(entry => entry.type === 2 && entry.name === 'DocInfo').length !== 1
    || !entries.some(entry => entry.type === 2 && /^Section\d+$/.test(entry.name))) fail('officeCorrupt');
  if (flags & 1) {
    let total = 0;
    for (const entry of entries.filter(item => item.type === 2 && (item.name === 'DocInfo' || /^Section\d+$/.test(item.name)))) {
      let inflated = 0; let problem: OfficeToolError | undefined; const chunks: Uint8Array[] = [];
      const inflater = new Inflate(data => {
        inflated += data.byteLength; total += data.byteLength;
        if (inflated > MAX_ENTRY || total > MAX_INFLATED) problem = new OfficeToolError('officeTooLarge');
        if (entry.name === 'DocInfo') {
          if (inflated > MAX_XML) problem = new OfficeToolError('officeTooLarge');
          else if (data.length) chunks.push(data.slice());
        }
      });
      const stream = readStream(entry);
      try {
        for (let offset = 0; offset < stream.length; offset += 4096) {
          inflater.push(stream.subarray(offset, offset + 4096), offset + 4096 >= stream.length);
          if (problem) throw problem;
        }
      } catch (error) { if (error instanceof OfficeToolError) throw error; fail(); }
      if (entry.name === 'DocInfo') {
        const info = new Uint8Array(inflated); let at = 0;
        for (const chunk of chunks) { info.set(chunk, at); at += chunk.length; }
        inspectDocInfo(info);
      }
      await tick();
    }
  } else inspectDocInfo(readStream(entries.find(entry => entry.type === 2 && entry.name === 'DocInfo')!));
}

interface ZipEntry { name: string; size: number; method: number; crc: number; }
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function updateCrc(crc: number, bytes: Uint8Array): number {
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return crc;
}

function zipDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  if (bytes.length < 22 || bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4) fail('officeUnsupported');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
    if (view.getUint32(at, true) === 0x06054b50 && at + 22 + view.getUint16(at + 20, true) === bytes.length) { end = at; break; }
  }
  if (end < 0) fail();
  const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
  if (count === 65535 || count > MAX_ENTRIES || size === FREE || start === FREE) fail('officeTooLarge');
  if (!count || view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || start + size !== end) fail();
  const entries = new Map<string, ZipEntry>(); let at = start, total = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) fail();
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true), crc = view.getUint32(at + 16, true), packed = view.getUint32(at + 20, true), length = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true), local = view.getUint32(at + 42, true);
    const next = at + 46 + nameLength + extra + comment;
    if (!nameLength || next > end || view.getUint16(at + 34, true) || local + 30 > start) fail();
    if ((flags & 1) || ![0, 8].includes(method)) fail('officeUnsupported');
    if (length > MAX_ENTRY || (total += length) > MAX_INFLATED) fail('officeTooLarge');
    if (view.getUint32(local, true) !== 0x04034b50) fail();
    const localFlags = view.getUint16(local + 6, true), localMethod = view.getUint16(local + 8, true);
    if (localFlags & 1) fail('officeUnsupported');
    if (localFlags !== flags || localMethod !== method) fail();
    const localCrc = view.getUint32(local + 14, true), localPacked = view.getUint32(local + 18, true), localLength = view.getUint32(local + 22, true);
    // Streaming ZIP writers leave these fields at zero and put final values in
    // a data descriptor. Any populated field must still match the directory.
    const descriptor = Boolean(flags & 8);
    if ((!descriptor || localCrc !== 0) && localCrc !== crc
      || (!descriptor || localPacked !== 0) && localPacked !== packed
      || (!descriptor || localLength !== 0) && localLength !== length) fail();
    const localNameLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true);
    if (local + 30 + localNameLength + localExtra + packed > start) fail();
    let name: string;
    try { name = utf8.decode(bytes.subarray(at + 46, at + 46 + nameLength)); } catch { fail(); }
    if (name.startsWith('/') || /[\\\x00-\x1f]/.test(name) || name.split('/').some(part => part === '..' || part === '.') || entries.has(name)) fail();
    if (utf8.decode(bytes.subarray(local + 30, local + 30 + localNameLength)) !== name) fail();
    entries.set(name, { name, size: length, method, crc }); at = next;
  }
  if (at !== end) fail();
  return entries;
}

function entities(text: string): string {
  return text.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|(amp|lt|gt|quot|apos));/gi, (raw: string, numeric: string | undefined, named: string | undefined) => {
    if (!numeric) return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[named!.toLowerCase()] || raw;
    const point = numeric[0]?.toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric);
    if (!Number.isSafeInteger(point) || point < 1 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) fail();
    return String.fromCodePoint(point);
  });
}

function inspectXml(name: string, bytes: Uint8Array): void {
  let text: string;
  try { text = utf8.decode(bytes); } catch { fail(); }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) fail('officeUnsupported');
  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(text, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length) fail();
  }
  text = entities(text);
  if (/image\/svg\+xml/i.test(text)) fail('officeUnsupported');
  if (/\bTargetMode\s*=\s*(["'])\s*External\s*\1/i.test(text)) fail('officeExternal');
  // Namespace/schema URIs are identifiers, not loaded content. Inspect only
  // concrete resource attributes, including namespaced xlink:href.
  for (const match of text.matchAll(/(?:^|[\s<])(?:[\w.-]+:)?(href|src|Target|full-path|filePath)\s*=\s*(["'])(.*?)\2/gis)) {
    let target = match[3]!.trim();
    try { target = decodeURIComponent(target); } catch { fail(); }
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\\|\/)/i.test(target)) fail('officeExternal');
    if (!target.startsWith('#')) {
      const path = name.split('/').slice(0, -1);
      for (const part of target.split(/[?#]/, 1)[0]!.split('/')) {
        if (part === '..') { if (!path.length) fail('officeExternal'); path.pop(); }
        else if (part && part !== '.') path.push(part);
      }
    }
  }
}

async function validateHwpx(bytes: Uint8Array): Promise<void> {
  const entries = zipDirectory(bytes);
  if (!['mimetype', 'Contents/header.xml', 'Contents/section0.xml', 'Contents/content.hpf'].every(name => entries.has(name))) fail('officeUnsupported');
  if ([...entries.keys()].some(name => /(?:^|\/)encryption\.xml$/i.test(name))) fail('officeUnsupported');
  if ([...entries.keys()].some(name => /\.svgz?$/i.test(name))) fail('officeUnsupported');
  const seen = new Set<string>(), completed = new Set<string>();
  const active = new Set<() => void>(); let total = 0, failure: OfficeToolError | undefined;
  const unzip = new Unzip(file => {
    const expected = entries.get(file.name);
    if (!expected || seen.has(file.name) || expected.method !== file.compression) { failure = new OfficeToolError('officeCorrupt'); return; }
    seen.add(file.name); let count = 0, crc = -1;
    const collect = file.name === 'mimetype' || /\.(?:xml|hpf|rels)$/i.test(file.name);
    const chunks: Uint8Array[] = [];
    active.add(file.terminate);
    file.ondata = (error, data, final) => {
      if (failure) return;
      if (error) { failure = new OfficeToolError('officeCorrupt'); return; }
      count += data.byteLength; total += data.byteLength;
      if (count > MAX_ENTRY || total > MAX_INFLATED || (collect && count > MAX_XML)) { failure = new OfficeToolError('officeTooLarge'); file.terminate(); return; }
      if (count > expected.size) { failure = new OfficeToolError('officeCorrupt'); file.terminate(); return; }
      crc = updateCrc(crc, data);
      if (collect && data.length) chunks.push(data.slice());
      if (final) {
        active.delete(file.terminate);
        if (count !== expected.size || ((crc ^ 0xffffffff) >>> 0) !== expected.crc) { failure = new OfficeToolError('officeCorrupt'); return; }
        completed.add(file.name);
        if (collect) {
          const joined = new Uint8Array(count); let offset = 0;
          for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
          try {
            if (file.name === 'mimetype') { if (utf8.decode(joined).trim() !== 'application/hwp+zip') fail('officeUnsupported'); }
            else inspectXml(file.name, joined);
          } catch (error) { failure = error instanceof OfficeToolError ? error : new OfficeToolError('officeCorrupt'); }
          chunks.length = 0;
        }
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < bytes.length; offset += 4096) {
      unzip.push(bytes.subarray(offset, offset + 4096), offset + 4096 >= bytes.length);
      if (failure) throw failure;
      if (offset % 262144 === 0) await tick();
    }
    if (seen.size !== entries.size || completed.size !== entries.size) fail();
  } catch (error) { if (error instanceof OfficeToolError) throw error; fail(); }
  finally { for (const stop of active) stop(); active.clear(); }
}

export async function validateHangulBytes(bytes: Uint8Array, kind: HangulKind): Promise<void> {
  if (bytes.byteLength > MAX_HANGUL_INPUT) fail('officeTooLarge');
  try {
    if (kind === 'hwp') await validateHwp(bytes);
    else if (kind === 'hwpx') await validateHwpx(bytes);
    else fail('officeUnsupported');
  } catch (error) { if (error instanceof OfficeToolError) throw error; fail(); }
}
