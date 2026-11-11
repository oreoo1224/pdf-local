import type { HwpDocument } from '@rhwp/core';
import type { HangulDocumentLoader } from './hangul';
import { OfficeToolError } from './office-errors';

type Core = typeof import('@rhwp/core');
let corePromise: Promise<Core> | undefined;
let fontPromise: Promise<void> | undefined;
let measureCanvas: HTMLCanvasElement | undefined;
const MAX_PIXELS = 12_000_000;

async function prepareFonts(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  fontPromise ??= (async () => {
    const existing = Array.from(document.fonts).filter(face => face.status === 'loaded').map(face => face.family.replace(/["']/g, ''));
    const families = ['Noto Sans KR', 'Noto Serif KR'].filter(family => !existing.includes(family));
    if (!families.length) return;
    const response = await fetch(new URL(`${import.meta.env.BASE_URL}fonts/NotoSansKR.ttf`, window.location.href));
    if (!response.ok) throw new OfficeToolError('officeRender');
    const bytes = await response.arrayBuffer();
    for (const family of families) {
      const face = new FontFace(family, bytes, { weight: '100 900' });
      await face.load();
      document.fonts.add(face);
    }
  })().catch(error => { fontPromise = undefined; throw error; });
  return fontPromise;
}

async function loadCore(): Promise<Core> {
  if (typeof document === 'undefined' || typeof WebAssembly === 'undefined') throw new OfficeToolError('officeBrowser');
  await prepareFonts();
  // rhwp's browser layout callback measures against the same locally available
  // Canvas fonts used for painting. No file or text leaves the page.
  measureCanvas ??= document.createElement('canvas');
  const context = measureCanvas.getContext('2d');
  if (!context) throw new OfficeToolError('officeBrowser');
  (globalThis as typeof globalThis & { measureTextWidth?: (font: string, text: string) => number }).measureTextWidth = (font, text) => {
    context.font = font;
    return context.measureText(text).width;
  };
  corePromise ??= (async () => {
    const core = await import('@rhwp/core');
    const url = new URL(`${import.meta.env.BASE_URL}hangul/rhwp_bg.wasm`, window.location.href).href;
    await core.default({ module_or_path: url });
    return core;
  })().catch(error => { corePromise = undefined; throw error; });
  return corePromise;
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
    return {
      pageCount: documentSource.pageCount(),
      pageSize: page => pageDimensions(documentSource, page),
      async renderPage(page, width) {
        try {
          const dimensions = pageDimensions(documentSource, page);
          const scale = width / dimensions.widthPx;
          if (Math.ceil(dimensions.widthPx * scale) * Math.ceil(dimensions.heightPx * scale) > MAX_PIXELS) throw new OfficeToolError('officeLimit');
          // Canvas output avoids inserting untrusted SVG/HTML into the DOM and
          // uses the already-loaded local font set.
          documentSource.renderPageToCanvas(page, canvas, scale);
          return await canvasPng(canvas);
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
