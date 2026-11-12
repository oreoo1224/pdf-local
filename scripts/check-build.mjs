import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';

// Resolve the same TypeScript route policy as the site without opening a server.
const loader = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
});
let locales, tools, routes, isIndexableRoute, openSourceCredits, creditsText;
try {
  ({ locales, tools } = await loader.ssrLoadModule('/src/lib/i18n.ts'));
  ({ seoRoutes: routes, isIndexableRoute } = await loader.ssrLoadModule('/src/lib/seo-routes.ts'));
  ({ openSourceCredits, creditsText } = await loader.ssrLoadModule('/src/lib/credits.ts'));
} finally {
  await loader.close();
}

const pageCount = locales.length * routes.length;
const adsTxt = await readFile('dist/ads.txt', 'utf8');
assert.equal(adsTxt, await readFile('public/ads.txt', 'utf8'), 'Published ads.txt matches source');
const publisher = adsTxt.trim().match(/^google\.com, (pub-\d{16}), DIRECT, f08c47fec0942fa0$/);
assert.ok(publisher, 'Valid direct Google publisher record');
const adsenseAccount = `ca-${publisher[1]}`;
const titles = new Set();
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ['SITE_URL', 'CF_PAGES_URL', 'SITE_BASE', 'CONTACT_EMAIL']);
const origin = env.SITE_URL || env.CF_PAGES_URL;
const base = `/${(env.SITE_BASE || '/').trim().replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const routePath = (locale, route) => `${base}${locale === 'en' ? '' : `${locale}/`}${route ? `${route}/` : ''}`;
const expectedUrls = new Map();
const localeTags = { en: 'en_US', ko: 'ko_KR', es: 'es_ES', ja: 'ja_JP' };
const attribute = (tag, name) => tag.match(new RegExp(`(?:^|\\s)${name}="([^\"]*)"`))?.[1];
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(([tag]) => tag);
const metas = html => tags(html, 'meta');
const meta = (html, key) => metas(html).find(tag => attribute(tag, 'property') === key || attribute(tag, 'name') === key);
const content = (html, key) => attribute(meta(html, key) || '', 'content');
const decodeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const idOf = value => typeof value === 'string' ? value : value?.['@id'];
const objectsIn = value => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(objectsIn)];
};
const hasType = (node, type) => [node['@type']].flat().includes(type);

async function checkPage(path, locale) {
  const html = await readFile(path, 'utf8');
  assert.ok(html.includes(`<html lang="${locale}">`), `${path}: document language`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${path}: one H1`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert.ok(title, `${path}: title`);
  assert.ok(!titles.has(title), `${path}: distinct title`);
  titles.add(title);
  assert.ok(content(html, 'description'), `${path}: description`);
  const iconLinks = tags(html, 'link');
  for (const [rel, size, filename] of [
    ['icon', '16x16 32x32 48x48', 'favicon.ico'],
    ['icon', '32x32', 'favicon-32.png'],
    ['icon', '96x96', 'favicon-96.png'],
    ['apple-touch-icon', '180x180', 'apple-touch-icon.png'],
  ]) {
    const matching = iconLinks.filter(tag => attribute(tag, 'rel') === rel && attribute(tag, 'sizes') === size);
    assert.equal(matching.length, 1, `${path}: one ${rel} ${size}`);
    assert.equal(attribute(matching[0], 'href'), `${base}${filename}`, `${path}: icon deployment base`);
  }
  const brand = tags(html, 'img').find(tag => (attribute(tag, 'class') || '').split(/\s+/).includes('brand-logo'));
  assert.ok(brand, `${path}: approved header artwork`);
  assert.equal(attribute(brand, 'src'), `${base}favicon-96.png`, `${path}: header artwork path`);
  assert.equal(attribute(brand, 'width'), '34', `${path}: reserved logo width`);
  assert.equal(attribute(brand, 'height'), '34', `${path}: reserved logo height`);
  assert.equal(attribute(brand, 'alt'), '', `${path}: adjacent brand text names the link`);
  const accountTags = metas(html).filter(tag => attribute(tag, 'name') === 'google-adsense-account');
  assert.equal(accountTags.length, 1, `${path}: one AdSense account declaration`);
  assert.equal(attribute(accountTags[0], 'content'), adsenseAccount, `${path}: account matches ads.txt publisher`);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc="[^"]*(?:adsbygoogle|pagead2\.googlesyndication\.com)/i, `${path}: no ad script introduced`);
  assert.ok(!html.includes('undefined'), `${path}: no leaked missing values`);
  for (const [, href] of html.matchAll(/(?:href|src)="(\/[^\"#?]*)(?:[?#][^\"]*)?"/g)) {
    assert.ok(href.startsWith(base), `${path}: internal URL uses configured base ${href}`);
    const relative = `/${href.slice(base.length)}`;
    const target = relative.endsWith('/') ? join('dist', relative, 'index.html') : join('dist', relative);
    await access(target);
  }
  return html;
}

