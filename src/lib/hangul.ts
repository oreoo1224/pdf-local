import { PDFDocument } from 'pdf-lib';
import { parsePageRange, toPdfBlob } from './pdf';
import type { OfficeOptions, OfficeRenderDocument } from './office';
import { OfficeToolError, officeError } from './office-errors';
import { MAX_HANGUL_INPUT, validateHangulBytes, type HangulKind } from './hangul-archive';
import { readValidatedDocument } from './document-input';
import { appendRasterPage } from './pdf-raster';

export type { HangulKind } from './hangul-archive';
export type HangulDocumentLoader = (bytes: ArrayBuffer, kind: HangulKind) => Promise<OfficeRenderDocument>;
const MAX_PAGES = 50;
const MAX_PIXELS = 12_000_000;
const MAX_OUTPUT = 100 * 1024 * 1024;
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

async function checkedBytes(file: File, kind: HangulKind): Promise<Uint8Array<ArrayBuffer>> {
  if (!['hwp', 'hwpx'].includes(kind) || !file.name.toLowerCase().endsWith(`.${kind}`)) throw new OfficeToolError('officeUnsupported');
  if (file.size > MAX_HANGUL_INPUT) throw new OfficeToolError('officeTooLarge');
  return readValidatedDocument(file,kind,bytes=>validateHangulBytes(bytes,kind));
}

export async function validateHangulFile(file: File, kind: HangulKind): Promise<void> {
  await checkedBytes(file, kind);
}

/** The real browser adapter and the Node/WASM sample tests use the same bounded
 * PDF assembly path. Source documents remain unchanged. */
export async function hangulToPdfWithRenderer(
  file: File,
  kind: HangulKind,
  options: OfficeOptions,
  loadDocument: HangulDocumentLoader,
  progress?: (percent: number) => void,
): Promise<{ blob: Blob; name: string; pageCount: number }> {
  if (!Number.isFinite(options.scale) || options.scale < 0.5 || options.scale > 2) throw new OfficeToolError('officeLimit');
  let source: OfficeRenderDocument | undefined;
  try {
    progress?.(0);
    const bytes = await checkedBytes(file, kind);
    progress?.(5);
    source = await loadDocument(bytes.buffer, kind);
    if (!Number.isSafeInteger(source.pageCount) || source.pageCount < 1 || source.pageCount > 1_000) throw new OfficeToolError('officeLimit');
    const indices = parsePageRange(options.range, source.pageCount);
    if (indices.length > MAX_PAGES) throw new OfficeToolError('officeLimit');
    const output = await PDFDocument.create();
    output.setProducer('PDFEditGo — browser-local Hangul conversion');
    let accumulated = 0;
    for (let position = 0; position < indices.length; position++) {
      const index = indices[position]!;
      const { widthPt, heightPt } = source.pageSize(index);
      const widthPx = Math.ceil(widthPt * 96 / 72 * options.scale);
      const heightPx = Math.ceil(heightPt * 96 / 72 * options.scale);
      if (![widthPt, heightPt].every(value => Number.isFinite(value) && value > 0 && value <= 14_400)
        || widthPx > 16_384 || heightPx > 16_384 || widthPx * heightPx > MAX_PIXELS) throw new OfficeToolError('officeLimit');
      if(source.renderPagePixels){
        const pixels=await source.renderPagePixels(index,widthPx);
        accumulated+=await appendRasterPage(output,pixels,widthPt,heightPt);
      }else{
        const png = await source.renderPage(index, widthPx);
        accumulated += png.byteLength;
        if (accumulated > MAX_OUTPUT) throw new OfficeToolError('officeLimit');
        const image = await output.embedPng(png);
        if (image.width * image.height > MAX_PIXELS) throw new OfficeToolError('officeLimit');
        output.addPage([widthPt, heightPt]).drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
      }
      if (accumulated > MAX_OUTPUT) throw new OfficeToolError('officeLimit');
      progress?.(Math.round(10 + (position + 1) / indices.length * 80));
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
    try { await source?.destroy(); }
    catch { /* Cleanup must not discard a completed PDF or replace the conversion error. */ }
  }
}

export async function hangulToPdf(
  file: File,
  kind: HangulKind,
  options: OfficeOptions,
  progress?: (percent: number) => void,
): Promise<{ blob: Blob; name: string; pageCount: number }> {
  const { loadBrowserHangul } = await import('./hangul-browser');
  return hangulToPdfWithRenderer(file, kind, options, loadBrowserHangul, progress);
}
