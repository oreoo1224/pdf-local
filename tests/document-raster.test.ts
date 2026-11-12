import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import init, { HwpDocument } from '@rhwp/core';
import {
  createCanvas, loadImage, GlobalFonts, Canvas, Image, ImageData, Path2D, DOMMatrix,
} from '@napi-rs/canvas';
import { openDocxDocument, type NodeCanvasFactory } from '@silurus/ooxml/node';
import {
  PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, decodePDFRawStream,
} from 'pdf-lib';
import { hangulToPdfWithRenderer, type HangulDocumentLoader, type HangulKind } from '../src/lib/hangul';
import { officeToPdfWithRenderer, type OfficeDocumentLoader, type OfficeRenderDocument } from '../src/lib/office';

const SCALE = 1.5;
let pdfjs: typeof import('pdfjs-dist/legacy/build/pdf.mjs');

beforeAll(async () => {
  const font = fileURLToPath(new URL('../public/fonts/NotoSansKR.ttf', import.meta.url));
  for (const family of ['Noto Sans KR', 'Noto Serif KR']) GlobalFonts.registerFromPath(font, family);
  const measurement = createCanvas(1, 1).getContext('2d');
  Object.assign(globalThis, {
    measureTextWidth: (font: string, text: string) => { measurement.font = font; return measurement.measureText(text).width; },
    HTMLCanvasElement: Canvas,
    CanvasRenderingContext2D: measurement.constructor,
    Image, ImageData, Path2D, DOMMatrix,
    window: globalThis,
    Window: class { static [Symbol.hasInstance](value: unknown) { return value === globalThis; } },
    document: { createElement: (name: string) => name === 'canvas' ? createCanvas(1, 1) : undefined },
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
    cancelAnimationFrame: clearTimeout,
  });
  await init({ module_or_path: await readFile(new URL('../node_modules/@rhwp/core/rhwp_bg.wasm', import.meta.url)) });
  pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
});

interface CapturedPage {
  index: number;
  requestedWidth: number;
  width: number;
  height: number;
  widthPt: number;
  heightPt: number;
  pixels: Uint8ClampedArray;
}

/** Both adapters use rhwp's actual Canvas backend. Only the transfer from the
 * rendered canvas to the production PDF assembly engine differs. */
function renderer(usePixels: boolean, captured: CapturedPage[], calls: string[]): HangulDocumentLoader {
  return async bytes => {
    const source = new HwpDocument(new Uint8Array(bytes));
    source.setFallbackFont('Noto Sans KR');
    const dimensions = (index: number) => {
      const { width, height } = JSON.parse(source.getPageInfo(index)) as { width: number; height: number };
      return { width, height, widthPt: width * 72 / 96, heightPt: height * 72 / 96 };
    };
    const paint = (index: number, requestedWidth: number) => {
      const size = dimensions(index);
      const canvas = createCanvas(1, 1);
      source.renderPageToCanvas(index, canvas as unknown as HTMLCanvasElement, requestedWidth / size.width);
      return { canvas, size };
    };
    const adapter: OfficeRenderDocument = {
      pageCount: source.pageCount(),
      pageSize: dimensions,
      async renderPage(index, requestedWidth) {
        calls.push('png');
        const { canvas } = paint(index, requestedWidth);
        try { return canvas.toBuffer('image/png'); }
        finally { canvas.width = 0; canvas.height = 0; }
      },
      destroy() { source.free(); },
    };
    if (usePixels) adapter.renderPagePixels = async (index, requestedWidth) => {
      calls.push('rgba');
      const { canvas, size } = paint(index, requestedWidth);
      try {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        captured.push({ index, requestedWidth, width: canvas.width, height: canvas.height, widthPt: size.widthPt, heightPt: size.heightPt, pixels });
        return { width: canvas.width, height: canvas.height, data: pixels };
      } finally { canvas.width = 0; canvas.height = 0; }
    };
    return adapter;
  };
}

function docxRenderer(usePixels: boolean, captured: CapturedPage[], calls: string[]): OfficeDocumentLoader {
  const factory: NodeCanvasFactory = {
    // rhwp's global HTMLCanvasElement shim makes OOXML recognize these as
    // element-backed canvases, whose browser sizing branch writes style.
    createCanvas: (width, height) => Object.assign(createCanvas(width, height), { style: {} }),
    loadImage: bytes => loadImage(Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))),
  };
  return async bytes => {
    const source = await openDocxDocument(bytes, { factory, cjkFallback: 'kr' });
    const paint = async (index: number, width: number) => await source.renderPage(index, { width, dpr: 1 }) as Canvas;
    const adapter: OfficeRenderDocument = {
      pageCount: source.pageCount,
      pageSize: index => source.pageSize(index),
      async renderPage(index, requestedWidth) {
        calls.push('png');
        const canvas = await paint(index, requestedWidth);
        try { return canvas.toBuffer('image/png'); }
        finally { canvas.width = 0; canvas.height = 0; }
      },
      destroy() { return source.close(); },
    };
    if (usePixels) adapter.renderPagePixels = async (index, requestedWidth) => {
      calls.push('rgba');
      const canvas = await paint(index, requestedWidth);
      try {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        captured.push({ index, requestedWidth, width: canvas.width, height: canvas.height, ...source.pageSize(index), pixels });
        return { width: canvas.width, height: canvas.height, data: pixels };
      } finally { canvas.width = 0; canvas.height = 0; }
    };
    return adapter;
  };
}

