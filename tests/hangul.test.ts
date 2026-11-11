import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { strToU8, unzipSync, zipSync, Zip, ZipDeflate } from 'fflate';
import init, { HwpDocument } from '@rhwp/core';
import { createCanvas, GlobalFonts, Canvas, Image, ImageData, Path2D } from '@napi-rs/canvas';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import {
  validateHangulFile, hangulToPdfWithRenderer,
  type HangulKind, type HangulDocumentLoader,
} from '../src/lib/hangul';
import type { OfficeRenderDocument } from '../src/lib/office';

const fixturePath = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const file = (bytes: Uint8Array | string, name: string) => new File([
  typeof bytes === 'string' ? bytes : new Uint8Array(bytes).buffer,
], name);
const fixture = async (kind: HangulKind) => file(await readFile(fixturePath(`simple.${kind}`)), `simple.${kind}`);
const outputDirectory = process.env.HANGUL_TEST_ARTIFACTS_DIR;
const renderedPages: { index: number; ink: number; colored: number }[] = [];

beforeAll(async () => {
  const font = fileURLToPath(new URL('../public/fonts/NotoSansKR.ttf', import.meta.url));
  for (const family of ['Noto Sans KR', 'Noto Serif KR']) GlobalFonts.registerFromPath(font, family);
  const measurement = createCanvas(1, 1).getContext('2d');
  Object.assign(globalThis, {
    measureTextWidth: (font: string, text: string) => { measurement.font = font; return measurement.measureText(text).width; },
    HTMLCanvasElement: Canvas,
    CanvasRenderingContext2D: measurement.constructor,
    Image, ImageData, Path2D,
    window: globalThis,
    Window: class { static [Symbol.hasInstance](value: unknown) { return value === globalThis; } },
    document: { createElement: (name: string) => name === 'canvas' ? createCanvas(1, 1) : undefined },
  });
  await init({ module_or_path: await readFile(new URL('../node_modules/@rhwp/core/rhwp_bg.wasm', import.meta.url)) });
  if (outputDirectory) await mkdir(outputDirectory, { recursive: true });
});

/** Executes rhwp's actual Canvas backend with Node Canvas DOM-interface shims.
 * PDF validation, selection, sizing and assembly are the production pipeline.
 * This does not establish browser Worker, file-picker or mobile behavior. */
const actualRenderer: HangulDocumentLoader = async (bytes, kind) => {
  const document = new HwpDocument(new Uint8Array(bytes));
  document.setFallbackFont('Noto Sans KR');
  return {
    pageCount: document.pageCount(),
    pageSize(index) {
      const { width, height } = JSON.parse(document.getPageInfo(index));
      return { widthPt: width * 72 / 96, heightPt: height * 72 / 96 };
    },
    async renderPage(index, widthPx) {
      const { width } = JSON.parse(document.getPageInfo(index));
      const canvas = createCanvas(1, 1);
      try {
        document.renderPageToCanvas(index, canvas as unknown as HTMLCanvasElement, widthPx / width);
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0, colored = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const minimum = Math.min(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
          const maximum = Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
          if (pixels[i + 3]! > 0 && minimum < 235) ink++;
          if (pixels[i + 3]! > 0 && maximum - minimum > 80) colored++;
        }
        expect(ink).toBeGreaterThan(300);
        renderedPages.push({ index, ink, colored });
        const png = canvas.toBuffer('image/png');
        if (outputDirectory) await writeFile(`${outputDirectory}/${kind}-page-${index + 1}.png`, png);
        return png;
      } finally { canvas.width = 0; canvas.height = 0; }
    },
    destroy() { document.free(); },
  };
};

