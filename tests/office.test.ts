import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { createCanvas, loadImage, GlobalFonts, type Canvas } from '@napi-rs/canvas';
import { openDocxDocument, openPptxPresentation, type NodeCanvasFactory } from '@silurus/ooxml/node';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import {
  validateOfficeFile, officeToPdfWithRenderer,
  type OfficeDocumentLoader, type OfficeKind, type OfficeRenderDocument,
} from '../src/lib/office';

const fixturePath = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const file = (bytes: Uint8Array | string, name = 'sample.docx') => new File([
  typeof bytes === 'string' ? bytes : new Uint8Array(bytes).buffer,
], name);
const fixture = async (kind: OfficeKind) => file(await readFile(fixturePath(`simple.${kind}`)), `simple.${kind}`);
const sampleParts = async (kind: OfficeKind = 'docx') => unzipSync(new Uint8Array(await (await fixture(kind)).arrayBuffer()));

const fontPath = fileURLToPath(new URL('../public/fonts/NotoSansKR.ttf', import.meta.url));
if (existsSync(fontPath)) {
  for (const family of ['Noto Sans KR', 'Noto Serif KR']) GlobalFonts.registerFromPath(fontPath, family);
}
const factory: NodeCanvasFactory = {
  createCanvas,
  loadImage: bytes => loadImage(Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))),
};

function nonwhitePixels(canvas: Canvas): number {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! > 0 && Math.min(data[i]!, data[i + 1]!, data[i + 2]!) < 235) count++;
  }
  return count;
}

/** Test the production validation/range/PDF pipeline with the same real OOXML
 * parser/render primitives through the package's supported Node canvas seam.
 * This does not establish browser Worker, download or mobile behavior. */
const realRenderer: OfficeDocumentLoader = async (bytes, kind) => {
  if (kind === 'docx') {
    const document = await openDocxDocument(bytes, { factory, cjkFallback: 'kr' });
    return {
      pageCount: document.pageCount,
      pageSize: index => document.pageSize(index),
      renderPage: async (index, width) => {
        const canvas = await document.renderPage(index, { width, dpr: 1 });
        expect(nonwhitePixels(canvas as Canvas)).toBeGreaterThan(1_000);
        const png = (canvas as Canvas).toBuffer('image/png');
        canvas.width = 0; canvas.height = 0;
        return png;
      },
      destroy: () => document.close(),
    };
  }
  const presentation = await openPptxPresentation(bytes, { cjkFallback: 'kr' });
  const widthPt = presentation.slideWidth / 12_700;
  const heightPt = presentation.slideHeight / 12_700;
  // The Node presentation session is one-pass. Capture the tiny sample slides
  // before its iterator closes, so range-order assertions can request them later.
  const images: Uint8Array[] = [];
  try {
    for await (const slide of presentation.slides()) {
      const canvas = createCanvas(1, 1);
      await presentation.renderSlide(canvas, slide, { factory, width: 960, dpr: 1 });
      expect(nonwhitePixels(canvas)).toBeGreaterThan(5_000);
      images.push(canvas.toBuffer('image/png'));
      canvas.width = 0; canvas.height = 0;
    }
  } finally { await presentation.close(); }
  return {
    pageCount: images.length,
    pageSize: () => ({ widthPt, heightPt }),
    renderPage: async index => images[index]!,
    destroy: () => { images.length = 0; },
  };
};

