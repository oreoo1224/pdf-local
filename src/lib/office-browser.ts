import type { OfficeDocumentLoader, OfficeRenderDocument } from './office';
import { OfficeToolError } from './office-errors';

const MAX_PIXELS = 12_000_000;
let fontPromise: Promise<void> | undefined;

async function loadLocalFonts(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  fontPromise ??= (async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSansKR.ttf`);
    if (!response.ok) throw new OfficeToolError('officeRender');
    const bytes = await response.arrayBuffer();
    // The renderer's regional fallback chains include these families. The
    // second alias substitutes a sans face for an unavailable CJK serif face;
    // the trial UI clearly discloses font/layout differences.
    for (const family of ['Noto Sans KR', 'Noto Serif KR']) {
      const face = new FontFace(family, bytes, { weight: '100 900' });
      await face.load();
      document.fonts.add(face);
    }
  })().catch(error => { fontPromise = undefined; throw error; });
  return fontPromise;
}

function pngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  if (!canvas.width || !canvas.height || canvas.width * canvas.height > MAX_PIXELS) throw new OfficeToolError('officeLimit');
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new OfficeToolError('officeRender')); return; }
      blob.arrayBuffer().then(bytes => resolve(new Uint8Array(bytes)), reject);
    }, 'image/png');
  });
}

export const loadBrowserOffice: OfficeDocumentLoader = async (bytes, kind) => {
  if (typeof document === 'undefined' || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw new OfficeToolError('officeBrowser');
  await loadLocalFonts();
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
      destroy() { source.destroy(); canvas.width = 0; canvas.height = 0; },
    };
  } catch (error) {
    canvas.width = 0; canvas.height = 0;
    throw error;
  }
};