function checkStructuredData(html, path, expected, route, indexable) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => attribute(attrs, 'type') === 'application/ld+json');
  const documents = scripts.map(([, , json]) => JSON.parse(json));
  const objects = documents.flatMap(objectsIn);
  for (const object of objects) {
    assert.ok(!hasType(object, 'SearchAction'), `${path}: no unsupported site search action`);
    assert.ok(!('aggregateRating' in object) && !('ratingValue' in object), `${path}: no invented ratings`);
  }
  if (!origin || !indexable) {
    assert.equal(documents.length, 0, `${path}: structured data only on canonical indexable pages`);
    return;
  }
  assert.ok(documents.length > 0, `${path}: structured data`);
  assert.ok(documents.some(document => document['@context'] === 'https://schema.org'), `${path}: schema.org context`);
  const nodes = documents.flatMap(document => document['@graph'] || [document]);
  const websites = nodes.filter(node => hasType(node, 'WebSite'));
  const pages = nodes.filter(node => hasType(node, 'WebPage'));
  assert.equal(websites.length, 1, `${path}: one WebSite node`);
  assert.equal(pages.length, 1, `${path}: one WebPage node`);
  const website = websites[0], page = pages[0];
  assert.equal(website.url, new URL(base, origin).href, `${path}: WebSite URL`);
  assert.equal(website.image, new URL(`${base}logo.png`, origin).href, `${path}: approved structured-data logo`);
  assert.equal(page.url, expected, `${path}: WebPage canonical URL`);
  assert.ok(website['@id'] && page['@id'], `${path}: linked graph identifiers`);
  assert.equal(idOf(page.isPartOf), website['@id'], `${path}: WebPage belongs to WebSite`);
  for (const node of nodes) {
    if (node['@id']) {
      const url = new URL(node['@id']);
      assert.equal(url.origin, new URL(origin).origin, `${path}: graph identifier origin`);
      assert.ok(url.pathname.startsWith(base), `${path}: graph identifier uses deployment base`);
    }
  }
  const applications = nodes.filter(node => hasType(node, 'WebApplication'));
  assert.equal(applications.length, tools.includes(route) ? 1 : 0, `${path}: tool application node`);
  for (const application of applications) {
    assert.equal(application.url, expected, `${path}: application canonical URL`);
    assert.equal(idOf(page.mainEntity), application['@id'], `${path}: page links to its application`);
    assert.ok(application.name && application.description, `${path}: application description`);
  }
  const breadcrumbs = nodes.filter(node => hasType(node, 'BreadcrumbList'));
  if (tools.includes(route)) assert.equal(breadcrumbs.length, 1, `${path}: tool breadcrumb`);
  for (const breadcrumb of breadcrumbs) {
    assert.equal(idOf(page.breadcrumb), breadcrumb['@id'], `${path}: page links to breadcrumb`);
    const items = breadcrumb.itemListElement;
    assert.ok(Array.isArray(items) && items.length >= 2, `${path}: navigable breadcrumb`);
    items.forEach((item, index) => {
      assert.equal(item.position, index + 1, `${path}: breadcrumb order`);
      assert.ok(item.name, `${path}: breadcrumb label`);
      const url = new URL(typeof item.item === 'string' ? item.item : item.item?.['@id']);
      assert.equal(url.origin, new URL(origin).origin, `${path}: breadcrumb origin`);
      assert.ok(url.pathname.startsWith(base), `${path}: breadcrumb deployment base`);
    });
    const last = items.at(-1).item;
    assert.equal(typeof last === 'string' ? last : last?.['@id'], expected, `${path}: breadcrumb current page`);
  }
}

