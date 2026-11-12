import { describe, expect, it } from 'vitest';
import { localePath, locales, tools } from '../src/lib/i18n';
import {
  absoluteSiteUrl, alternateUrls, createRobots, createSitemap, escapeXml,
  indexableRoutes, isIndexableRoute, routeSeoPolicy, seoRoutes,
} from '../src/lib/seo-routes';

const site = new URL('https://pdfeditgo.com/');
const sitemapEntries = (xml: string) => [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)]
  .map(([, loc, links]) => ({ loc, links: [...links!.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)]
    .map(([, locale, href]) => ({ locale, href })) }));

describe('SEO route policy', () => {
  it('includes unique home, tool and information routes', () => {
    expect(seoRoutes).toEqual(['', ...tools, 'about', 'privacy', 'terms', 'contact']);
    expect(new Set(seoRoutes).size).toBe(11);
    expect(indexableRoutes()).toHaveLength(10);
    expect(indexableRoutes('support@pdfeditgo.com')).toHaveLength(11);
    expect(isIndexableRoute('contact', '  ')).toBe(false);
    expect(routeSeoPolicy('contact')).toEqual({ indexable: false, canonical: true, alternates: false });
    expect(routeSeoPolicy('contact', 'support@pdfeditgo.com'))
      .toEqual({ indexable: true, canonical: true, alternates: true });
  });

  it.each(['404', '404.html', 'missing', '../privacy', '/contact/', '?lang=en'])
    ('never gives an unknown route indexing or canonical signals: %s', route => {
      expect(routeSeoPolicy(route)).toEqual({ indexable: false, canonical: false, alternates: false });
      expect(alternateUrls(route, site)).toEqual([]);
    });
});

describe('absolute SEO URLs', () => {
  it('keeps the English root and strips language preference or navigation state', () => {
    expect(absoluteSiteUrl('/?lang=en#tools', site)).toBe('https://pdfeditgo.com/');
    expect(absoluteSiteUrl('/ko/merge-pdf/?source=nav#upload', site))
      .toBe('https://pdfeditgo.com/ko/merge-pdf/');
    expect(absoluteSiteUrl('/sitemap.xml', 'https://pdfeditgo.com'))
      .toBe('https://pdfeditgo.com/sitemap.xml');
    expect(absoluteSiteUrl('/', undefined)).toBeUndefined();
  });

  it('supports a deployment base exactly once and at path boundaries', () => {
    expect(absoluteSiteUrl('/', site, '/pdf-local/')).toBe('https://pdfeditgo.com/pdf-local/');
    expect(absoluteSiteUrl('/ko/merge-pdf/', site, 'pdf-local'))
      .toBe('https://pdfeditgo.com/pdf-local/ko/merge-pdf/');
    expect(absoluteSiteUrl('/pdf-local', site, '/pdf-local/')).toBe('https://pdfeditgo.com/pdf-local/');
    expect(absoluteSiteUrl('/pdf-local/ko/', site, '/pdf-local/')).toBe('https://pdfeditgo.com/pdf-local/ko/');
    expect(absoluteSiteUrl('/pdf-locality/', site, '/pdf-local/'))
      .toBe('https://pdfeditgo.com/pdf-local/pdf-locality/');
    expect(() => absoluteSiteUrl('/', site, '/a/../b/')).toThrow('Invalid SITE_BASE');
  });

  it.each([
    'https://evil.test/', '//evil.test/', 'privacy/', '', '/a/../privacy/', '/%2e%2e/privacy/',
    '/%2f%2fevil.test/', '/a//b/', '/a\\b/', '/%5cevil.test/', '/%00/', '/%7f/', '/bad%escape/',
    '/a b/', '/trailing /', '/encoded%3fquery/', '/encoded%23fragment/',
  ])('rejects malformed or nonlocal paths before URL normalization: %s', path => {
    expect(() => absoluteSiteUrl(path, site, '/pdf-local/')).toThrow('Invalid internal URL');
  });

  it.each([
    'javascript:alert(1)', 'ftp://pdfeditgo.com/', 'https://user:pass@pdfeditgo.com/',
    'https://pdfeditgo.com/path/', 'https://pdfeditgo.com/?query=1', 'https://pdfeditgo.com/#fragment',
    'https://pdfeditgo.com/?', 'https://pdfeditgo.com/#', 'https://pdfeditgo.com/./',
    'https://pdfeditgo.com/\n', 'not a URL',
  ])('rejects configuration that is not a clean HTTP(S) origin: %s', origin => {
    expect(() => absoluteSiteUrl('/', origin)).toThrow('Invalid site origin');
  });
});

describe('multilingual sitemap', () => {
  it.each(['/', '/pdf-local/'])('emits reciprocal locale variants at base %s', base => {
    const xml = createSitemap({ site, base });
    const entries = sitemapEntries(xml);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(entries).toHaveLength(40);
    expect(new Set(entries.map(entry => entry.loc)).size).toBe(40);
    for (const route of indexableRoutes()) {
      const variants = alternateUrls(route, site, base);
      expect(variants.map(variant => variant.locale)).toEqual([...locales, 'x-default']);
      expect(variants.at(-1)?.href).toBe(absoluteSiteUrl(localePath('en', route), site, base));
      for (const locale of locales) {
        const href = absoluteSiteUrl(localePath(locale, route), site, base);
        const entry = entries.find(candidate => candidate.loc === href);
        expect(entry, `${locale}/${route} is missing`).toBeDefined();
        expect(entry!.links).toEqual(variants);
        expect(entry!.links.some(link => link.locale === locale && link.href === href)).toBe(true);
      }
    }
    expect(xml).not.toMatch(/contact|404|<lastmod|<changefreq|<priority/);
    for (const entry of entries) {
      for (const href of [entry.loc!, ...entry.links.map(link => link.href!)]) {
        expect(new URL(href).search).toBe('');
        expect(new URL(href).hash).toBe('');
      }
    }
  });

  it('includes all contact variants only when a public email is configured', () => {
    const entries = sitemapEntries(createSitemap({ site, contactEmail: 'support@pdfeditgo.com' }));
    expect(entries).toHaveLength(44);
    expect(entries.filter(entry => entry.loc?.endsWith('/contact/'))).toHaveLength(4);
    expect(entries.some(entry => entry.loc?.includes('404'))).toBe(false);
  });

  it('emits valid empty XML without inventing a configured origin', () => {
    const xml = createSitemap();
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset [^>]+>\n\n<\/urlset>$/);
    expect(sitemapEntries(xml)).toHaveLength(0);
    expect(alternateUrls('', undefined)).toEqual([]);
  });

  it('escapes every XML text and attribute delimiter in one pass', () => {
    expect(escapeXml(`A&B <tag> "quoted" 'value'`))
      .toBe('A&amp;B &lt;tag&gt; &quot;quoted&quot; &apos;value&apos;');
    expect(escapeXml('https://example.test/a?one=1&two=2'))
      .toBe('https://example.test/a?one=1&amp;two=2');
  });
});

describe('robots discovery', () => {
  it('allows pages and browser assets while advertising the configured sitemap', () => {
    expect(createRobots({ site })).toBe('User-agent: *\nAllow: /\nSitemap: https://pdfeditgo.com/sitemap.xml\n');
    expect(createRobots({ site, base: '/pdf-local/' }))
      .toBe('User-agent: *\nAllow: /\nSitemap: https://pdfeditgo.com/pdf-local/sitemap.xml\n');
    expect(createRobots()).toBe('User-agent: *\nAllow: /\n');
  });
});
