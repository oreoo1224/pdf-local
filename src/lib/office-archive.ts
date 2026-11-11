import { Unzip, UnzipInflate } from 'fflate';
import { OfficeToolError } from './office-errors';

export type OfficeKind = 'docx' | 'pptx';
export const OFFICE_MAX_INPUT = 20 * 1024 * 1024;
const MAX_ENTRIES = 1_000;
const MAX_ENTRY = 32 * 1024 * 1024;
const MAX_INFLATED = 100 * 1024 * 1024;
const MAX_METADATA = 2 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

interface Entry { name: string; size: number; compression: number; }

function centralDirectory(bytes: Uint8Array): Map<string, Entry> {
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) {
    throw new OfficeToolError('officeUnsupported');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let position = bytes.length - 22; position >= Math.max(0, bytes.length - 65_557); position--) {
    if (view.getUint32(position, true) === 0x06054b50 && position + 22 + view.getUint16(position + 20, true) === bytes.length) {
      end = position; break;
    }
  }
  if (end < 0) throw new OfficeToolError('officeCorrupt');
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directoryOffset = view.getUint32(end + 16, true);
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff || count > MAX_ENTRIES) {
    throw new OfficeToolError('officeTooLarge');
  }
  if (!count || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0
    || view.getUint16(end + 8, true) !== count || directoryOffset + directorySize !== end) {
    throw new OfficeToolError('officeCorrupt');
  }
  const entries = new Map<string, Entry>();
  let offset = directoryOffset;
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new OfficeToolError('officeCorrupt');
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const startDisk = view.getUint16(offset + 34, true);
    const localOffset = view.getUint32(offset + 42, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > end || !nameLength || startDisk !== 0 || localOffset + 30 > directoryOffset) throw new OfficeToolError('officeCorrupt');
    if ((flags & 1) || ![0, 8].includes(compression)) throw new OfficeToolError('officeUnsupported');
    if (size > MAX_ENTRY || (total += size) > MAX_INFLATED) throw new OfficeToolError('officeTooLarge');
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new OfficeToolError('officeCorrupt');
    const localNameSize = view.getUint16(localOffset + 26, true);
    const localExtraSize = view.getUint16(localOffset + 28, true);
    if (localOffset + 30 + localNameSize + localExtraSize + compressed > directoryOffset) throw new OfficeToolError('officeCorrupt');
    let name: string;
    try { name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)); }
    catch { throw new OfficeToolError('officeCorrupt'); }
    if (name.startsWith('/') || /[\\\x00-\x1f]/.test(name) || name.split('/').some(part => part === '..' || part === '.')
      || entries.has(name)) throw new OfficeToolError('officeCorrupt');
    const localName = decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameSize));
    if (name !== localName) throw new OfficeToolError('officeCorrupt');
    if (/vbaProject\.bin$/i.test(name) || /(?:^|\/)activeX\//i.test(name)) throw new OfficeToolError('officeUnsupported');
    entries.set(name, { name, size, compression });
    offset = next;
  }
  if (offset !== directoryOffset + directorySize) throw new OfficeToolError('officeCorrupt');
  return entries;
}

function decodeEntities(text: string): string {
  return text.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|(amp|lt|gt|quot|apos));/gi, (source: string, numeric: string | undefined, named: string | undefined) => {
    if (numeric) {
      const value = numeric[0]?.toLowerCase() === 'x' ? Number.parseInt(numeric.slice(1), 16) : Number.parseInt(numeric, 10);
      if (!Number.isSafeInteger(value) || value < 1 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) throw new OfficeToolError('officeCorrupt');
      return String.fromCodePoint(value);
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[named!.toLowerCase()] || source;
  });
}

