import { locales, localePath, tools, type Locale } from './i18n';
import { withSiteBase } from './site-path';

export const seoRoutes = ['', ...tools, 'about', 'privacy', 'terms', 'contact'] as const;
export type SeoRoute = (typeof seoRoutes)[number];
type SiteOrigin = URL | string | undefined;

export function routeSeoPolicy(route: string, contactEmail = '') {
  const canonical = seoRoutes.some(candidate => candidate === route);
  const indexable = canonical && (route !== 'contact' || Boolean(contactEmail.trim()));
  return { indexable, canonical, alternates: indexable };
}

export const isIndexableRoute = (route: string, contactEmail = ''): boolean =>
  routeSeoPolicy(route, contactEmail).indexable;

export const indexableRoutes = (contactEmail = ''): SeoRoute[] =>
  seoRoutes.filter(route => isIndexableRoute(route, contactEmail));

/** Build a URL from a configured origin and a validated internal path, without URL state. */
export function absoluteSiteUrl(path: string, site: SiteOrigin, base = '/'): string | undefined {
  if (!site) return undefined;
  const configured = site.toString();
  if (!/^https?:\/\/[^/?#\\]+\/?$/i.test(configured) || /[\u0000-\u0020\u007f]/.test(configured)) {
    throw new Error('Invalid site origin');
  }
  let origin: URL;
  try { origin = new URL(site); } catch { throw new Error('Invalid site origin'); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Invalid site origin');
  }

  const pathname = path.split(/[?#]/, 1)[0] || '';
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { throw new Error('Invalid internal URL'); }
  if (!pathname.startsWith('/') || /\/{2}/.test(decoded) || /[\u0000-\u0020\u007f\\?#]/.test(decoded)
    || /(?:^|\/)\.{1,2}(?:\/|$)/.test(decoded)) {
    throw new Error('Invalid internal URL');
  }
  return new URL(withSiteBase(pathname, base), origin).href;
}

export function alternateUrls(route: string, site: SiteOrigin, base = '/') {
  if (!site || !seoRoutes.some(candidate => candidate === route)) return [];
  const variants = locales.map(locale => ({
    locale: locale as Locale | 'x-default',
    href: absoluteSiteUrl(localePath(locale, route), site, base)!,
  }));
  return [...variants, { locale: 'x-default' as const, href: variants[0]!.href }];
}

export const escapeXml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[character]!));

interface SeoDocumentOptions { site?: URL | string; base?: string; contactEmail?: string }

export function createSitemap({ site, base = '/', contactEmail = '' }: SeoDocumentOptions = {}): string {
  const entries = site ? indexableRoutes(contactEmail).flatMap(route => {
    const variants = alternateUrls(route, site, base);
    const links = variants.map(({ locale, href }) =>
      `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(href)}" />`).join('');
    return variants.filter(({ locale }) => locale !== 'x-default').map(({ href }) =>
      `<url><loc>${escapeXml(href)}</loc>${links}</url>`);
  }).join('\n') : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>`;
}

export function createRobots({ site, base = '/' }: SeoDocumentOptions = {}): string {
  const sitemap = absoluteSiteUrl('/sitemap.xml', site, base);
  return `User-agent: *\nAllow: /\n${sitemap ? `Sitemap: ${sitemap}\n` : ''}`;
}