for (const locale of locales) {
  for (const route of routes) {
    const prefix = locale === 'en' ? '' : locale;
    const path = join('dist', prefix, route, 'index.html');
    const html = await checkPage(path, locale);
    if (route === 'about') {
      assert.ok(html.includes(creditsText[locale].heading), `${path}: localized open-source credits`);
      for (const credit of openSourceCredits) {
        assert.ok(html.includes(`href="${credit.upstream}"`), `${path}: ${credit.name} source`);
        assert.ok(html.includes(`href="${base}${credit.licensePath.slice(1)}"`), `${path}: ${credit.name} license`);
        if (credit.noticesPath) assert.ok(html.includes(`href="${base}${credit.noticesPath.slice(1)}"`), `${path}: bundled notices`);
      }
    }
    if (route === 'contact' && env.CONTACT_EMAIL?.trim()) {
      assert.ok(html.includes(`href="mailto:${env.CONTACT_EMAIL.trim()}"`), `${path}: configured public contact`);
    }
    if (!route || tools.includes(route)) {
      for (const id of ['download', 'open-result']) {
        const matches = tags(html, 'a').filter(tag => attribute(tag, 'id') === id);
        assert.equal(matches.length, 1, `${path}: one ${id} action`);
        assert.equal(attribute(matches[0], 'target'), '_blank', `${path}: ${id} preserves the editor`);
        assert.ok((attribute(matches[0], 'rel') || '').split(/\s+/).includes('noopener'), `${path}: safe ${id} preview`);
      }
      assert.ok(tags(html, 'button').some(tag => attribute(tag, 'id') === 'share-result'), `${path}: native file sharing action`);
      assert.ok(html.includes('id="save-error"') && html.includes('id="result-save-help"'), `${path}: saving feedback`);
      for (const id of ['file-error', 'tool-error']) {
        const alert = tags(html, 'div').find(tag => attribute(tag, 'id') === id);
        assert.ok(alert, `${path}: ${id} feedback`);
        assert.equal(attribute(alert, 'role'), 'alert', `${path}: ${id} announces failure`);
        assert.equal(attribute(alert, 'tabindex'), '-1', `${path}: ${id} can receive focus`);
      }
      const errorPosition = html.indexOf('id="tool-error"');
      assert.ok(errorPosition > html.indexOf('id="progress-wrap"') && errorPosition < html.indexOf('id="work-actions"'), `${path}: conversion errors beside processing controls`);
    }
    const indexable = isIndexableRoute(route, env.CONTACT_EMAIL);
    const links = tags(html, 'link');
    const canonicals = links.filter(tag => attribute(tag, 'rel') === 'canonical');
    const alternates = links.filter(tag => attribute(tag, 'rel') === 'alternate');
    if (!indexable) {
      assert.match(content(html, 'robots') || '', /\bnoindex\b/, `${path}: unavailable contact page is noindex`);
      assert.match(content(html, 'robots') || '', /\bfollow\b/, `${path}: contact links remain followable`);
    }
    if (indexable) assert.doesNotMatch(content(html, 'robots') || '', /\bnoindex\b/, `${path}: indexable page`);
    if (origin) {
      const expected = new URL(routePath(locale, route), origin).href;
      if (indexable) expectedUrls.set(expected, { locale, route });
      assert.equal(canonicals.length, 1, `${path}: one canonical`);
      assert.equal(attribute(canonicals[0], 'href'), expected, `${path}: exact canonical origin and path`);
      assert.equal(alternates.length, indexable ? locales.length + 1 : 0, `${path}: language alternate count`);
      if (indexable) for (const alternate of [...locales, 'x-default']) {
        const matching = alternates.filter(tag => attribute(tag, 'hreflang') === alternate);
        assert.equal(matching.length, 1, `${path}: one alternate ${alternate}`);
        assert.equal(attribute(matching[0], 'href'), new URL(routePath(alternate === 'x-default' ? 'en' : alternate, route), origin).href, `${path}: exact alternate ${alternate}`);
      }
      assert.equal(content(html, 'og:url'), expected, `${path}: exact Open Graph URL`);
      assert.equal(content(html, 'og:locale'), localeTags[locale], `${path}: Open Graph locale`);
      const alternateLocales = metas(html).filter(tag => attribute(tag, 'property') === 'og:locale:alternate').map(tag => attribute(tag, 'content'));
      assert.deepEqual(new Set(alternateLocales), new Set(locales.filter(lang => lang !== locale).map(lang => localeTags[lang])), `${path}: Open Graph alternate locales`);
      const imageUrl = new URL(`${base}social-card.png`, origin).href;
      assert.equal(content(html, 'og:image'), imageUrl, `${path}: absolute share image URL`);
      assert.equal(content(html, 'og:image:width'), '1200', `${path}: share image width`);
      assert.equal(content(html, 'og:image:height'), '630', `${path}: share image height`);
      assert.equal(content(html, 'og:image:type'), 'image/png', `${path}: share image type`);
      assert.ok(content(html, 'og:image:alt'), `${path}: share image alternative text`);
      assert.equal(content(html, 'twitter:card'), 'summary_large_image', `${path}: large Twitter card`);
      assert.equal(content(html, 'twitter:image'), imageUrl, `${path}: Twitter share image`);
      assert.ok(content(html, 'twitter:title') && content(html, 'twitter:description'), `${path}: Twitter card text`);
      checkStructuredData(html, path, expected, route, indexable);
    } else {
      assert.equal(canonicals.length, 0, `${path}: no invented canonical origin`);
      assert.equal(alternates.length, 0, `${path}: no invented alternate origin`);
      for (const property of ['og:url', 'og:image', 'twitter:image']) assert.equal(content(html, property), undefined, `${path}: no invented ${property} origin`);
      checkStructuredData(html, path, undefined, route, indexable);
    }
  }
}