function inspectMetadata(name: string, data: Uint8Array, kind: OfficeKind): void {
  let text: string;
  try { text = decoder.decode(data); } catch { throw new OfficeToolError('officeCorrupt'); }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new OfficeToolError('officeUnsupported');
  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(text, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length) throw new OfficeToolError('officeCorrupt');
  }
  const mainPart = kind === 'docx' ? 'word/document.xml' : 'ppt/presentation.xml';
  if (name === mainPart) {
    const root = kind === 'docx' ? /<(?:[A-Za-z_][\w.-]*:)?document(?:\s|>)/ : /<(?:[A-Za-z_][\w.-]*:)?presentation(?:\s|>)/;
    if (!root.test(text)) throw new OfficeToolError('officeCorrupt');
    return;
  }
  text = decodeEntities(text);
  if (name === '[Content_Types].xml') {
    const contentType = kind === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml';
    if (!text.includes(contentType) || /macroenabled|vbaproject/i.test(text)) throw new OfficeToolError('officeUnsupported');
    return;
  }
  // The trial deliberately rejects even external hyperlinks. It never fetches
  // user-controlled image/font/template/media targets from another origin.
  if (/\bTargetMode\s*=\s*(["'])\s*External\s*\1/i.test(text)) throw new OfficeToolError('officeExternal');
  for (const match of text.matchAll(/\bTarget\s*=\s*(["'])(.*?)\1/gi)) {
    let target = match[2]!.trim();
    try { target = decodeURIComponent(target); } catch { throw new OfficeToolError('officeCorrupt'); }
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) throw new OfficeToolError('officeExternal');
  }
}

/** Bound both ZIP declarations and actual streaming inflate output. */
export async function validateOfficeBytes(bytes: Uint8Array, kind: OfficeKind): Promise<void> {
  if (bytes.length > OFFICE_MAX_INPUT) throw new OfficeToolError('officeTooLarge');
  const entries = centralDirectory(bytes);
  const mainPart = kind === 'docx' ? 'word/document.xml' : 'ppt/presentation.xml';
  if (!entries.has(mainPart) || !entries.has('[Content_Types].xml') || !entries.has('_rels/.rels')) throw new OfficeToolError('officeUnsupported');
  const seen = new Set<string>();
  const completed = new Set<string>();
  let total = 0;
  let failure: OfficeToolError | undefined;
  const active = new Set<() => void>();
  const unzip = new Unzip(file => {
    const expected = entries.get(file.name);
    if (!expected || seen.has(file.name) || expected.compression !== file.compression) {
      failure = new OfficeToolError('officeCorrupt'); return;
    }
    seen.add(file.name);
    let count = 0;
    const chunks: Uint8Array[] = [];
    const metadata = file.name === mainPart || file.name === '[Content_Types].xml' || file.name.endsWith('.rels');
    active.add(file.terminate);
    file.ondata = (error, data, final) => {
      if (failure) return;
      if (error) { failure = new OfficeToolError('officeCorrupt'); return; }
      count += data.length;
      total += data.length;
      if (count > MAX_ENTRY || total > MAX_INFLATED || (metadata && count > MAX_METADATA)) {
        failure = new OfficeToolError('officeTooLarge'); file.terminate(); return;
      }
      if (count > expected.size) { failure = new OfficeToolError('officeCorrupt'); file.terminate(); return; }
      if (metadata && data.length) chunks.push(data.slice());
      if (final) {
        active.delete(file.terminate);
        if (count !== expected.size) { failure = new OfficeToolError('officeCorrupt'); return; }
        completed.add(file.name);
        if (metadata) {
          const joined = new Uint8Array(count);
          let offset = 0;
          for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
          try { inspectMetadata(file.name, joined, kind); }
          catch (error) { failure = error instanceof OfficeToolError ? error : new OfficeToolError('officeCorrupt'); }
          chunks.length = 0;
        }
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    // Small input chunks bound transient inflate allocations even for a
    // malicious stream whose central directory understates its output size.
    for (let offset = 0; offset < bytes.length; offset += 4_096) {
      unzip.push(bytes.subarray(offset, offset + 4_096), offset + 4_096 >= bytes.length);
      if (failure) throw failure;
      if (offset % 262_144 === 0) await tick();
    }
    if (completed.size !== entries.size || seen.size !== entries.size) throw new OfficeToolError('officeCorrupt');
  } catch (error) {
    if (error instanceof OfficeToolError) throw error;
    throw new OfficeToolError('officeCorrupt');
  } finally {
    for (const terminate of active) terminate();
    active.clear();
  }
}
