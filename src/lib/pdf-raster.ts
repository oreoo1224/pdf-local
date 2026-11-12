import {
  concatTransformationMatrix, drawObject, PDFDocument,
  popGraphicsState, pushGraphicsState,
} from 'pdf-lib';
import { zlibSync } from 'fflate';
import { OfficeToolError } from './office-errors';

export interface RasterPage {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

const MAX_PIXELS = 12_000_000;
const MAX_DIMENSION = 16_384;
const MAX_POINTS = 14_400;

async function compress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
        start(controller) { controller.enqueue(bytes); controller.close(); },
      });
      // Pipe both ends together so incompressible pages cannot stall on the
      // compressor's output backpressure. PDF FlateDecode needs a zlib wrapper.
      const compressed = source.pipeThrough(new CompressionStream('deflate'));
      return new Uint8Array(await new Response(compressed).arrayBuffer());
    } catch {
      // Some older browsers expose the constructor but reject the format or
      // fail while streaming. The existing dependency also encodes losslessly.
    }
  }
  return zlibSync(bytes, { level: 6 });
}

/** Append lossless Canvas RGBA pixels without a PNG encode/decode round trip.
 * Only compressed image streams remain in the PDF after this page completes. */
export async function appendRasterPage(
  pdf: PDFDocument,
  raster: RasterPage,
  widthPt: number,
  heightPt: number,
): Promise<number> {
  if (!raster || typeof raster !== 'object') throw new OfficeToolError('officeRender');
  const { width, height, data } = raster;
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= MAX_DIMENSION)
    || width * height > MAX_PIXELS
    || ![widthPt, heightPt].every(value => Number.isFinite(value) && value >= 1 && value <= MAX_POINTS)) {
    throw new OfficeToolError('officeLimit');
  }
  const pixelCount = width * height;
  if (!(data instanceof Uint8Array || data instanceof Uint8ClampedArray) || data.length !== pixelCount * 4) {
    throw new OfficeToolError('officeRender');
  }

  const rgb = new Uint8Array(pixelCount * 3);
  let alpha: Uint8Array<ArrayBuffer> | undefined;
  for (let pixel = 0, rgbaOffset = 0, rgbOffset = 0; pixel < pixelCount; pixel++, rgbaOffset += 4) {
    rgb[rgbOffset++] = data[rgbaOffset]!;
    rgb[rgbOffset++] = data[rgbaOffset + 1]!;
    rgb[rgbOffset++] = data[rgbaOffset + 2]!;
    const opacity = data[rgbaOffset + 3]!;
    if (opacity !== 255) {
      alpha ??= new Uint8Array(pixelCount).fill(255);
      alpha[pixel] = opacity;
    }
  }

  const compressedRgb = await compress(rgb);
  const compressedAlpha = alpha ? await compress(alpha) : undefined;
  const maskRef = compressedAlpha ? pdf.context.register(pdf.context.stream(compressedAlpha, {
    Type: 'XObject', Subtype: 'Image',
    Width: width, Height: height, BitsPerComponent: 8,
    ColorSpace: 'DeviceGray', Filter: 'FlateDecode', Decode: [0, 1],
  })) : undefined;
  const imageRef = pdf.context.register(pdf.context.stream(compressedRgb, {
    Type: 'XObject', Subtype: 'Image',
    Width: width, Height: height, BitsPerComponent: 8,
    ColorSpace: 'DeviceRGB', Filter: 'FlateDecode', SMask: maskRef,
  }));
  const page = pdf.addPage([widthPt, heightPt]);
  const imageName = page.node.newXObject('Image', imageRef);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(widthPt, 0, 0, heightPt, 0, 0),
    drawObject(imageName),
    popGraphicsState(),
  );
  return compressedRgb.byteLength + (compressedAlpha?.byteLength ?? 0);
}
