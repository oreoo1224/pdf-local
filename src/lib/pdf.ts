import {
  PDFDocument, degrees, pushGraphicsState, popGraphicsState,
  rectangle, clip, endPath, concatTransformationMatrix,
} from 'pdf-lib';
import { zip } from 'fflate';

export type PdfErrorCode = 'encrypted' | 'invalidPdf' | 'invalidRange' | 'emptyPages' | 'invalidImage' | 'memoryLimit';

/** Stable codes let the interface translate errors without exposing parser internals. */
export class PdfToolError extends Error {
  constructor(public readonly code: PdfErrorCode) {
    super(code);
    this.name = 'PdfToolError';
  }
}

export type Progress = (percent: number) => void;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function toPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
}

export async function loadPdf(file: File): Promise<PDFDocument> {
  if (file.size > MAX_FILE_BYTES) throw new PdfToolError('memoryLimit');
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const header = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
    if (!header.includes('%PDF-')) throw new PdfToolError('invalidPdf');
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    if (pdf.isEncrypted) throw new PdfToolError('encrypted');
    if (pdf.getPageCount() < 1) throw new PdfToolError('emptyPages');
    if (pdf.getPageCount() > 10_000) throw new PdfToolError('memoryLimit');
    return pdf;
  } catch (error) {
    if (error instanceof PdfToolError) throw error;
    if (error instanceof Error && /encrypt|password/i.test(`${error.name} ${error.message}`)) {
      throw new PdfToolError('encrypted');
    }
    throw new PdfToolError('invalidPdf');
  }
}

export async function inspectPdf(file: File): Promise<{ pageCount: number }> {
  const pdf = await loadPdf(file);
  return { pageCount: pdf.getPageCount() };
}

export async function mergePdfs(files: File[], progress?: Progress): Promise<Blob> {
  if (!files.length) throw new PdfToolError('emptyPages');
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES) throw new PdfToolError('memoryLimit');
  const output = await PDFDocument.create();
  progress?.(0);
  for (let i = 0; i < files.length; i++) {
    const source = await loadPdf(files[i]!);
    if (output.getPageCount() + source.getPageCount() > 10_000) throw new PdfToolError('memoryLimit');
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
    progress?.(Math.round(((i + 1) / files.length) * 90));
    await tick();
  }
  const blob = toPdfBlob(await output.save());
  progress?.(100);
  return blob;
}

export async function organizePdf(
  file: File,
  pages: Array<{ index: number; rotation: number }>,
): Promise<Blob> {
  if (!pages.length) throw new PdfToolError('emptyPages');
  const source = await loadPdf(file);
  for (const page of pages) {
    if (!Number.isInteger(page.index) || page.index < 0 || page.index >= source.getPageCount()
      || !Number.isFinite(page.rotation) || page.rotation % 90 !== 0) {
      throw new PdfToolError('invalidRange');
    }
  }
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pages.map((page) => page.index));
  copied.forEach((page, i) => {
    const rotation = ((page.getRotation().angle + pages[i]!.rotation) % 360 + 360) % 360;
    page.setRotation(degrees(rotation));
    output.addPage(page);
  });
  return toPdfBlob(await output.save());
}

/** Empty means every page; ranges are inclusive, one-based, and keep user order. */
export function parsePageRange(value: string, total: number): number[] {
  if (!Number.isInteger(total) || total < 1 || total > 10_000) throw new PdfToolError('invalidRange');
  if (!value.trim()) return Array.from({ length: total }, (_, index) => index);
  if (value.length > 20_000) throw new PdfToolError('invalidRange');
  const selected = new Set<number>();
  for (const section of value.split(',')) {
    const match = section.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new PdfToolError('invalidRange');
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)
      || start < 1 || end < start || end > total) throw new PdfToolError('invalidRange');
    for (let page = start; page <= end; page++) selected.add(page - 1);
  }
  if (!selected.size) throw new PdfToolError('emptyPages');
  return [...selected];
}

