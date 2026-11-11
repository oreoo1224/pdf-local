import { describe, expect, it } from 'vitest';
import { normalizeSiteBase, sitePath, withSiteBase } from '../src/lib/site-path';

describe('hosting base paths', () => {
  it('keeps root-hosted URLs unchanged', () => {
    expect(normalizeSiteBase()).toBe('/');
    expect(withSiteBase('/ko/merge-pdf/')).toBe('/ko/merge-pdf/');
    expect(withSiteBase('/favicon.svg', '/')).toBe('/favicon.svg');
    expect(sitePath('/')).toBe('/');
  });

  it('normalizes a GitHub project base without changing logical language routes', () => {
    expect(normalizeSiteBase('pdf-local')).toBe('/pdf-local/');
    expect(normalizeSiteBase('/pdf-local')).toBe('/pdf-local/');
    expect(normalizeSiteBase('/pdf-local/')).toBe('/pdf-local/');
    expect(withSiteBase('/', '/pdf-local/')).toBe('/pdf-local/');
    expect(withSiteBase('/ko/merge-pdf/', '/pdf-local/')).toBe('/pdf-local/ko/merge-pdf/');
    expect(withSiteBase('/favicon.svg', '/pdf-local/')).toBe('/pdf-local/favicon.svg');
  });

  it('prefixes once at a complete path boundary and preserves URL suffixes', () => {
    expect(withSiteBase('/pdf-local/', '/pdf-local/')).toBe('/pdf-local/');
    expect(withSiteBase('/pdf-local', '/pdf-local/')).toBe('/pdf-local/');
    expect(withSiteBase('/pdf-local/ko/#tools', '/pdf-local/')).toBe('/pdf-local/ko/#tools');
    expect(withSiteBase('/ko/?a=1#tools', '/pdf-local/')).toBe('/pdf-local/ko/?a=1#tools');
    expect(withSiteBase('/pdf-locality/', '/pdf-local/')).toBe('/pdf-local/pdf-locality/');
  });

  it.each(['https://example.test', '//example.test', '/a/../b/', '/%2e%2e/', '/a?query', '/a#hash', '/a//b/', '/a\\b/'])
    ('rejects an unsafe hosting prefix: %s', base => {
      expect(() => normalizeSiteBase(base)).toThrow('Invalid SITE_BASE');
    });

  it.each(['https://example.test', '//example.test/x', '../x', '/a/../x', '/%2e%2e/x', '/%2f%2fevil.test', '/a\\b', '/a\u0000b'])
    ('rejects external or traversing internal links: %s', path => {
      expect(() => withSiteBase(path, '/pdf-local/')).toThrow('Invalid internal URL');
    });
});
