import type { OfficeDocumentLoader, OfficeRenderDocument } from './office';
import type { RasterPage } from './pdf-raster';
import { loadDocumentFonts } from './document-fonts';
import { OfficeToolError } from './office-errors';

const MAX_PIXELS = 12_000_000;

function pngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
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

export const loadBrowserOffice: OfficeDocumentLoader = async (bytes, kind) => {
  if (typeof document === 'undefined' || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw new OfficeToolError('officeBrowser');
  await loadDocumentFonts();
  const canvas = document.createElement('canvas');
  const common = {
    mode: 'main' as const,
    useGoogleFonts: false,
    sliceLayout: true,
    progressiveLayout: false,
    workerTimeoutMs: 30_000,
    resourceLimits: { maxArchiveEntries: 1_000, maxArchiveEntryBytes: 32 * 1024 * 1024, maxTotalInflatedBytes: 100 * 1024 * 1024 },
    wasmUrl: new URL(`${import.meta.env.BASE_URL}office/${kind}_parser_bg.wasm`, window.location.href).href,
  };
  try {
    if (kind === 'docx') {
      const { DocxDocument } = await import('@silurus/ooxml/docx');
      const source = await DocxDocument.load(bytes, common);
      const adapter: OfficeRenderDocument = {
        get pageCount() { return source.pageCount; },
        pageSize: index => source.pageSize(index),
        async renderPage(index, widthPx) {
          try {
            await source.renderPage(canvas, index, { width: widthPx, dpr: 1, imageResources: { decodedByteBudget: 48 * 1024 * 1024, strategy: 'strict' } });
            return await pngBytes(canvas);
          } finally { canvas.width = 0; canvas.height = 0; }
        },
        async renderPagePixels(index, widthPx) {
          try {
            await source.renderPage(canvas, index, { width: widthPx, dpr: 1, imageResources: { decodedByteBudget: 48 * 1024 * 1024, strategy: 'strict' } });
            return canvasPixels(canvas);
          } finally { canvas.width = 0; canvas.height = 0; }
        },
        destroy() { source.destroy(); canvas.width = 0; canvas.height = 0; },
      };
      return adapter;
    }
    const { PptxPresentation } = await import('@silurus/ooxml/pptx');
    const source = await PptxPresentation.load(bytes, common);
    return {
      get pageCount() { return source.slideCount; },
      pageSize: () => ({ widthPt: source.slideWidth / 12_700, heightPt: source.slideHeight / 12_700 }),
      async renderPage(index, widthPx) {
        try {
          await source.renderSlide(canvas, index, { width: widthPx, dpr: 1, imageResources: { decodedByteBudget: 48 * 1024 * 1024, strategy: 'strict' } });
          return await pngBytes(canvas);
        } finally { canvas.width = 0; canvas.height = 0; }
      },
      async renderPagePixels(index, widthPx) {
        try {
          await source.renderSlide(canvas, index, { width: widthPx, dpr: 1, imageResources: { decodedByteBudget: 48 * 1024 * 1024, strategy: 'strict' } });
          return canvasPixels(canvas);
        } finally { canvas.width = 0; canvas.height = 0; }
      },
      destroy() { source.destroy(); canvas.width = 0; canvas.height = 0; },
    };
  } catch (error) {
    canvas.width = 0; canvas.height = 0;
    throw error;
  }
};