function imageKind(bytes: Uint8Array): 'png' | 'jpg' {
  if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(16) * view.getUint32(20) > MAX_IMAGE_PIXELS) throw new PdfToolError('memoryLimit');
    return 'png';
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++]!;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes[offset]! * 256 + bytes[offset + 1]!;
      if (length < 2 || offset + length > bytes.length) throw new PdfToolError('invalidImage');
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 7) throw new PdfToolError('invalidImage');
        const height = bytes[offset + 3]! * 256 + bytes[offset + 4]!;
        const width = bytes[offset + 5]! * 256 + bytes[offset + 6]!;
        if (!height || !width) throw new PdfToolError('invalidImage');
        if (height * width > MAX_IMAGE_PIXELS) throw new PdfToolError('memoryLimit');
        return 'jpg';
      }
      offset += length;
    }
  }
  throw new PdfToolError('invalidImage');
}

/** Read only the EXIF orientation tag; malformed optional metadata falls back to normal. */
function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++]!;
    if (marker === 0xda || marker === 0xd9) return 1;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) return 1;
    const length = view.getUint16(offset);
    const end = offset + length;
    if (length < 2 || end > bytes.length) return 1;
    if (marker === 0xe1 && length >= 16
      && [69, 120, 105, 102, 0, 0].every((byte, index) => bytes[offset + 2 + index] === byte)) {
      const tiff = offset + 8;
      const byteOrder = view.getUint16(tiff);
      if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;
      const little = byteOrder === 0x4949;
      if (view.getUint16(tiff + 2, little) !== 42) return 1;
      const relativeIfd = view.getUint32(tiff + 4, little);
      const ifd = tiff + relativeIfd;
      if (relativeIfd < 8 || ifd + 2 > end) return 1;
      const count = view.getUint16(ifd, little);
      if (count > 4096 || ifd + 2 + count * 12 > end) return 1;
      for (let index = 0; index < count; index++) {
        const entry = ifd + 2 + index * 12;
        if (view.getUint16(entry, little) === 0x0112
          && view.getUint16(entry + 2, little) === 3 && view.getUint32(entry + 4, little) === 1) {
          const orientation = view.getUint16(entry + 8, little);
          return orientation >= 1 && orientation <= 8 ? orientation : 1;
        }
      }
    }
    offset = end;
  }
  return 1;
}

/** Raw image coordinates and PDF coordinates both use a bottom-left origin. */
function orientationMatrix(orientation: number, width: number, height: number): [number, number, number, number, number, number] {
  switch (orientation) {
    case 2: return [-1, 0, 0, 1, width, 0];
    case 3: return [-1, 0, 0, -1, width, height];
    case 4: return [1, 0, 0, -1, 0, height];
    case 5: return [0, -1, -1, 0, height, width];
    case 6: return [0, -1, 1, 0, 0, width];
    case 7: return [0, 1, 1, 0, 0, 0];
    case 8: return [0, 1, -1, 0, height, 0];
    default: return [1, 0, 0, 1, 0, 0];
  }
}

/** Check magic bytes and declared dimensions before the UI decodes a preview. */
export async function validateImageFile(file: File): Promise<void> {
  if (file.size > MAX_FILE_BYTES) throw new PdfToolError('memoryLimit');
  imageKind(new Uint8Array(await file.arrayBuffer()));
}

/** Save each selected page to a separate PDF; parse the source only once. */
export async function splitToZip(
  file: File,
  pages: Array<{ index: number; rotation: number }>,
  progress?: Progress,
): Promise<{ blob: Blob; name: string }> {
  if (!pages.length) throw new PdfToolError('emptyPages');
  if (pages.length > 200) throw new PdfToolError('memoryLimit');
  const source = await loadPdf(file);
  for (const page of pages) {
    if (!Number.isInteger(page.index) || page.index < 0 || page.index >= source.getPageCount()
      || !Number.isFinite(page.rotation) || page.rotation % 90 !== 0) throw new PdfToolError('invalidRange');
  }
  const stem = file.name.replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80) || 'pages';
  const files: Record<string, Uint8Array> = {};
  let totalBytes = 0;
  progress?.(0);
  try {
    for (let index = 0; index < pages.length; index++) {
      const selection = pages[index]!;
      const output = await PDFDocument.create();
      const [page] = await output.copyPages(source, [selection.index]);
      if (!page) throw new PdfToolError('invalidPdf');
      page.setRotation(degrees(((page.getRotation().angle + selection.rotation) % 360 + 360) % 360));
      output.addPage(page);
      const bytes = await output.save();
      totalBytes += bytes.byteLength;
      if (totalBytes > 150 * 1024 * 1024) throw new PdfToolError('memoryLimit');
      // The sequence prefix preserves selection order and prevents duplicate-page collisions.
      files[`${stem}-${String(index + 1).padStart(3, '0')}-page-${selection.index + 1}.pdf`] = bytes;
      progress?.(Math.round(((index + 1) / pages.length) * 90));
      await tick();
    }
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      zip(files, { level: 0 }, (error, data) => error ? reject(error) : resolve(data));
    });
    const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' });
    progress?.(100);
    return { blob, name: `${stem}-split.zip` };
  } finally {
    for (const key of Object.keys(files)) delete files[key];
  }
}

