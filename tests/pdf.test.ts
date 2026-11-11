import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDocument, PDFHexString, PDFRawStream, decodePDFRawStream, degrees } from 'pdf-lib';
import { imagesToPdf, inspectPdf, mergePdfs, organizePdf, parsePageRange, splitToZip, validateImageFile } from '../src/lib/pdf';
import { unzipSync } from 'fflate';

async function fixture(widths: number[], rotations: number[] = []): Promise<File> {
  const pdf = await PDFDocument.create();
  widths.forEach((width, index) => {
    const page = pdf.addPage([width, 300 + index]);
    page.setRotation(degrees(rotations[index] ?? 0));
  });
  return new File([new Uint8Array(await pdf.save()).buffer], 'document.pdf', { type: 'application/pdf' });
}

async function read(blob: Blob): Promise<PDFDocument> {
  return PDFDocument.load(await blob.arrayBuffer());
}

describe('page selection', () => {
  it('converts inclusive ranges to zero-based pages and preserves entered order', () => {
    expect(parsePageRange('5, 1-3, 2, 8-10', 10)).toEqual([4, 0, 1, 2, 7, 8, 9]);
  });

  it('selects every page for an empty range', () => {
    expect(parsePageRange('  ', 3)).toEqual([0, 1, 2]);
  });

  it.each(['0', '4', '3-1', '1-4', '1,,2', '1,', 'one', '-1', '1.5', '1-2-3', '99999999999999999'])('rejects invalid range %s', (range) => {
    expect(() => parsePageRange(range, 3)).toThrow('invalidRange');
  });

  it('rejects invalid page counts', () => {
    expect(() => parsePageRange('', 0)).toThrow('invalidRange');
    expect(() => parsePageRange('1', 1.5)).toThrow('invalidRange');
  });
});

describe('PDF inspection and merging', () => {
  it('reports the actual page count', async () => {
    expect(await inspectPdf(await fixture([100, 200, 300]))).toEqual({ pageCount: 3 });
  });

  it('merges files in the supplied order and retains individual page dimensions and rotation', async () => {
    const progress: number[] = [];
    const merged = await read(await mergePdfs([
      await fixture([201, 202], [90, 0]),
      await fixture([401]),
    ], (value) => progress.push(value)));
    expect(merged.getPageCount()).toBe(3);
    expect(merged.getPages().map((page) => page.getWidth())).toEqual([201, 202, 401]);
    expect(merged.getPage(0).getRotation().angle).toBe(90);
    expect(progress.at(-1)).toBe(100);
  });

  it('rejects files masquerading as PDFs and malformed PDF headers', async () => {
    await expect(inspectPdf(new File(['<svg onload="alert(1)"></svg>'], 'fake.pdf'))).rejects.toMatchObject({ code: 'invalidPdf' });
    await expect(inspectPdf(new File(['%PDF-1.7\nthis is not a PDF'], 'broken.pdf'))).rejects.toMatchObject({ code: 'invalidPdf' });
  });

  it('rejects encrypted PDFs rather than bypassing encryption', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.context.trailerInfo.Encrypt = pdf.context.register(pdf.context.obj({
      Filter: 'Standard', V: 1, R: 2, Length: 40, P: -4,
      O: PDFHexString.of('0'.repeat(64)), U: PDFHexString.of('0'.repeat(64)),
    }));
    const file = new File([new Uint8Array(await pdf.save({ useObjectStreams: false })).buffer], 'encrypted.pdf');
    await expect(inspectPdf(file)).rejects.toMatchObject({ code: 'encrypted' });
  });

  it('enforces input memory limits before parsing', async () => {
    const file = new File(['not allocated'], 'huge.pdf');
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
    await expect(inspectPdf(file)).rejects.toMatchObject({ code: 'memoryLimit' });
  });

  it('rejects an empty merge', async () => {
    await expect(mergePdfs([])).rejects.toMatchObject({ code: 'emptyPages' });
  });
});

