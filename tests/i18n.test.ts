import { describe, expect, it } from 'vitest';
import {
  dictionaries, getText, legalContent, localePath, locales, toolContent, tools,
  type Locale,
} from '../src/lib/i18n';

function leaves(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => Object.entries(leaves(child, prefix ? `${prefix}.${key}` : key))));
}

describe('language routes', () => {
  it('keeps English at the root and other languages under their own prefix', () => {
    expect(locales.map(locale => localePath(locale))).toEqual(['/', '/ko/', '/es/', '/ja/']);
    expect(locales.map(locale => localePath(locale, '/merge-pdf/')))
      .toEqual(['/merge-pdf/', '/ko/merge-pdf/', '/es/merge-pdf/', '/ja/merge-pdf/']);
    expect(localePath('en', 'privacy')).toBe('/privacy/');
  });

  it('makes every localized tool route unique, root relative and canonical', () => {
    const routes = locales.flatMap(locale => tools.map(tool => localePath(locale, tool)));
    expect(new Set(routes).size).toBe(16);
    for (const route of routes) {
      expect(route.startsWith('/')).toBe(true);
      expect(route.endsWith('/')).toBe(true);
      expect(route.includes('//')).toBe(false);
      expect(new URL(route, 'https://example.test').origin).toBe('https://example.test');
    }
  });

  it.each(['../privacy', 'merge-pdf/../contact', 'https://example.test', 'javascript:alert(1)', '%2e%2e/privacy', 'privacy?next=https://example.test', 'privacy#part', 'privacy\u0000'])
    ('rejects a path outside the local slug format: %s', path => {
      expect(() => localePath('en', path)).toThrow('Invalid local path');
    });

  it('rejects unsupported locales even when an untyped caller supplies one', () => {
    expect(() => localePath('fr' as Locale, 'merge-pdf')).toThrow('Unsupported locale');
  });
});

describe('translation coverage', () => {
  const reference = leaves(dictionaries.en);

  it.each(locales)('%s has the same complete UI and error key set as English', locale => {
    const entries = leaves(getText(locale));
    expect(Object.keys(entries).sort()).toEqual(Object.keys(reference).sort());
    for (const [key, value] of Object.entries(entries)) {
      expect(value.trim(), `${locale}.${key} is empty`).not.toBe('');
      if (locale !== 'en') expect(value, `${locale}.${key} exposes a raw translation key`).not.toBe(key);
      expect(value).not.toMatch(/\b(?:TODO|TRANSLATE_ME|MISSING_TRANSLATION)\b/);
    }
  });

  it.each(['ko', 'es', 'ja'] as const)('%s translates the primary controls and errors', locale => {
    const d = getText(locale);
    for (const key of ['heroTitle', 'heroSubtitle', 'choosePdf', 'chooseImages', 'download', 'privacyHint', 'startOver'] as const) {
      expect(d[key]).not.toBe(dictionaries.en[key]);
    }
    for (const code of Object.keys(d.errors) as (keyof typeof d.errors)[]) {
      expect(d.errors[code]).not.toBe(dictionaries.en.errors[code]);
    }
    for (const tool of tools) expect(d.tools[tool].name).not.toBe(dictionaries.en.tools[tool].name);
  });

  it.each(locales)('%s includes useful, distinct static content for every tool', locale => {
    const entries = tools.map(tool => toolContent(locale, tool));
    expect(new Set(entries.map(entry => entry.title)).size).toBe(tools.length);
    expect(new Set(entries.map(entry => entry.description)).size).toBe(tools.length);
    for (const entry of entries) {
      expect(entry.title.trim()).not.toBe('');
      expect(entry.description.trim()).not.toBe('');
      expect(entry.heading.trim()).not.toBe('');
      expect(entry.intro.trim()).not.toBe('');
      expect(entry.steps.length).toBeGreaterThanOrEqual(3);
      expect(entry.features.length).toBeGreaterThanOrEqual(3);
      expect(entry.faqs.length).toBeGreaterThanOrEqual(2);
      for (const faq of entry.faqs) {
        expect(faq.q.trim()).not.toBe('');
        expect(faq.a.trim()).not.toBe('');
      }
    }
  });
});

describe('configured contact copy', () => {
  it.each(locales)('%s changes only the contact body when an email is configured', locale => {
    const unconfigured = legalContent(locale, 'contact');
    const configured = legalContent(locale, 'contact', true);
    expect(configured.title).toBe(unconfigured.title);
    expect(configured.paragraphs).not.toEqual(unconfigured.paragraphs);
    expect(configured.paragraphs.length).toBeGreaterThan(0);
    for (const slug of ['about', 'privacy', 'terms'] as const) {
      expect(legalContent(locale, slug, true)).toEqual(legalContent(locale, slug));
    }
    expect(legalContent(locale, 'contact')).toEqual(unconfigured);
  });

  it('gives an honest configured English contact message without a response promise', () => {
    const body = legalContent('en', 'contact', true).paragraphs.join(' ');
    expect(body).toContain('published email address below');
    expect(body).toContain('not guaranteed');
    expect(body).not.toContain('not yet been configured');
    expect(body).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  });
});
