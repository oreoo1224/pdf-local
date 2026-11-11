import { PDFDocument } from 'pdf-lib';
import { parsePageRange, toPdfBlob } from './pdf';
import { OFFICE_MAX_INPUT, validateOfficeBytes, type OfficeKind } from './office-archive';
import { OfficeToolError, officeError } from './office-errors';

export { OfficeToolError } from './office-errors';
export type { OfficeErrorCode } from './office-errors';
export type { OfficeKind } from './office-archive';
export interface OfficeOptions { scale: number; range: string; }
export interface OfficeRenderDocument {
  readonly pageCount: number;
  pageSize(index: number): { widthPt: number; heightPt: number };
  /** A PNG at the requested pixel width; the renderer owns canvas cleanup. */
  renderPage(index: number, widthPx: number): Promise<Uint8Array>;
  destroy(): void | Promise<void>;
}
export type OfficeDocumentLoader = (bytes: ArrayBuffer, kind: OfficeKind) => Promise<OfficeRenderDocument>;
const MAX_PAGES = 50;
const MAX_PIXELS = 12_000_000;
const MAX_OUTPUT = 100 * 1024 * 1024;
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

async function checkedBytes(file: File, kind: OfficeKind): Promise<Uint8Array> {
  if (!['docx', 'pptx'].includes(kind) || !file.name.toLowerCase().endsWith(`.${kind}`)) throw new OfficeToolError('officeUnsupported');
  if (file.size > OFFICE_MAX_INPUT) throw new OfficeToolError('officeTooLarge');
  const bytes = new Uint8Array(await file.arrayBuffer());
  await validateOfficeBytes(bytes, kind);
  return bytes;
}

export async function validateOfficeFile(file: File, kind: OfficeKind): Promise<void> {
  await checkedBytes(file, kind);
}

/** Shared PDF assembly seam used by the real-browser and Node render adapters. */
export async function officeToPdfWithRenderer(
  file: File,
  kind: OfficeKind,
  options: OfficeOptions,
  loadDocument: OfficeDocumentLoader,
  progress?: (percent: number) => void,
): Promise<{ blob: Blob; name: string; pageCount: number }> {
  if (!Number.isFinite(options.scale) || options.scale < 0.5 || options.scale > 2) throw new OfficeToolError('officeLimit');
  let source: OfficeRenderDocument | undefined;
  try {
    progress?.(0);
    const bytes = await checkedBytes(file, kind);
    progress?.(5);
    source = await loadDocument(new Uint8Array(bytes).buffer, kind);
    if (!Number.isInteger(source.pageCount) || source.pageCount < 1 || source.pageCount > 10_000) throw new OfficeToolError('officeLimit');
    const indices = parsePageRange(options.range, source.pageCount);
    if (indices.length > MAX_PAGES) throw new OfficeToolError('officeLimit');
    const output = await PDFDocument.create();
    output.setProducer('PDFEditNow — browser-local Office trial');
    let accumulatedBytes = 0;
    for (let position = 0; position < indices.length; position++) {
      const index = indices[position]!;
      const { widthPt, heightPt } = source.pageSize(index);
      const widthPx = Math.ceil(widthPt * 96 / 72 * options.scale);
      const heightPx = Math.ceil(heightPt * 96 / 72 * options.scale);
      if (![widthPt, heightPt].every(value => Number.isFinite(value) && value > 0 && value <= 14_400)
        || widthPx > 16_384 || heightPx > 16_384 || widthPx * heightPx > MAX_PIXELS) throw new OfficeToolError('officeLimit');
      const png = await source.renderPage(index, widthPx);
      accumulatedBytes += png.byteLength;
      if (accumulatedBytes > MAX_OUTPUT) throw new OfficeToolError('officeLimit');
      const image = await output.embedPng(png);
      if (image.width * image.height > MAX_PIXELS) throw new OfficeToolError('officeLimit');
      const page = output.addPage([widthPt, heightPt]);
      page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
      progress?.(Math.round(10 + ((position + 1) / indices.length) * 80));
      await tick();
    }
    const blob = toPdfBlob(await output.save());
    if (blob.size > MAX_OUTPUT) throw new OfficeToolError('officeLimit');
    const stem = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'document';
    progress?.(100);
    return { blob, name: `${stem}.pdf`, pageCount: indices.length };
  } catch (error) {
    throw officeError(error);
  } finally {
    await source?.destroy();
  }
}

export async function officeToPdf(
  file: File,
  kind: OfficeKind,
  options: OfficeOptions,
  progress?: (percent: number) => void,
): Promise<{ blob: Blob; name: string; pageCount: number }> {
  const { loadBrowserOffice } = await import('./office-browser');
  return officeToPdfWithRenderer(file, kind, options, loadBrowserOffice, progress);
}