describe('Hangul input validation', () => {
  it.each(['hwp', 'hwpx'] as const)('accepts an own-generated valid %s document', async kind => {
    await expect(validateHangulFile(await fixture(kind), kind)).resolves.toBeUndefined();
  });

  it.each([['hwp', 'hwpx'], ['hwpx', 'hwp']] as const)('rejects %s content passed as %s', async (source, target) => {
    const bytes = new Uint8Array(await (await fixture(source)).arrayBuffer());
    await expect(validateHangulFile(file(bytes, `wrong.${target}`), target)).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects a misleading filename with unsupported contents', async () => {
    await expect(validateHangulFile(file('not a document', 'fake.hwp'), 'hwp')).rejects.toHaveProperty('code');
  });

  it('rejects a Word ZIP masquerading as HWPX', async () => {
    const bytes = await readFile(fixturePath('simple.docx'));
    await expect(validateHangulFile(file(bytes, 'fake.hwpx'), 'hwpx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects old HWP3 headers', async () => {
    await expect(validateHangulFile(file('HWP Document File V3.00 \u001a', 'old.hwp'), 'hwp')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects oversized input before reading the file', async () => {
    const oversized = file('not allocated', 'large.hwp');
    Object.defineProperty(oversized, 'size', { value: 21 * 1024 * 1024 });
    const read = vi.spyOn(oversized, 'arrayBuffer');
    await expect(validateHangulFile(oversized, 'hwp')).rejects.toMatchObject({ code: 'officeTooLarge' });
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects truncated HWP allocation tables', async () => {
    const bytes = new Uint8Array(await (await fixture('hwp')).arrayBuffer());
    await expect(validateHangulFile(file(bytes.subarray(0, bytes.length - 512), 'broken.hwp'), 'hwp')).rejects.toHaveProperty('code');
  });

  it('rejects invalid CFB directory references', async () => {
    const bytes = new Uint8Array(await (await fixture('hwp')).arrayBuffer());
    new DataView(bytes.buffer).setUint32(48, 0xfffffff0, true);
    await expect(validateHangulFile(file(bytes, 'broken.hwp'), 'hwp')).rejects.toMatchObject({ code: 'officeCorrupt' });
  });

  it.each([['password', 1 << 1], ['distribution', 1 << 2], ['DRM', 1 << 4], ['certificate', 1 << 8]] as const)
    ('rejects the HWP %s protection flag', async (_name, bit) => {
      const bytes = new Uint8Array(await (await fixture('hwp')).arrayBuffer());
      const header = Buffer.from(bytes).indexOf('HWP Document File');
      expect(header).toBeGreaterThan(0);
      const view = new DataView(bytes.buffer);
      view.setUint32(header + 36, view.getUint32(header + 36, true) | bit, true);
      await expect(validateHangulFile(file(bytes, 'protected.hwp'), 'hwp')).rejects.toMatchObject({ code: 'officeUnsupported' });
    });

  it('rejects a truncated HWPX archive', async () => {
    const bytes = new Uint8Array(await (await fixture('hwpx')).arrayBuffer());
    await expect(validateHangulFile(file(bytes.subarray(0, bytes.length - 25), 'broken.hwpx'), 'hwpx')).rejects.toMatchObject({ code: 'officeCorrupt' });
  });

  it('rejects ZIP declarations exceeding the inflate budget', async () => {
    const parts = unzipSync(new Uint8Array(await (await fixture('hwpx')).arrayBuffer()));
    const bytes = zipSync(parts), view = new DataView(bytes.buffer);
    const central = view.getUint32(bytes.length - 22 + 16, true);
    view.setUint32(central + 24, 101 * 1024 * 1024, true);
    await expect(validateHangulFile(file(bytes, 'bomb.hwpx'), 'hwpx')).rejects.toMatchObject({ code: 'officeTooLarge' });
  });

  it('rejects encrypted HWPX metadata', async () => {
    const parts = unzipSync(new Uint8Array(await (await fixture('hwpx')).arrayBuffer()));
    parts['META-INF/encryption.xml'] = strToU8('<encryption/>');
    await expect(validateHangulFile(file(zipSync(parts), 'protected.hwpx'), 'hwpx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects HWPX without its MIME marker', async () => {
    const parts = unzipSync(new Uint8Array(await (await fixture('hwpx')).arrayBuffer()));
    delete parts.mimetype;
    await expect(validateHangulFile(file(zipSync(parts), 'missing.hwpx'), 'hwpx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it.each(['encryption', 'method', 'size', 'CRC'] as const)('rejects a corrupt HWPX ZIP %s', async defect => {
    const parts = unzipSync(new Uint8Array(await (await fixture('hwpx')).arrayBuffer()));
    const bytes = zipSync(parts), view = new DataView(bytes.buffer);
    const central = view.getUint32(bytes.length - 22 + 16, true);
    const local = view.getUint32(central + 42, true);
    if (defect === 'encryption') view.setUint16(local + 6, view.getUint16(local + 6, true) | 1, true);
    if (defect === 'method') view.setUint16(local + 8, 12, true);
    if (defect === 'size') view.setUint32(local + 22, view.getUint32(local + 22, true) + 1, true);
    if (defect === 'CRC') {
      // Matching metadata still has to agree with the decompressed content.
      const crc = (view.getUint32(central + 16, true) ^ 1) >>> 0;
      view.setUint32(central + 16, crc, true);
      view.setUint32(local + 14, crc, true);
    }
    await expect(validateHangulFile(file(bytes, 'corrupt.hwpx'), 'hwpx')).rejects.toMatchObject({ code: defect === 'encryption' ? 'officeUnsupported' : 'officeCorrupt' });
  });

  it('accepts a genuine streamed HWPX ZIP with data descriptors', async () => {
    const parts = unzipSync(new Uint8Array(await (await fixture('hwpx')).arrayBuffer()));
    const chunks: Uint8Array[] = [];
    const archive = new Zip((error, bytes) => { if (error) throw error; chunks.push(bytes); });
    for (const [name, bytes] of Object.entries(parts)) {
      const entry = new ZipDeflate(name);
      archive.add(entry); entry.push(bytes, true);
    }
    archive.end();
    const streamed = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { streamed.set(chunk, offset); offset += chunk.length; }
    await expect(validateHangulFile(file(streamed, 'streamed.hwpx'), 'hwpx')).resolves.toBeUndefined();
  });

  it('rejects linked external resources', async () => {
    const parts = unzipSync(new Uint8Array(await (await fixture('hwpx')).arrayBuffer()));
    parts['Contents/external.xml'] = strToU8('<resource href="https://example.invalid/document.png"/>');
    await expect(validateHangulFile(file(zipSync(parts), 'external.hwpx'), 'hwpx')).rejects.toMatchObject({ code: 'officeExternal' });
  });
});

describe('actual HWP/HWPX rendering into PDF', () => {
  it.each(['hwp', 'hwpx'] as const)('converts %s text, Korean/Japanese, table and image into a nonempty PDF', async kind => {
    renderedPages.length = 0;
    const input = await fixture(kind);
    const source = new HwpDocument(new Uint8Array(await input.arrayBuffer()));
    try {
      expect(source.pageCount()).toBe(1);
      for (const text of ['PDFEditGo', '한글 변환', '日本語テスト', '항목', 'Alpha']) expect(source.getTextFileText()).toContain(text);
    } finally { source.free(); }
    const progress: number[] = [];
    const result = await hangulToPdfWithRenderer(input, kind, { scale: 1.25, range: '' }, actualRenderer, value => progress.push(value));
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer(), { updateMetadata: false });
    expect(result.pageCount).toBe(1);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.275, 1);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(841.875, 1);
    expect(pdf.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict).keys().length).toBeGreaterThan(0);
    expect(result.blob.size).toBeGreaterThan(5_000);
    expect(result.name).toBe('simple.pdf');
    expect(pdf.getProducer()).toContain('PDFEditGo');
    expect(renderedPages).toEqual([{ index: 0, ink: expect.any(Number), colored: expect.any(Number) }]);
    expect(renderedPages[0]!.ink).toBeGreaterThan(1_000);
    expect(renderedPages[0]!.colored).toBeGreaterThan(1_000);
    expect(progress.at(-1)).toBe(100);
    if (outputDirectory) await writeFile(`${outputDirectory}/${kind}-sample.pdf`, new Uint8Array(await result.blob.arrayBuffer()));
  }, 20_000);

  it('exports only the requested page from a genuine two-page HWPX document', async () => {
    renderedPages.length = 0;
    const input = file(await readFile(fixturePath('two-pages.hwpx')), 'two-pages.hwpx');
    const result = await hangulToPdfWithRenderer(input, 'hwpx', { scale: 1, range: '2' }, actualRenderer);
    expect(result.pageCount).toBe(1);
    expect((await PDFDocument.load(await result.blob.arrayBuffer())).getPageCount()).toBe(1);
    expect(renderedPages.map(page => page.index)).toEqual([1]);
    if (outputDirectory) await writeFile(`${outputDirectory}/hwpx-second-page.pdf`, new Uint8Array(await result.blob.arrayBuffer()));
  }, 20_000);
});

describe('Hangul output limits and cleanup', () => {
  const renderDocument = (pageCount: number, widthPt = 595): OfficeRenderDocument => ({
    pageCount,
    pageSize: () => ({ widthPt, heightPt: 842 }),
    renderPage: vi.fn(async () => new Uint8Array()),
    destroy: vi.fn(),
  });

  it('closes the source when a page range is invalid', async () => {
    const source = renderDocument(1);
    await expect(hangulToPdfWithRenderer(await fixture('hwp'), 'hwp', { scale: 1, range: '2' }, async () => source)).rejects.toHaveProperty('code');
    expect(source.destroy).toHaveBeenCalledOnce();
    expect(source.renderPage).not.toHaveBeenCalled();
  });

  it('rejects more than 50 output pages and releases the source', async () => {
    const source = renderDocument(51);
    await expect(hangulToPdfWithRenderer(await fixture('hwp'), 'hwp', { scale: 1, range: '' }, async () => source)).rejects.toMatchObject({ code: 'officeLimit' });
    expect(source.destroy).toHaveBeenCalledOnce();
  });

  it('rejects a huge render surface before rendering it', async () => {
    const source = renderDocument(1, 50_000);
    await expect(hangulToPdfWithRenderer(await fixture('hwp'), 'hwp', { scale: 2, range: '' }, async () => source)).rejects.toMatchObject({ code: 'officeLimit' });
    expect(source.destroy).toHaveBeenCalledOnce();
    expect(source.renderPage).not.toHaveBeenCalled();
  });

  it('releases the source after a render failure', async () => {
    const source = renderDocument(1);
    source.renderPage = vi.fn(async () => { throw new Error('synthetic rendering failure'); });
    await expect(hangulToPdfWithRenderer(await fixture('hwp'), 'hwp', { scale: 1, range: '' }, async () => source)).rejects.toMatchObject({ code: 'officeRender' });
    expect(source.destroy).toHaveBeenCalledOnce();
  });
});
