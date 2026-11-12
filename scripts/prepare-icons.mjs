// Export web-sized copies of the approved artwork without redrawing or cropping it.
import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const original = await loadImage(await readFile(new URL('../docs/brand-original.jpg', import.meta.url)));
if (original.width !== original.height) throw new Error('Brand artwork must be square.');
const images = new Map();
for (const size of [16, 32, 48, 96, 180, 512]) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(original, 0, 0, size, size);
  images.set(size, canvas.toBuffer('image/png'));
}
for (const [size, name] of [[32, 'favicon-32.png'], [96, 'favicon-96.png'], [180, 'apple-touch-icon.png'], [512, 'logo.png']]) {
  await writeFile(new URL(`../public/${name}`, import.meta.url), images.get(size));
}

// ICO can carry PNG frames; these sizes cover common browser and desktop uses.
const sizes = [16, 32, 48];
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
const frames = [];
for (const [index, size] of sizes.entries()) {
  const frame = images.get(size);
  const entry = 6 + index * 16;
  directory[entry] = size;
  directory[entry + 1] = size;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  frames.push(frame);
  offset += frame.length;
}
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([directory, ...frames]));
console.log('Exported approved artwork as PNG icons and a three-size favicon.');
