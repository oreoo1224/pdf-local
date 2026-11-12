import type { HwpDocument } from '@rhwp/core';
import type { HangulDocumentLoader } from './hangul';
import type { RasterPage } from './pdf-raster';
import { loadDocumentFonts } from './document-fonts';
import { OfficeToolError } from './office-errors';

type Core = typeof import('@rhwp/core');
let corePromise: Promise<Core> | undefined;
let measureCanvas: HTMLCanvasElement | undefined;
const MAX_PIXELS = 12_000_000;

async function loadCore(): Promise<Core> {
  if (typeof document === 'undefined' || typeof WebAssembly === 'undefined') throw new OfficeToolError('officeBrowser');
  // rhwp's browser layout callback measures against the same locally available
  // Canvas fonts used for painting. No file or text leaves the page.
  measureCanvas ??= document.createElement('canvas');
  const context = measureCanvas.getContext('2d');
  if (!context) throw new OfficeToolError('officeBrowser');
  (globalThis as typeof globalThis & { measureTextWidth?: (font: string, text: string) => number }).measureTextWidth = (font, text) => {
    context.font = font;
    return context.measureText(text).width;
  };
  const fonts = loadDocumentFonts();
  corePromise ??= (async () => {
    const core = await import('@rhwp/core');
    const url = new URL(`${import.meta.env.BASE_URL}hangul/rhwp_bg.wasm`, window.location.href).href;
    await core.default({ module_or_path: url });
    return core;
  })().catch(error => { corePromise = undefined; throw error; });
  const [core] = await Promise.all([corePromise, fonts]);
  return core;
}

/** Prepare shared assets without opening or retaining any document bytes. */
export async function warmupBrowserHangul(): Promise<void> {
  await loadCore();
}

function pageDimensions(source: HwpDocument, page: number): { widthPt: number; heightPt: number; widthPx: number; heightPx: number } {
  let info: { width?: number; height?: number };
  try { info = JSON.parse(source.getPageInfo(page)); }
  catch { throw new OfficeToolError('officeCorrupt'); }
  const widthPx = Number(info.width), heightPx = Number(info.height);
  if (![widthPx, heightPx].every(value => Number.isFinite(value) && value > 0 && value <= 19_200)) throw new OfficeToolError('officeLimit');
  return { widthPt: widthPx * 72 / 96, heightPt: heightPx * 72 / 96, widthPx, heightPx };
}

function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  if (!canvas.width || !canvas.height || canvas.width * canvas.height > MAX_PIXELS) throw new OfficeToolError('officeLimit');
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new OfficeToolError('officeRender')); return; }
      blob.arrayBuffer().then(bytes => resolve(new Uint8Array(bytes)), reject);
    }, 'image/png');
  });
}

function canvasPixels(canvas: HTMLCanvasElement): RasterPage {
  const { width, height } = canvas;
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= 16_384)
    || width * height > MAX_PIXELS) throw new OfficeToolError('officeLimit');
  const context = canvas.getContext('2d');
  if (!context) throw new OfficeToolError('officeBrowser');
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

export const loadBrowserHangul: HangulDocumentLoader = async bytes => {
  const core = await loadCore();
  const canvas = document.createElement('canvas');
  let source: HwpDocument | undefined;
  try {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    source = new core.HwpDocument(new Uint8Array(bytes));
    const info = JSON.parse(source.getDocumentInfo()) as { encrypted?: boolean; hwp3Variant?: boolean };
    if (info.encrypted || info.hwp3Variant) throw new OfficeToolError('officeUnsupported');
    const external = JSON.parse(source.getExternalImageReferences()) as unknown;
    if (!Array.isArray(external) || external.length) throw new OfficeToolError('officeExternal');
    source.setFallbackFont('Noto Sans KR');
    const documentSource = source;
    const render = (page: number, width: number) => {
      const dimensions = pageDimensions(documentSource, page);
      const scale = width / dimensions.widthPx;
      const widthPx = Math.ceil(dimensions.widthPx * scale), heightPx = Math.ceil(dimensions.heightPx * scale);
      if (![widthPx, heightPx].every(value => Number.isSafeInteger(value) && value > 0 && value <= 16_384)
        || widthPx * heightPx > MAX_PIXELS) throw new OfficeToolError('officeLimit');
      // Canvas output avoids inserting untrusted SVG/HTML into the DOM and
      // uses the already-loaded local font set.
      documentSource.renderPageToCanvas(page, canvas, scale);
    };
    return {
      pageCount: documentSource.pageCount(),
      pageSize: page => pageDimensions(documentSource, page),
      async renderPage(page, width) {
        try {
          render(page, width);
          return await canvasPng(canvas);
        } finally { canvas.width = 0; canvas.height = 0; }
      },
      async renderPagePixels(page, width) {
        try {
          render(page, width);
          return canvasPixels(canvas);
        } finally { canvas.width = 0; canvas.height = 0; }
      },
      destroy() { documentSource.free(); canvas.width = 0; canvas.height = 0; },
    };
  } catch (error) {
    source?.free();
    canvas.width = 0; canvas.height = 0;
    if (error instanceof OfficeToolError) throw error;
    if (error instanceof Error && /encrypt|password|drm|배포|암호/i.test(error.message)) throw new OfficeToolError('officeUnsupported');
    throw new OfficeToolError('officeCorrupt');
  }
};
