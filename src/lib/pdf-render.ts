import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { zip } from 'fflate';
import { inspectPdf, parsePageRange, PdfToolError, type Progress } from './pdf';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const MAX_CANVAS_PIXELS = 24_000_000;
const MAX_TOTAL_OUTPUT = 150 * 1024 * 1024;
const yieldFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new PdfToolError('memoryLimit')), type, quality);
  });
}

async function openPdf(file: File): Promise<{ pdf: pdfjs.PDFDocumentProxy; destroy: () => Promise<void> }> {
  // pdf-lib also catches passwordless encrypted PDFs, which PDF.js otherwise opens.
  await inspectPdf(file);
  const loading = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
    iccUrl: `${import.meta.env.BASE_URL}pdfjs/iccs/`,
    wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/`,
    stopAtErrors: true,
  });
  try {
    return { pdf: await loading.promise, destroy: () => loading.destroy() };
  } catch (error) {
    await loading.destroy();
    if (error instanceof Error && /password|encrypt/i.test(`${error.name} ${error.message}`)) throw new PdfToolError('encrypted');
    throw new PdfToolError('invalidPdf');
  }
}

export async function renderThumbnails(
  file: File,
  onPage: (page: { index: number; url: string; width: number; height: number }) => void,
  signal?: AbortSignal,
): Promise<{ pageCount: number; cleanup: () => void }> {
  checkAbort(signal);
  const handle = await openPdf(file);
  const source = handle.pdf;
  const urls: string[] = [];
  const canvas = document.createElement('canvas');
  const cleanup = () => {
    for (const url of urls) URL.revokeObjectURL(url);
    urls.length = 0;
  };
  let activeRender: ReturnType<pdfjs.PDFPageProxy['render']> | undefined;
  const cancel = () => activeRender?.cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (source.numPages > 1_000) throw new PdfToolError('memoryLimit');
    for (let index = 0; index < source.numPages; index++) {
      checkAbort(signal);
      const page = await source.getPage(index + 1);
      try {
        const natural = page.getViewport({ scale: 1 });
        if (!Number.isFinite(natural.width) || !Number.isFinite(natural.height) || natural.width <= 0 || natural.height <= 0) throw new PdfToolError('invalidPdf');
        const viewport = page.getViewport({ scale: Math.min(220 / natural.width, 260 / natural.height) });
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) throw new PdfToolError('memoryLimit');
        activeRender = page.render({ canvas, canvasContext: context, viewport, background: 'rgb(255,255,255)' });
        await activeRender.promise;
        activeRender = undefined;
        checkAbort(signal);
        const blob = await canvasBlob(canvas, 'image/jpeg', 0.7);
        checkAbort(signal);
        const url = URL.createObjectURL(blob);
        urls.push(url);
        onPage({ index, url, width: natural.width, height: natural.height });
      } finally {
        page.cleanup();
      }
      await yieldFrame();
    }
    return { pageCount: source.numPages, cleanup };
  } catch (error) {
    cleanup();
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error instanceof PdfToolError) throw error;
    throw new PdfToolError('invalidPdf');
  } finally {
    signal?.removeEventListener('abort', cancel);
    canvas.width = 0;
    canvas.height = 0;
    await handle.destroy();
  }
}

function makeZip(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  // Images are already compressed; level zero avoids expensive recompression.
  // fflate's async API moves ZIP assembly into a temporary Web Worker.
  return new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, data) => error ? reject(error) : resolve(data));
  });
}

export async function pdfToImages(
  file: File,
  options: { format: 'jpg' | 'png'; scale: number; quality: number; range: string },
  progress?: Progress,
): Promise<{ blob: Blob; name: string }> {
  if (!['jpg', 'png'].includes(options.format) || !Number.isFinite(options.scale)
    || options.scale < 0.5 || options.scale > 4 || !Number.isFinite(options.quality)
    || options.quality < 0.1 || options.quality > 1) throw new PdfToolError('invalidRange');
  const handle = await openPdf(file);
  const source = handle.pdf;
  const canvas = document.createElement('canvas');
  const output: Record<string, Uint8Array> = {};
  const stem = file.name.replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'pages';
  let totalBytes = 0;
  try {
    const indices = parsePageRange(options.range, source.numPages);
    if (indices.length > 100) throw new PdfToolError('memoryLimit');
    progress?.(0);
    let single: Blob | undefined;
    let singleName = '';
    for (let position = 0; position < indices.length; position++) {
      const index = indices[position]!;
      const page = await source.getPage(index + 1);
      try {
        const viewport = page.getViewport({ scale: options.scale });
        if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0
          || Math.ceil(viewport.width) * Math.ceil(viewport.height) > MAX_CANVAS_PIXELS
          || viewport.width > 16_384 || viewport.height > 16_384) throw new PdfToolError('memoryLimit');
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) throw new PdfToolError('memoryLimit');
        await page.render({ canvas, canvasContext: context, viewport, background: 'rgb(255,255,255)' }).promise;
        const blob = await canvasBlob(canvas, options.format === 'jpg' ? 'image/jpeg' : 'image/png', options.quality);
        totalBytes += blob.size;
        if (totalBytes > MAX_TOTAL_OUTPUT) throw new PdfToolError('memoryLimit');
        const name = `${stem}-page-${String(index + 1).padStart(3, '0')}.${options.format}`;
        if (indices.length === 1) {
          single = blob;
          singleName = name;
        } else {
          output[name] = new Uint8Array(await blob.arrayBuffer());
        }
        progress?.(Math.round(((position + 1) / indices.length) * 90));
      } finally {
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
      await yieldFrame();
    }
    if (single) {
      progress?.(100);
      return { blob: single, name: singleName };
    }
    const bytes = await makeZip(output);
    const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' });
    progress?.(100);
    return { blob, name: `${stem}-images.zip` };
  } catch (error) {
    if (error instanceof PdfToolError) throw error;
    throw new PdfToolError('invalidPdf');
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    for (const key of Object.keys(output)) delete output[key];
    await handle.destroy();
  }
}