export interface ImagesToPdfOptions {
  paper: 'a4' | 'letter' | 'original';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: number;
  fit: 'contain' | 'cover';
}

export async function imagesToPdf(files: File[], options: ImagesToPdfOptions, progress?: Progress): Promise<Blob> {
  if (!files.length) throw new PdfToolError('emptyPages');
  if (!['a4', 'letter', 'original'].includes(options.paper)
    || !['auto', 'portrait', 'landscape'].includes(options.orientation)
    || !['contain', 'cover'].includes(options.fit)
    || !Number.isFinite(options.margin) || options.margin < 0 || options.margin > 144) {
    throw new PdfToolError('invalidRange');
  }
  if (files.length > 100 || files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES) throw new PdfToolError('memoryLimit');
  const output = await PDFDocument.create();
  progress?.(0);
  for (let i = 0; i < files.length; i++) {
    const bytes = new Uint8Array(await files[i]!.arrayBuffer());
    const kind = imageKind(bytes);
    let image;
    try {
      image = kind === 'png' ? await output.embedPng(bytes) : await output.embedJpg(bytes);
    } catch {
      throw new PdfToolError('invalidImage');
    }
    if (!image.width || !image.height || image.width * image.height > MAX_IMAGE_PIXELS) throw new PdfToolError('memoryLimit');
    const exif = kind === 'jpg' ? jpegOrientation(bytes) : 1;
    const imageWidth = exif >= 5 ? image.height : image.width;
    const imageHeight = exif >= 5 ? image.width : image.height;
    let [width, height] = options.paper === 'letter' ? [612, 792]
      : options.paper === 'a4' ? [595.28, 841.89]
        : [imageWidth * 0.75 + 2 * options.margin, imageHeight * 0.75 + 2 * options.margin];
    const landscape = options.orientation === 'landscape'
      || (options.orientation === 'auto' && imageWidth > imageHeight);
    if ((landscape && width < height) || (!landscape && width > height)) [width, height] = [height, width];
    if (width > 14_400 || height > 14_400) throw new PdfToolError('memoryLimit');
    const page = output.addPage([width, height]);
    const innerWidth = width - 2 * options.margin;
    const innerHeight = height - 2 * options.margin;
    if (innerWidth <= 0 || innerHeight <= 0) throw new PdfToolError('invalidRange');
    const ratio = (options.fit === 'cover' ? Math.max : Math.min)(innerWidth / imageWidth, innerHeight / imageHeight);
    const drawingWidth = imageWidth * ratio;
    const drawingHeight = imageHeight * ratio;
    if (options.fit === 'cover') {
      page.pushOperators(pushGraphicsState(), rectangle(options.margin, options.margin, innerWidth, innerHeight), clip(), endPath());
    }
    // Apply orientation to the original compressed JPEG without canvas decoding or recompression.
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(ratio, 0, 0, ratio, (width - drawingWidth) / 2, (height - drawingHeight) / 2),
      concatTransformationMatrix(...orientationMatrix(exif, image.width, image.height)),
    );
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    page.pushOperators(popGraphicsState());
    if (options.fit === 'cover') page.pushOperators(popGraphicsState());
    progress?.(Math.round(((i + 1) / files.length) * 90));
    await tick();
  }
  const blob = toPdfBlob(await output.save());
  progress?.(100);
  return blob;
}