describe('PDF page organization', () => {
  it('extracts, deletes and reorders pages without disturbing retained pages', async () => {
    const original = await fixture([101, 202, 303, 404]);
    const output = await read(await organizePdf(original, [{ index: 3, rotation: 0 }, { index: 1, rotation: 0 }]));
    expect(output.getPages().map((page) => page.getWidth())).toEqual([404, 202]);
    expect((await read(original)).getPageCount()).toBe(4);
  });

  it('adds rotations to the original rotation, normalizing to a quarter turn', async () => {
    const original = await fixture([101, 202, 303], [90, 270, 0]);
    const output = await read(await organizePdf(original, [
      { index: 0, rotation: 270 }, { index: 1, rotation: 180 }, { index: 2, rotation: -90 },
    ]));
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([0, 90, 270]);
  });

  it('prevents saving a PDF with every page deleted', async () => {
    await expect(organizePdf(await fixture([100]), [])).rejects.toMatchObject({ code: 'emptyPages' });
  });

  it.each([
    { pages: [{ index: -1, rotation: 0 }] }, { pages: [{ index: 1, rotation: 0 }] }, { pages: [{ index: 0.5, rotation: 0 }] },
    { pages: [{ index: 0, rotation: 45 }] }, { pages: [{ index: 0, rotation: Infinity }] },
  ])('rejects invalid page edits $pages', async ({ pages }) => {
    await expect(organizePdf(await fixture([100]), pages)).rejects.toMatchObject({ code: 'invalidRange' });
  });
});

describe('images to PDF', () => {
  // A real 1 × 1 transparent PNG; pixel bytes, rather than filename/MIME, determine the input type.
  const png = () => new File([Uint8Array.from(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfS8AAAAASUVORK5CYII=',
    'base64',
  )).buffer], 'pixel.png', { type: 'image/png' });

  it('validates image content before preview decoding', async () => {
    await expect(validateImageFile(png())).resolves.toBeUndefined();
    await expect(validateImageFile(new File(['not a PNG'], 'image.png', { type: 'image/png' })))
      .rejects.toMatchObject({ code: 'invalidImage' });
    const oversized = png();
    Object.defineProperty(oversized, 'size', { value: 101 * 1024 * 1024 });
    await expect(validateImageFile(oversized)).rejects.toMatchObject({ code: 'memoryLimit' });
  });

  it('blocks oversized image dimensions before allocating decoded pixels', async () => {
    const bytes = new Uint8Array(await png().arrayBuffer());
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 10_000);
    view.setUint32(20, 10_000);
    await expect(validateImageFile(new File([bytes.buffer], 'huge.png'))).rejects.toMatchObject({ code: 'memoryLimit' });
  });

  it('creates one A4 page for each image', async () => {
    const pdf = await read(await imagesToPdf([png(), png()], { paper: 'a4', orientation: 'portrait', margin: 20, fit: 'contain' }));
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(841.89);
  });

  it('supports Letter landscape and cover mode', async () => {
    const pdf = await read(await imagesToPdf([png()], { paper: 'letter', orientation: 'landscape', margin: 10, fit: 'cover' }));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
  });

  it('supports original image size at 96 DPI', async () => {
    const pdf = await read(await imagesToPdf([png()], { paper: 'original', orientation: 'auto', margin: 0, fit: 'contain' }));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 0.75, height: 0.75 });
  });

  it('rejects unsupported image bytes despite a PNG extension', async () => {
    await expect(imagesToPdf([new File(['not an image'], 'fake.png')], { paper: 'a4', orientation: 'auto', margin: 0, fit: 'contain' }))
      .rejects.toMatchObject({ code: 'invalidImage' });
  });

  it('rejects negative margins and no selected images', async () => {
    await expect(imagesToPdf([png()], { paper: 'a4', orientation: 'auto', margin: -1, fit: 'contain' })).rejects.toMatchObject({ code: 'invalidRange' });
    await expect(imagesToPdf([], { paper: 'a4', orientation: 'auto', margin: 0, fit: 'contain' })).rejects.toMatchObject({ code: 'emptyPages' });
  });
});

describe('individual PDF ZIP export', () => {
  it('exports single-page PDFs in selected order with rotations retained', async () => {
    const source = await fixture([101, 202, 303], [0, 90, 270]);
    const progress: number[] = [];
    const result = await splitToZip(source, [{ index: 2, rotation: 90 }, { index: 1, rotation: 180 }], (value) => progress.push(value));
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    const names = Object.keys(files);
    expect(result.name).toBe('document-split.zip');
    expect(names).toEqual(['document-001-page-3.pdf', 'document-002-page-2.pdf']);
    const first = await PDFDocument.load(files[names[0]!]!);
    const second = await PDFDocument.load(files[names[1]!]!);
    expect(first.getPageCount()).toBe(1);
    expect(first.getPage(0).getWidth()).toBe(303);
    expect(first.getPage(0).getRotation().angle).toBe(0);
    expect(second.getPage(0).getWidth()).toBe(202);
    expect(second.getPage(0).getRotation().angle).toBe(270);
    expect(progress.at(-1)).toBe(100);
  });

  it('prevents empty, out-of-range, and excessively large exports', async () => {
    const source = await fixture([100]);
    await expect(splitToZip(source, [])).rejects.toMatchObject({ code: 'emptyPages' });
    await expect(splitToZip(source, [{ index: 1, rotation: 0 }])).rejects.toMatchObject({ code: 'invalidRange' });
    await expect(splitToZip(source, Array.from({ length: 201 }, () => ({ index: 0, rotation: 0 }))))
      .rejects.toMatchObject({ code: 'memoryLimit' });
  });
});