const notFound = await checkPage('dist/404.html', 'en');
assert.match(content(notFound, 'robots') || '', /\bnoindex\b/, '404: noindex');
assert.match(content(notFound, 'robots') || '', /\bfollow\b/, '404: recovery links remain followable');
assert.ok(!tags(notFound, 'link').some(tag => ['canonical', 'alternate'].includes(attribute(tag, 'rel'))), '404: no homepage canonical or language alternates');
assert.equal(content(notFound, 'og:url'), undefined, '404: no homepage Open Graph URL');
checkStructuredData(notFound, '404', undefined, '', false);

const assets = await readdir('dist/_astro');
assert.ok(assets.some(name => name.startsWith('pdf.worker') && name.endsWith('.mjs')), 'Bundled PDF.js worker');
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  assert.ok((await readdir(`dist/pdfjs/${directory}`)).length > 0, `PDF.js ${directory}`);
}
for (const file of [
  'robots.txt', 'sitemap.xml', '_headers', 'social-card.png', 'logo.png',
  'favicon.ico', 'favicon-32.png', 'favicon-96.png', 'apple-touch-icon.png',
  'licenses/pdf-lib.txt', 'licenses/pdfjs-dist.txt', 'licenses/fflate.txt',
  'office/docx_parser_bg.wasm', 'office/pptx_parser_bg.wasm',
  'hangul/rhwp_bg.wasm', 'licenses/rhwp-core.txt',
  'licenses/rhwp-notices/THIRD_PARTY_LICENSES.md',
  'licenses/silurus-ooxml.txt', 'licenses/silurus-ooxml-third-party.txt',
  'fonts/NotoSansKR.ttf', 'fonts/OFL.txt',
]) await access(`dist/${file}`);
const shareImage = await readFile('dist/social-card.png');
assert.deepEqual(shareImage.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'Share image is a real PNG');
assert.equal(shareImage.toString('ascii', 12, 16), 'IHDR', 'PNG image header');
assert.equal(shareImage.readUInt32BE(16), 1200, 'Actual share image width');
assert.equal(shareImage.readUInt32BE(20), 630, 'Actual share image height');
assert.ok(shareImage.length < 150_000, 'Share image stays compact');
for (const [filename, size] of [['favicon-32.png', 32], ['favicon-96.png', 96], ['apple-touch-icon.png', 180], ['logo.png', 512]]) {
  const bytes = await readFile(`dist/${filename}`);
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), `${filename}: PNG signature`);
  assert.equal(bytes.readUInt32BE(16), size, `${filename}: actual width`);
  assert.equal(bytes.readUInt32BE(20), size, `${filename}: actual height`);
}
const favicon = await readFile('dist/favicon.ico');
assert.equal(favicon.readUInt16LE(0), 0, 'ICO reserved field');
assert.equal(favicon.readUInt16LE(2), 1, 'ICO image type');
assert.equal(favicon.readUInt16LE(4), 3, 'Three ICO frames');
for (const [index, size] of [16, 32, 48].entries()) {
  const entry = 6 + index * 16;
  const offset = favicon.readUInt32LE(entry + 12);
  const length = favicon.readUInt32LE(entry + 8);
  assert.equal(favicon[entry], size, 'ICO frame width');
  assert.equal(favicon[entry + 1], size, 'ICO frame height');
  assert.ok(offset >= 54 && offset + length <= favicon.length, 'ICO frame bounds');
  assert.deepEqual(favicon.subarray(offset, offset + 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'ICO frame PNG signature');
  assert.equal(favicon.readUInt32BE(offset + 16), size, 'ICO frame actual width');
  assert.equal(favicon.readUInt32BE(offset + 20), size, 'ICO frame actual height');
}
assert.match(await readFile('dist/licenses/rhwp-core.txt', 'utf8'), /MIT License/, 'Hangul runtime MIT notice');
const noticeFiles = await readdir('node_modules/@rhwp/core/notices', { recursive: true, withFileTypes: true });
for (const notice of noticeFiles.filter(entry => entry.isFile())) {
  const relative = join(notice.parentPath, notice.name).slice('node_modules/@rhwp/core/notices/'.length);
  assert.deepEqual(await readFile(join('dist/licenses/rhwp-notices', relative)), await readFile(join('node_modules/@rhwp/core/notices', relative)), `Preserved Hangul third-party notice ${relative}`);
}
assert.equal((await readFile('dist/CNAME', 'utf8')).trim(), 'pdfeditgo.com', 'Connected custom-domain artifact');
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.match(sitemap, /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/, 'Sitemap namespace');
assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/, 'Sitemap language-link namespace');
const sitemapEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => entry);
assert.equal(sitemapEntries.length, expectedUrls.size, 'Sitemap contains only indexable configured routes');
const sitemapUrls = sitemapEntries.map(entry => decodeXml(entry.match(/<loc>(.*?)<\/loc>/)?.[1] || ''));
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'Sitemap URLs are unique');
assert.deepEqual(new Set(sitemapUrls), new Set(expectedUrls.keys()), 'Sitemap contains exact configured route URLs');
for (const entry of sitemapEntries) {
  const url = decodeXml(entry.match(/<loc>(.*?)<\/loc>/)[1]);
  const { route } = expectedUrls.get(url);
  const alternates = tags(entry, 'xhtml:link');
  assert.equal(alternates.length, locales.length + 1, `${url}: sitemap language alternate count`);
  for (const alternate of [...locales, 'x-default']) {
    const matching = alternates.filter(tag => attribute(tag, 'hreflang') === alternate);
    assert.equal(matching.length, 1, `${url}: one sitemap alternate ${alternate}`);
    assert.equal(attribute(matching[0], 'rel'), 'alternate', `${url}: sitemap alternate relationship`);
    assert.equal(decodeXml(attribute(matching[0], 'href')), new URL(routePath(alternate === 'x-default' ? 'en' : alternate, route), origin).href, `${url}: exact reciprocal sitemap alternate ${alternate}`);
  }
}
const robots = await readFile('dist/robots.txt', 'utf8');
assert.match(robots, /User-agent:\s*\*/, 'Robots applies to crawlers');
if (origin) {
  assert.ok(robots.includes(new URL(`${base}sitemap.xml`, origin).href), 'Robots sitemap origin and base');
} else {
  assert.doesNotMatch(robots, /Sitemap:/i, 'Robots does not invent a sitemap origin');
}
console.log(`Verified ${pageCount} static pages plus 404, ${expectedUrls.size} sitemap URLs, metadata/JSON-LD, social assets, local PDF/Office/Hangul runtimes and preserved licenses.`);
