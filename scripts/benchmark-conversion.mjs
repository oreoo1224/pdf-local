// Reproducible warm Node benchmark of the production Hangul conversion engine.
// Uses only the repository's synthetic fixtures; no user documents or network.
// Run: node scripts/benchmark-conversion.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import init, { HwpDocument } from '@rhwp/core';
import { createCanvas, GlobalFonts, Canvas, Image, ImageData, Path2D } from '@napi-rs/canvas';

const root = fileURLToPath(new URL('../', import.meta.url));
const scale = 1.5;
const runs = Number(process.env.CONVERSION_BENCH_RUNS ?? 5);
assert.ok(Number.isInteger(runs) && runs >= 3 && runs <= 15, 'CONVERSION_BENCH_RUNS must be an integer from 3 through 15');
const font = fileURLToPath(new URL('../public/fonts/NotoSansKR.ttf', import.meta.url));
for (const family of ['Noto Sans KR', 'Noto Serif KR']) GlobalFonts.registerFromPath(font, family);
const measurement = createCanvas(1, 1).getContext('2d');
Object.assign(globalThis, {
  measureTextWidth: (font, text) => { measurement.font = font; return measurement.measureText(text).width; },
  HTMLCanvasElement: Canvas,
  CanvasRenderingContext2D: measurement.constructor,
  Image, ImageData, Path2D,
  window: globalThis,
  Window: class { static [Symbol.hasInstance](value) { return value === globalThis; } },
  document: { createElement: name => name === 'canvas' ? createCanvas(1, 1) : undefined },
});
await init({ module_or_path: await readFile(new URL('../node_modules/@rhwp/core/rhwp_bg.wasm', import.meta.url)) });

// Vite loads the actual TypeScript engine without building the application or
// opening a listening HTTP/WebSocket server. Font/WASM startup is warmed first.
const vite = await createServer({
  root, configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
});

function renderer(usePixels, stages) {
  return async bytes => {
    const source = new HwpDocument(new Uint8Array(bytes));
    source.setFallbackFont('Noto Sans KR');
    const dimensions = index => {
      const { width, height } = JSON.parse(source.getPageInfo(index));
      return { width, height, widthPt: width * 72 / 96, heightPt: height * 72 / 96 };
    };
    const render = (index, requestedWidth) => {
      const canvas = createCanvas(1, 1);
      const start = performance.now();
      source.renderPageToCanvas(index, canvas, requestedWidth / dimensions(index).width);
      stages.renderMs += performance.now() - start;
      stages.surfaces.push([canvas.width, canvas.height]);
      return canvas;
    };
    const adapter = {
      pageCount: source.pageCount(),
      pageSize: dimensions,
      async renderPage(index, requestedWidth) {
        const canvas = render(index, requestedWidth);
        try {
          const start = performance.now();
          const png = canvas.toBuffer('image/png');
          stages.captureMs += performance.now() - start;
          return png;
        } finally { canvas.width = 0; canvas.height = 0; }
      },
      destroy() { source.free(); },
    };
    if (usePixels) adapter.renderPagePixels = async (index, requestedWidth) => {
      const canvas = render(index, requestedWidth);
      try {
        const start = performance.now();
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        stages.captureMs += performance.now() - start;
        return { width: canvas.width, height: canvas.height, data };
      } finally { canvas.width = 0; canvas.height = 0; }
    };
    return adapter;
  };
}

const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const rounded = value => Math.round(value * 100) / 100;

try {
  const { hangulToPdfWithRenderer } = await vite.ssrLoadModule('/src/lib/hangul.ts');
  console.log(JSON.stringify({
    environment: { node: process.version, platform: process.platform, arch: process.arch, compressionStreamAvailable: typeof CompressionStream !== 'undefined' },
    method: 'Full production validation/parse/render/PDF pipeline, one warmup per path, alternating measured runs; local fonts and WASM already loaded.',
    limitation: 'Synthetic fixtures and NodeCanvas timings establish a local regression baseline; they do not measure Safari/iPhone performance or cold font/WASM downloads.',
    scale, runs,
  }, null, 2));
  for (const [name, kind] of [['simple.hwp', 'hwp'], ['two-pages.hwpx', 'hwpx']]) {
    const input = new File([new Uint8Array(await readFile(new URL(`../tests/fixtures/${name}`, import.meta.url))).buffer], name);
    const samples = { png: [], rgba: [] };
    const measure = async usePixels => {
      const stages = { renderMs: 0, captureMs: 0, surfaces: [] };
      const start = performance.now();
      const result = await hangulToPdfWithRenderer(input, kind, { scale, range: '' }, renderer(usePixels, stages));
      return { totalMs: performance.now() - start, ...stages, pdfBytes: result.blob.size, pageCount: result.pageCount };
    };
    await measure(false);
    await measure(true);
    for (let index = 0; index < runs; index++) {
      for (const usePixels of index % 2 ? [true, false] : [false, true]) samples[usePixels ? 'rgba' : 'png'].push(await measure(usePixels));
    }
    assert.deepEqual(samples.rgba[0].surfaces, samples.png[0].surfaces, 'The compared paths must render identical pixel dimensions');
    const summary = {};
    for (const path of ['png', 'rgba']) {
      summary[path] = Object.fromEntries(['totalMs', 'renderMs', 'captureMs', 'pdfBytes'].map(key => [key, rounded(median(samples[path].map(sample => sample[key])))]));
    }
    console.log(JSON.stringify({
      fixture: name, pageCount: samples.rgba[0].pageCount, surfaces: samples.rgba[0].surfaces,
      warmMedian: summary,
      speedup: rounded(summary.png.totalMs / summary.rgba.totalMs),
      totalTimeReductionPercent: rounded((1 - summary.rgba.totalMs / summary.png.totalMs) * 100),
    }, null, 2));
  }
} finally { await vite.close(); }