describe('trial Office input validation', () => {
  it.each(['docx', 'pptx'] as const)('accepts a real basic %s document', async kind => {
    await expect(validateOfficeFile(await fixture(kind), kind)).resolves.toBeUndefined();
  });

  it('rejects a PowerPoint package selected for Word conversion', async () => {
    await expect(validateOfficeFile(await fixture('pptx'), 'docx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects a Word package selected for PowerPoint conversion', async () => {
    await expect(validateOfficeFile(await fixture('docx'), 'pptx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects plain text with a misleading Office extension', async () => {
    await expect(validateOfficeFile(file('This is not an Office archive.'), 'docx')).rejects.toHaveProperty('code');
  });

  it('rejects legacy or encrypted OLE containers', async () => {
    const bytes = new Uint8Array(512);
    bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await expect(validateOfficeFile(file(bytes, 'encrypted.docx'), 'docx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects a truncated ZIP package', async () => {
    const bytes = new Uint8Array(await (await fixture('docx')).arrayBuffer());
    await expect(validateOfficeFile(file(bytes.subarray(0, bytes.length - 30)), 'docx')).rejects.toMatchObject({ code: 'officeCorrupt' });
  });

  it('checks the 20 MB file budget before reading content', async () => {
    const oversized = file('not allocated');
    Object.defineProperty(oversized, 'size', { value: 21 * 1024 * 1024 });
    await expect(validateOfficeFile(oversized, 'docx')).rejects.toMatchObject({ code: 'officeTooLarge' });
  });

  it('rejects ZIP entries claiming an unsafe decompressed size', async () => {
    const bytes = new Uint8Array(await (await fixture('docx')).arrayBuffer());
    const view = new DataView(bytes.buffer);
    const eocd = bytes.length - 22;
    const central = view.getUint32(eocd + 16, true);
    view.setUint32(central + 24, 101 * 1024 * 1024, true);
    await expect(validateOfficeFile(file(bytes), 'docx')).rejects.toMatchObject({ code: expect.stringMatching(/^office(?:TooLarge|Limit)$/) });
  });

  it('rejects encrypted ZIP entries before decompression', async () => {
    const bytes = new Uint8Array(await (await fixture('docx')).arrayBuffer());
    const view = new DataView(bytes.buffer);
    const central = view.getUint32(bytes.length - 22 + 16, true);
    const local = view.getUint32(central + 42, true);
    view.setUint16(central + 8, view.getUint16(central + 8, true) | 1, true);
    view.setUint16(local + 6, view.getUint16(local + 6, true) | 1, true);
    await expect(validateOfficeFile(file(bytes), 'docx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects macro-bearing packages in the trial converter', async () => {
    const parts = await sampleParts(); parts['word/vbaProject.bin'] = strToU8('macro placeholder');
    await expect(validateOfficeFile(file(zipSync(parts)), 'docx')).rejects.toMatchObject({ code: 'officeUnsupported' });
  });

  it('rejects external relationships so documents cannot request remote content', async () => {
    const parts = await sampleParts();
    parts['word/_rels/document.xml.rels'] = strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdExternal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" TargetMode="External" Target="https://example.invalid/private-document.png"/></Relationships>');
    await expect(validateOfficeFile(file(zipSync(parts)), 'docx')).rejects.toMatchObject({ code: 'officeExternal' });
  });

  it('also rejects an XML-escaped External relationship mode', async () => {
    const parts = await sampleParts();
    parts['word/_rels/document.xml.rels'] = strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdExternal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" TargetMode="&#69;xternal" Target="https://example.invalid/private-document.png"/></Relationships>');
    await expect(validateOfficeFile(file(zipSync(parts)), 'docx')).rejects.toMatchObject({ code: 'officeExternal' });
  });
});

describe('real basic Office rendering into the PDF pipeline', () => {
  it('converts a Word document with text, table and picture into a nonempty one-page PDF', async () => {
    const progress: number[] = [];
    const result = await officeToPdfWithRenderer(await fixture('docx'), 'docx', { scale: 1, range: '' }, realRenderer, n => progress.push(n));
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(result.name).toMatch(/^simple.*\.pdf$/);
    expect(result.pageCount).toBe(1);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(612);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(792);
    expect(pdf.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict).keys().length).toBeGreaterThan(0);
    expect(result.blob.size).toBeGreaterThan(5_000);
    expect(progress.at(-1)).toBe(100);
    if (process.env.OFFICE_TEST_ARTIFACTS_DIR) await writeFile(join(process.env.OFFICE_TEST_ARTIFACTS_DIR, 'word-sample.pdf'), new Uint8Array(await result.blob.arrayBuffer()));
  }, 20_000);

  it('converts two PowerPoint slides and retains the landscape slide geometry', async () => {
    const result = await officeToPdfWithRenderer(await fixture('pptx'), 'pptx', { scale: 1, range: '' }, realRenderer);
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(result.pageCount).toBe(2);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPages().map(page => [page.getWidth(), page.getHeight()])).toEqual([[720, 405], [720, 405]]);
    expect(result.blob.size).toBeGreaterThan(5_000);
    if (process.env.OFFICE_TEST_ARTIFACTS_DIR) await writeFile(join(process.env.OFFICE_TEST_ARTIFACTS_DIR, 'ppt-sample.pdf'), new Uint8Array(await result.blob.arrayBuffer()));
  }, 20_000);

  it('exports a requested slide range instead of always including every slide', async () => {
    const result = await officeToPdfWithRenderer(await fixture('pptx'), 'pptx', { scale: 1, range: '2' }, realRenderer);
    expect((await PDFDocument.load(await result.blob.arrayBuffer())).getPageCount()).toBe(1);
  }, 20_000);
});

describe('Office PDF output bounds and cleanup', () => {
  const renderer = (pageCount: number, widthPt = 612): OfficeRenderDocument => ({
    pageCount,
    pageSize: () => ({ widthPt, heightPt: 792 }),
    renderPage: vi.fn(async () => new Uint8Array()),
    destroy: vi.fn(),
  });

  it('closes the document when a requested page does not exist', async () => {
    const document = renderer(2);
    await expect(officeToPdfWithRenderer(await fixture('docx'), 'docx', { scale: 1, range: '3' }, async () => document)).rejects.toHaveProperty('code');
    expect(document.destroy).toHaveBeenCalledOnce();
    expect(document.renderPage).not.toHaveBeenCalled();
  });

  it('rejects an unsafe render surface before allocating it and closes the document', async () => {
    const document = renderer(1, 50_000);
    await expect(officeToPdfWithRenderer(await fixture('docx'), 'docx', { scale: 2, range: '' }, async () => document)).rejects.toMatchObject({ code: 'officeLimit' });
    expect(document.renderPage).not.toHaveBeenCalled();
    expect(document.destroy).toHaveBeenCalledOnce();
  });

  it('rejects an oversized output selection and closes the source', async () => {
    const document = renderer(51);
    await expect(officeToPdfWithRenderer(await fixture('docx'), 'docx', { scale: 1, range: '' }, async () => document)).rejects.toMatchObject({ code: 'officeLimit' });
    expect(document.destroy).toHaveBeenCalledOnce();
  });
});
