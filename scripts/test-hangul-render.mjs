// Synthetic documents created with rhwp's own document API; no user documents.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import init, { HwpDocument } from '@rhwp/core';
import { createCanvas, GlobalFonts, Canvas, Image, ImageData, Path2D } from '@napi-rs/canvas';

const font = new URL('../public/fonts/NotoSansKR.ttf', import.meta.url);
for (const family of ['Noto Sans KR', 'Noto Serif KR']) GlobalFonts.registerFromPath(font.pathname, family);
const measure = createCanvas(1, 1).getContext('2d');
globalThis.measureTextWidth = (font, text) => { measure.font = font; return measure.measureText(text).width; };
Object.assign(globalThis, {
  HTMLCanvasElement: Canvas,
  CanvasRenderingContext2D: measure.constructor,
  Image, ImageData, Path2D,
  window: globalThis,
  Window: class { static [Symbol.hasInstance](value) { return value === globalThis; } },
  document: { createElement: name => name === 'canvas' ? createCanvas(1, 1) : undefined },
});
await init({ module_or_path: await readFile(new URL('../node_modules/@rhwp/core/rhwp_bg.wasm', import.meta.url)) });

const document = HwpDocument.createEmpty();
const check = result => assert.equal(JSON.parse(result).ok, true);
const outputDirectory = process.env.HANGUL_TEST_ARTIFACTS_DIR || '/tmp/pdfeditgo-hangul-review';
try {
  document.createBlankDocument();
  // Append after the original paragraph, which owns the section properties.
  // Inserting before it duplicates those properties in HWPX and starts a page.
  check(document.insertParagraph(0, 1));
  check(document.insertParagraph(0, 2));
  check(document.insertText(0, 0, 0, 'PDFEditGo 한글 변환 샘플 · 日本語テスト · English'));
  check(document.insertText(0, 1, 0, '직접 만든 테스트 문서입니다. 기본 글자와 표, 그림을 확인합니다.'));
  const table = JSON.parse(document.createTable(0, 2, 0, 2, 2));
  assert.equal(table.ok, true);
  for (const [cellIdx, text] of ['항목', '값', 'Alpha', '10'].entries()) {
    check(document.insertTextInCell(0, table.paraIdx, table.controlIdx, cellIdx, 0, 0, text));
  }
  const picture = createCanvas(160, 90);
  const context = picture.getContext('2d');
  context.fillStyle = '#eaf1ff'; context.fillRect(0, 0, 160, 90);
  context.fillStyle = '#2563eb'; context.fillRect(8, 8, 60, 72);
  context.fillStyle = '#ed8024'; context.beginPath(); context.arc(116, 45, 30, 0, Math.PI * 2); context.fill();
  check(document.insertPicture(0, 2, 0, '', picture.toBuffer('image/png'), 12000, 6750, 160, 90, 'png', 'Synthetic blue square and orange circle', 10000, 25000));
  picture.width = 0; picture.height = 0;
  await mkdir(new URL('../tests/fixtures/', import.meta.url), { recursive: true });
  for (const kind of ['hwp', 'hwpx']) {
    const bytes = kind === 'hwp' ? document.exportHwp() : document.exportHwpx();
    const roundtrip = new HwpDocument(bytes);
    try { assert.equal(roundtrip.pageCount(), 1, `${kind} fixture must retain one page`); }
    finally { roundtrip.free(); }
    await writeFile(new URL(`../tests/fixtures/simple.${kind}`, import.meta.url), bytes);
  }
  const multiple = HwpDocument.createEmpty();
  try {
    multiple.createBlankDocument();
    const first = '첫 번째 페이지 · First page';
    check(multiple.insertText(0, 0, 0, first));
    check(multiple.insertPageBreak(0, 0, first.length));
    check(multiple.insertText(0, 1, 0, '두 번째 페이지 · Second page'));
    const bytes = multiple.exportHwpx();
    const roundtrip = new HwpDocument(bytes);
    try { assert.equal(roundtrip.pageCount(), 2); }
    finally { roundtrip.free(); }
    await writeFile(new URL('../tests/fixtures/two-pages.hwpx', import.meta.url), bytes);
  } finally { multiple.free(); }
  await mkdir(outputDirectory, { recursive: true });
  const canvas = createCanvas(1, 1);
  try {
    document.renderPageToCanvas(0, canvas, 1.25);
    await writeFile(`${outputDirectory}/hangul-sample.png`, canvas.toBuffer('image/png'));
    console.log(`Generated HWP/HWPX fixtures and ${canvas.width} × ${canvas.height} Canvas preview.`);
  } finally { canvas.width = 0; canvas.height = 0; }
} finally { document.free(); }
