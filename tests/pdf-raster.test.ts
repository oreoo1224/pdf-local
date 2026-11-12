import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream,
} from 'pdf-lib';
import { appendRasterPage, type RasterPage } from '../src/lib/pdf-raster';

const NativeCompressionStream = globalThis.CompressionStream;
afterEach(() => vi.unstubAllGlobals());

async function imageStreams(pdf: PDFDocument) {
  const saved = await PDFDocument.load(await pdf.save());
  const page = saved.getPage(0);
  const objects = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
  const image = objects.lookup(objects.keys()[0]!);
  if (!(image instanceof PDFRawStream)) throw new Error('Missing image stream');
  const mask = saved.context.lookup(image.dict.get(PDFName.of('SMask')));
  if (mask !== undefined && !(mask instanceof PDFRawStream)) throw new Error('Invalid image mask');
  return { saved, image, mask };
}

const translucent: RasterPage = {
  width: 2, height: 2,
  data: new Uint8Array([
    7, 11, 13, 0, 19, 23, 29, 128,
    31, 37, 41, 255, 43, 47, 53, 17,
  ]),
};
const translucentRgb = new Uint8Array([7, 11, 13, 19, 23, 29, 31, 37, 41, 43, 47, 53]);

async function expectExactTransparency() {
  const pdf = await PDFDocument.create();
  const bytes = await appendRasterPage(pdf, translucent, 23, 37);
  const { image, mask } = await imageStreams(pdf);
  expect(decodePDFRawStream(image).decode()).toEqual(translucentRgb);
  expect(mask).toBeInstanceOf(PDFRawStream);
  expect(decodePDFRawStream(mask!).decode()).toEqual(new Uint8Array([0, 128, 255, 17]));
  expect(mask!.dict.lookup(PDFName.of('ColorSpace'), PDFName).toString()).toBe('/DeviceGray');
  expect(mask!.dict.lookup(PDFName.of('Decode'), PDFArray).asArray().map(value => value.toString())).toEqual(['0', '1']);
  expect(bytes).toBe(image.getContentsSize() + mask!.getContentsSize());
}