describe('smartphone JPEG EXIF orientation', () => {
  // Real 4 × 2 JPEG, generated once for the fixture. No runtime image encoder is needed.
  const original = Uint8Array.from(Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7J+E+habrnwI+EVzqOn2uoXJ8F6QDNdQLI+PsqHqwJ6kn8TRRRX8Qcef8lPj/APr4z8rz7/kaYj/Ez//Z',
    'base64',
  ));

  function photo(orientation: number, little = true, malformed = false): File {
    const exif = new Uint8Array(36);
    const view = new DataView(exif.buffer);
    exif.set([0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0]);
    const tiff = 10;
    exif.set(little ? [0x49, 0x49] : [0x4d, 0x4d], tiff);
    view.setUint16(tiff + 2, 42, little);
    view.setUint32(tiff + 4, malformed ? 0xffff_ffff : 8, little);
    view.setUint16(tiff + 8, 1, little);
    view.setUint16(tiff + 10, 0x0112, little);
    view.setUint16(tiff + 12, 3, little);
    view.setUint32(tiff + 14, 1, little);
    view.setUint16(tiff + 18, orientation, little);
    const data = new Uint8Array(original.length + exif.length);
    data.set(original.subarray(0, 2));
    data.set(exif, 2);
    data.set(original.subarray(2), 2 + exif.length);
    return new File([data.buffer], 'phone.jpg', { type: 'image/jpeg' });
  }

  function pageOperators(pdf: PDFDocument): string {
    const contents = pdf.getPage(0).node.Contents();
    const stream = contents instanceof PDFArray ? pdf.context.lookup(contents.get(0)) : contents;
    if (!(stream instanceof PDFRawStream)) throw new Error('Missing page content');
    return new TextDecoder().decode(decodePDFRawStream(stream).decode());
  }

  it.each([
    { exif: 1, matrix: '1 0 0 1 0 0 cm', swapped: false },
    { exif: 2, matrix: '-1 0 0 1 4 0 cm', swapped: false },
    { exif: 3, matrix: '-1 0 0 -1 4 2 cm', swapped: false },
    { exif: 4, matrix: '1 0 0 -1 0 2 cm', swapped: false },
    { exif: 5, matrix: '0 -1 -1 0 2 4 cm', swapped: true },
    { exif: 6, matrix: '0 -1 1 0 0 4 cm', swapped: true },
    { exif: 7, matrix: '0 1 1 0 0 0 cm', swapped: true },
    { exif: 8, matrix: '0 1 -1 0 2 0 cm', swapped: true },
  ])('applies EXIF $exif without re-encoding and uses displayed dimensions', async ({ exif, matrix, swapped }) => {
    const pdf = await read(await imagesToPdf([photo(exif)], { paper: 'original', orientation: 'auto', margin: 0, fit: 'contain' }));
    expect(pdf.getPage(0).getSize()).toEqual(swapped ? { width: 1.5, height: 3 } : { width: 3, height: 1.5 });
    expect(pageOperators(pdf)).toContain(matrix);
    expect(pageOperators(pdf)).toContain('0.75 0 0 0.75 0 0 cm');
  });

  it('supports big-endian metadata and portrait automatic paper selection', async () => {
    const pdf = await read(await imagesToPdf([photo(6, false)], { paper: 'a4', orientation: 'auto', margin: 20, fit: 'contain' }));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(pageOperators(pdf)).toContain('0 -1 1 0 0 4 cm');
  });

  it('keeps cover clipping and an explicit landscape paper choice', async () => {
    const pdf = await read(await imagesToPdf([photo(8)], { paper: 'letter', orientation: 'landscape', margin: 20, fit: 'cover' }));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
    const operators = pageOperators(pdf);
    expect(operators).toContain('20 20 752 572 re\nW\nn');
    expect(operators).toContain('0 1 -1 0 2 0 cm');
  });

  it('ignores malformed optional EXIF offsets without reading out of bounds', async () => {
    const pdf = await read(await imagesToPdf([photo(6, true, true)], { paper: 'original', orientation: 'auto', margin: 0, fit: 'contain' }));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 3, height: 1.5 });
  });
});