async function renderedPages(bytes: ArrayBuffer): Promise<Buffer[]> {
  const loading = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  try {
    const document = await loading.promise;
    const pages: Buffer[] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const viewport = page.getViewport({ scale: 96 / 72 * SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      try {
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
        pages.push(Buffer.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data));
      } finally { canvas.width = 0; canvas.height = 0; }
      page.cleanup();
    }
    return pages;
  } finally { await loading.destroy(); }
}

/** Verify the PDF stores every original RGB/alpha sample, not just a similar
 * looking image after rescaling. PDF.js separately exercises actual rendering. */
function expectOriginalSamples(pdf: PDFDocument, captured: CapturedPage[]): void {
  for (const [index, expected] of captured.entries()) {
    const page = pdf.getPage(index);
    expect(page.getWidth()).toBeCloseTo(expected.widthPt, 7);
    expect(page.getHeight()).toBeCloseTo(expected.heightPt, 7);
    expect(expected.requestedWidth).toBe(Math.ceil(expected.widthPt * 96 / 72 * SCALE));
    const images = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    expect(images.keys()).toHaveLength(1);
    const image = images.lookup(images.keys()[0]!);
    if (!(image instanceof PDFRawStream)) throw new Error('Expected a raw image stream');
    expect(image.dict.lookup(PDFName.of('Width'), PDFNumber).asNumber()).toBe(expected.width);
    expect(image.dict.lookup(PDFName.of('Height'), PDFNumber).asNumber()).toBe(expected.height);
    const rgb = decodePDFRawStream(image).decode();
    const mask = image.dict.lookup(PDFName.of('SMask'));
    if (mask !== undefined && !(mask instanceof PDFRawStream)) throw new Error('Expected a raw alpha stream');
    const alpha = mask ? decodePDFRawStream(mask).decode() : undefined;
    const reconstructed = new Uint8Array(expected.pixels.length);
    for (let pixel = 0; pixel < expected.width * expected.height; pixel++) {
      reconstructed[pixel * 4] = rgb[pixel * 3]!;
      reconstructed[pixel * 4 + 1] = rgb[pixel * 3 + 1]!;
      reconstructed[pixel * 4 + 2] = rgb[pixel * 3 + 2]!;
      reconstructed[pixel * 4 + 3] = alpha?.[pixel] ?? 255;
    }
    expect(Buffer.from(reconstructed).equals(Buffer.from(expected.pixels))).toBe(true);
  }
}

describe('lossless document raster integration', () => {
  it('prefers actual Word RGBA rendering and preserves PNG output pixels at scale 1.5', async () => {
    const bytes = await readFile(new URL('./fixtures/simple.docx', import.meta.url));
    const input = new File([new Uint8Array(bytes).buffer], 'simple.docx');
    const captured: CapturedPage[] = [], pngCalls: string[] = [], rawCalls: string[] = [];
    const options = { scale: SCALE, range: '' };
    const png = await officeToPdfWithRenderer(input, 'docx', options, docxRenderer(false, [], pngCalls));
    const raw = await officeToPdfWithRenderer(input, 'docx', options, docxRenderer(true, captured, rawCalls));
    expect(raw.pageCount).toBe(1);
    expect(captured.map(page => page.index)).toEqual([0]);
    expect(pngCalls).toEqual(['png']);
    expect(rawCalls).toEqual(['rgba']);
    const rawBytes = await raw.blob.arrayBuffer();
    const pdf = await PDFDocument.load(rawBytes, { updateMetadata: false });
    expect(pdf.getPageCount()).toBe(1);
    expectOriginalSamples(pdf, captured);
    const expectedPixels = await renderedPages(await png.blob.arrayBuffer());
    const actualPixels = await renderedPages(rawBytes);
    expect(actualPixels[0]!.equals(expectedPixels[0]!)).toBe(true);
  }, 30_000);

  it.each([
    { name: 'simple.hwp', kind: 'hwp', range: '', indices: [0] },
    { name: 'simple.hwpx', kind: 'hwpx', range: '', indices: [0] },
    { name: 'two-pages.hwpx', kind: 'hwpx', range: '2,1', indices: [1, 0] },
  ] as const)('preserves actual $name samples, page dimensions and range order at scale 1.5', async ({ name, kind, range, indices }) => {
    const bytes = await readFile(new URL(`./fixtures/${name}`, import.meta.url));
    const input = new File([new Uint8Array(bytes).buffer], name);
    const captured: CapturedPage[] = [], pngCalls: string[] = [], rawCalls: string[] = [];
    const options = { scale: SCALE, range };
    const png = await hangulToPdfWithRenderer(input, kind as HangulKind, options, renderer(false, [], pngCalls));
    const raw = await hangulToPdfWithRenderer(input, kind as HangulKind, options, renderer(true, captured, rawCalls));
    expect(raw.pageCount).toBe(indices.length);
    expect(captured.map(page => page.index)).toEqual(indices);
    expect(pngCalls).toEqual(indices.map(() => 'png'));
    expect(rawCalls).toEqual(indices.map(() => 'rgba'));
    const rawBytes = await raw.blob.arrayBuffer();
    const pdf = await PDFDocument.load(rawBytes, { updateMetadata: false });
    expect(pdf.getPageCount()).toBe(indices.length);
    expectOriginalSamples(pdf, captured);
    const expectedPixels = await renderedPages(await png.blob.arrayBuffer());
    const actualPixels = await renderedPages(rawBytes);
    for (const [index, pixels] of actualPixels.entries()) expect(pixels.equals(expectedPixels[index]!)).toBe(true);
    if (actualPixels.length > 1) expect(actualPixels[0]!.equals(actualPixels[1]!)).toBe(false);
  }, 30_000);
});