describe('lossless raster PDF pages', () => {
  it('uses native zlib compression and preserves every RGB and alpha byte', async () => {
    const native = vi.fn(function (format: CompressionFormat) { return new NativeCompressionStream(format); });
    vi.stubGlobal('CompressionStream', native);
    const before = translucent.data.slice();
    await expectExactTransparency();
    expect(native).toHaveBeenCalledTimes(2);
    expect(native).toHaveBeenCalledWith('deflate');
    expect(translucent.data).toEqual(before);
  });

  it('omits the soft mask for opaque pixels and keeps physical page dimensions', async () => {
    const pdf = await PDFDocument.create();
    const raster = { width: 2, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255, 254, 253, 252, 255]) };
    const bytes = await appendRasterPage(pdf, raster, 595.25, 841.75);
    const { saved, image, mask } = await imageStreams(pdf);
    expect(mask).toBeUndefined();
    expect(bytes).toBe(image.getContentsSize());
    expect(decodePDFRawStream(image).decode()).toEqual(new Uint8Array([1, 2, 3, 254, 253, 252]));
    expect(image.dict.lookup(PDFName.of('Filter'), PDFName).toString()).toBe('/FlateDecode');
    expect(image.dict.lookup(PDFName.of('ColorSpace'), PDFName).toString()).toBe('/DeviceRGB');
    expect(image.dict.get(PDFName.of('BitsPerComponent'))!.toString()).toBe('8');
    expect(image.dict.get(PDFName.of('Width'))!.toString()).toBe('2');
    expect(image.dict.get(PDFName.of('Height'))!.toString()).toBe('1');
    expect(saved.getPage(0).getSize()).toEqual({ width: 595.25, height: 841.75 });
  });

  it('falls back to fflate when native compression is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    await expectExactTransparency();
  });

  it('falls back to fflate when the native constructor rejects deflate', async () => {
    vi.stubGlobal('CompressionStream', class { constructor() { throw new Error('unsupported format'); } });
    await expectExactTransparency();
  });

  it('falls back to fflate when native compression fails while streaming', async () => {
    vi.stubGlobal('CompressionStream', class {
      constructor() {
        return new TransformStream({ transform() { throw new Error('native stream failed'); } });
      }
    });
    await expectExactTransparency();
  });

  it('finishes native compression for noisy pixels larger than the stream buffer', async () => {
    const width = 128, height = 256;
    const data = new Uint8Array(width * height * 4);
    const expectedRgb = new Uint8Array(width * height * 3);
    let random = 123456789;
    for (let offset = 0; offset < data.length; offset += 4) {
      for (let channel = 0; channel < 3; channel++) {
        random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
        data[offset + channel] = random & 255;
        expectedRgb[offset / 4 * 3 + channel] = random & 255;
      }
      data[offset + 3] = 255;
    }
    const pdf = await PDFDocument.create();
    const bytes = await appendRasterPage(pdf, { width, height, data }, 128, 256);
    expect(bytes).toBeGreaterThan(65_536);
    const { image } = await imageStreams(pdf);
    expect(decodePDFRawStream(image).decode()).toEqual(expectedRgb);
  }, 5_000);

  it('renders the original top-to-bottom pixel orientation through PDF.js', async () => {
    const { createCanvas } = await import('@napi-rs/canvas');
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 0, 255,
      255, 0, 255, 255, 0, 255, 255, 255,
    ]);
    const pdf = await PDFDocument.create();
    await appendRasterPage(pdf, { width: 2, height: 3, data }, 2, 3);
    const task = getDocument({ data: await pdf.save(), verbosity: 0 });
    const canvas = createCanvas(2, 3);
    try {
      const source = await task.promise;
      const page = await source.getPage(1);
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport: page.getViewport({ scale: 1 }) }).promise;
      expect(canvas.getContext('2d').getImageData(0, 0, 2, 3).data).toEqual(data);
    } finally {
      await task.destroy();
      canvas.width = 0; canvas.height = 0;
    }
  });
});

describe('raster limits and invalid render data', () => {
  it.each([
    [0, 1], [-1, 1], [1, 0], [1.5, 1], [NaN, 1], [Infinity, 1],
    [16_385, 1], [1, 16_385], [4_000, 3_001],
  ])('rejects pixel dimensions %s × %s before allocating channels', async (width, height) => {
    const pdf = await PDFDocument.create();
    await expect(appendRasterPage(pdf, { width, height, data: new Uint8Array() }, 100, 100)).rejects.toMatchObject({ code: 'officeLimit' });
    expect(pdf.getPageCount()).toBe(0);
  });

  it.each([
    [0, 100], [0.5, 100], [100, -1], [100, 0.5],
    [14_401, 100], [100, 14_401], [NaN, 100], [100, Infinity],
  ])('rejects physical page dimensions %s × %s', async (widthPt, heightPt) => {
    const pdf = await PDFDocument.create();
    await expect(appendRasterPage(pdf, translucent, widthPt, heightPt)).rejects.toMatchObject({ code: 'officeLimit' });
    expect(pdf.getPageCount()).toBe(0);
  });

  it.each([
    new Uint8Array(3), new Uint8Array(5), new Uint16Array(4), [], undefined,
  ])('rejects invalid or incomplete RGBA data without native compression', async data => {
    const native = vi.fn();
    vi.stubGlobal('CompressionStream', native);
    const pdf = await PDFDocument.create();
    await expect(appendRasterPage(pdf, { width: 1, height: 1, data: data as RasterPage['data'] }, 100, 100)).rejects.toMatchObject({ code: 'officeRender' });
    expect(pdf.getPageCount()).toBe(0);
    expect(native).not.toHaveBeenCalled();
  });
});
