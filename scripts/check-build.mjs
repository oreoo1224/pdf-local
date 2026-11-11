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
const routePath = (locale, route) => `${base}${locale === 'en' ? '' : `${locale}/`}${route ? `${route}/` : ''}`;
const expectedUrls = new Set();
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^\"]*)"`))?.[1];
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
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^\"#?]*)(?:[?#][^\"]*)?"/g)) {
      assert.ok(href.startsWith(base), `${path}: internal URL uses configured base ${href}`);
      const relative = `/${href.slice(base.length)}`;
      const target = relative.endsWith('/') ? join('dist', relative, 'index.html') : join('dist', relative);
      await access(target);
    }
    if (origin) {
      const expected = new URL(routePath(locale, route), origin).href;
      expectedUrls.add(expected);
      const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag);
      const canonicals = links.filter(tag => attribute(tag, 'rel') === 'canonical');
      assert.equal(canonicals.length, 1, `${path}: one canonical`);
      assert.equal(attribute(canonicals[0], 'href'), expected, `${path}: exact canonical origin and path`);
      const alternates = links.filter(tag => attribute(tag, 'rel') === 'alternate');
      assert.equal(alternates.length, locales.length + 1, `${path}: language alternate count`);
      for (const alternate of [...locales, 'x-default']) {
        const matching = alternates.filter(tag => attribute(tag, 'hreflang') === alternate);
        assert.equal(matching.length, 1, `${path}: one alternate ${alternate}`);
        assert.equal(attribute(matching[0], 'href'), new URL(routePath(alternate === 'x-default' ? 'en' : alternate, route), origin).href, `${path}: exact alternate ${alternate}`);
      }
      const openGraph = [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => tag).find(tag => attribute(tag, 'property') === 'og:url');
      assert.equal(attribute(openGraph || '', 'content'), expected, `${path}: exact Open Graph URL`);
    } else {
      assert.ok(!html.includes('rel="canonical"'), `${path}: no invented canonical origin`);
      assert.ok(!html.includes('rel="alternate"'), `${path}: no invented alternate origin`);
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
  'hangul/rhwp_bg.wasm', 'licenses/rhwp-core.txt',
  'licenses/rhwp-notices/THIRD_PARTY_LICENSES.md',
  'licenses/silurus-ooxml.txt', 'licenses/silurus-ooxml-third-party.txt',
  'fonts/NotoSansKR.ttf', 'fonts/OFL.txt',
]) await access(`dist/${file}`);
assert.match(await readFile('dist/licenses/rhwp-core.txt', 'utf8'), /MIT License/, 'Hangul runtime MIT notice');
const noticeFiles = await readdir('node_modules/@rhwp/core/notices', { recursive: true, withFileTypes: true });
for (const notice of noticeFiles.filter(entry => entry.isFile())) {
  const relative = join(notice.parentPath, notice.name).slice('node_modules/@rhwp/core/notices/'.length);
  assert.deepEqual(await readFile(join('dist/licenses/rhwp-notices', relative)), await readFile(join('node_modules/@rhwp/core/notices', relative)), `Preserved Hangul third-party notice ${relative}`);
}
assert.equal((await readFile('dist/CNAME', 'utf8')).trim(), 'pdfeditgo.com', 'Connected custom-domain artifact');
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, origin ? pageCount : 0, 'Sitemap origin handling');
if(origin){
  assert.deepEqual(new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([,url]) => url)), expectedUrls, 'Sitemap contains exact configured route URLs');
  const robots=await readFile('dist/robots.txt','utf8');
  assert.ok(robots.includes(new URL(`${base}sitemap.xml`,origin).href),'Robots sitemap base');
}
console.log(`Verified ${pageCount} static pages, exact metadata/sitemap URLs, internal assets, local PDF/Office/Hangul runtimes and preserved licenses.`);
