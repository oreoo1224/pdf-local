import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { loadEnv } from 'vite';

const locales = ['en', 'ko', 'es', 'ja'];
const routes = ['', 'merge-pdf', 'organize-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'word-to-pdf', 'ppt-to-pdf', 'about', 'privacy', 'terms', 'contact'];
const pageCount = locales.length * routes.length;
const titles = new Set();
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ['SITE_URL', 'CF_PAGES_URL', 'SITE_BASE']);
const origin = env.SITE_URL || env.CF_PAGES_URL;
const base = `/${(env.SITE_BASE || '/').replace(/^\/+|\/+$/g,'')}/`.replace('//','/');
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
      assert.ok(href.startsWith(base), `${path}: internal link uses configured base ${href}`);
      const relative = `/${href.slice(base.length)}`;
      const target = relative.endsWith('/') ? join('dist', relative, 'index.html') : join('dist', relative);
      await access(target);
    }
    if (origin) {
      assert.match(html, /rel="canonical"/, `${path}: canonical`);
      for (const alternate of [...locales, 'x-default']) assert.ok(html.includes(`hreflang="${alternate}"`), `${path}: alternate ${alternate}`);
      assert.ok(html.includes(new URL('/', origin).origin), `${path}: real configured origin`);
      assert.ok(html.includes(`href="${new URL(base,origin).href}`), `${path}: metadata preserves base`);
    }
  }
}
const assets = await readdir('dist/_astro');
assert.ok(assets.some(name => name.startsWith('pdf.worker') && name.endsWith('.mjs')), 'Bundled PDF.js worker');
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  assert.ok((await readdir(`dist/pdfjs/${directory}`)).length > 0, `PDF.js ${directory}`);
}
for (const file of [
  'robots.txt', 'sitemap.xml', '_headers',
  'licenses/pdf-lib.txt', 'licenses/pdfjs-dist.txt', 'licenses/fflate.txt',
  'office/docx_parser_bg.wasm', 'office/pptx_parser_bg.wasm',
  'licenses/silurus-ooxml.txt', 'licenses/silurus-ooxml-third-party.txt',
  'fonts/NotoSansKR.ttf', 'fonts/OFL.txt',
]) await access(`dist/${file}`);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, origin ? pageCount : 0, 'Sitemap origin handling');
if(origin){
  for(const [,url] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) assert.ok(url.startsWith(new URL(base,origin).href),'Sitemap preserves base');
  const robots=await readFile('dist/robots.txt','utf8');
  assert.ok(robots.includes(new URL(`${base}sitemap.xml`,origin).href),'Robots sitemap base');
}
console.log(`Verified ${pageCount} static pages, unique metadata, internal links, local PDF/Office assets, font notices and sitemap.`);
