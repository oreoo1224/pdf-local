import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { loadEnv } from 'vite';

const locales = ['en', 'ko', 'es', 'ja'];
const routes = ['', 'merge-pdf', 'organize-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'about', 'privacy', 'terms', 'contact'];
const titles = new Set();
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ['SITE_URL', 'CF_PAGES_URL']);
const origin = env.SITE_URL || env.CF_PAGES_URL;
for (const locale of locales) {
  for (const route of routes) {
    const prefix = locale === 'en' ? '' : locale;
    const path = join('dist', prefix, route, 'index.html');
    const html = await readFile(path, 'utf8');
    assert.ok(html.includes(`<html lang="${locale}">`), `${path}: document language`);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${path}: one H1`);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    assert.ok(title, `${path}: title`);
    assert.ok(!titles.has(title), `${path}: distinct title`);
    titles.add(title);
    assert.match(html, /<meta name="description" content="[^\"]+"/, `${path}: description`);
    assert.ok(!html.includes('undefined'), `${path}: no leaked missing values`);
    for (const [, href] of html.matchAll(/href="(\/[^\"#?]*)(?:#[^\"]*)?"/g)) {
      const target = href.endsWith('/') ? join('dist', href, 'index.html') : join('dist', href);
      await access(target);
    }
    if (origin) {
      assert.match(html, /rel="canonical"/, `${path}: canonical`);
      for (const alternate of [...locales, 'x-default']) assert.ok(html.includes(`hreflang="${alternate}"`), `${path}: alternate ${alternate}`);
      assert.ok(html.includes(new URL('/', origin).origin), `${path}: real configured origin`);
    }
  }
}
const assets = await readdir('dist/_astro');
assert.ok(assets.some(name => name.startsWith('pdf.worker') && name.endsWith('.mjs')), 'Bundled PDF.js worker');
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  assert.ok((await readdir(`dist/pdfjs/${directory}`)).length > 0, `PDF.js ${directory}`);
}
for (const file of ['robots.txt', 'sitemap.xml', '_headers', 'licenses/pdf-lib.txt', 'licenses/pdfjs-dist.txt', 'licenses/fflate.txt']) await access(`dist/${file}`);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, origin ? 36 : 0, 'Sitemap origin handling');
console.log('Verified 36 static pages, unique metadata, internal links, local PDF assets and sitemap.');
