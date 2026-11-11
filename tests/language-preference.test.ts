import { describe, expect, it, vi } from 'vitest';
import { locales, type Locale } from '../src/lib/i18n';
import {
  LANGUAGE_STORAGE_KEY, LEGACY_LANGUAGE_STORAGE_KEY,
  resolvePreferredLocale, readSavedLanguage, saveLanguage,
} from '../src/lib/language-preference';

function memoryStorage(values: Record<string, string> = {}) {
  const data = new Map(Object.entries(values));
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
  };
}

describe('browser language selection', () => {
  it('honors an explicit English home link when storage is blocked and the browser prefers Korean', () => {
    expect(resolvePreferredLocale(null, ['ko-KR'], 'en')).toBe('en');
  });

  it.each(locales)('gives an explicit %s URL choice priority over saved and browser preferences', locale => {
    const saved = locale === 'ko' ? 'en' : 'ko';
    expect(resolvePreferredLocale(saved, ['ja-JP', 'es-ES'], locale)).toBe(locale);
  });

  it.each(['EN', 'en-US', ' es ', 'fr', '__proto__', '', null, undefined])
    ('ignores invalid explicit request %j and retains preference fallbacks', requested => {
      expect(resolvePreferredLocale('ko', ['ja-JP'], requested)).toBe('ko');
      expect(resolvePreferredLocale(null, ['ja-JP'], requested)).toBe('ja');
    });

  it.each(locales)('keeps an explicit %s choice ahead of browser preferences', locale => {
    expect(resolvePreferredLocale(locale, ['de-DE', 'ja-JP', 'ko-KR', 'es-ES'])).toBe(locale);
  });

  it.each([
    ['ko-KR', 'ko'], ['es-ES', 'es'], ['es-419', 'es'], ['ja-JP', 'ja'],
    ['en-US', 'en'], [' KO-kr ', 'ko'], ['ES-mx', 'es'], ['ja-JP-u-ca-japanese', 'ja'],
  ] as const)('matches browser language %s to %s', (tag, locale) => {
    expect(resolvePreferredLocale(null, [tag])).toBe(locale);
  });

  it('uses the first supported browser language, including English', () => {
    expect(resolvePreferredLocale(null, ['fr-FR', 'es-AR', 'ko-KR'])).toBe('es');
    expect(resolvePreferredLocale(null, ['en-GB', 'ja-JP'])).toBe('en');
  });

  it('does not infer a language from the country part of a tag', () => {
    expect(resolvePreferredLocale(null, ['en-KR'])).toBe('en');
    expect(resolvePreferredLocale(null, ['de-ES', 'ja-JP'])).toBe('ja');
  });

  it.each(['es_419', 'ko--KR', '-ko', '<ko>', 'ko/kr', 'ko?x', '', '  '])
    ('skips malformed browser entry %j', tag => {
      expect(resolvePreferredLocale(null, [tag, 'ja-JP'])).toBe('ja');
    });

  it.each(['KO', 'ko-KR', ' es ', 'fr', '__proto__'])
    ('does not treat invalid saved value %j as a manual choice', saved => {
      expect(resolvePreferredLocale(saved, ['ja-JP'])).toBe('ja');
    });

  it('falls back to English without a supported preference', () => {
    expect(resolvePreferredLocale(null, [])).toBe('en');
    expect(resolvePreferredLocale(null, ['de-DE', 'fr-FR'])).toBe('en');
  });
});

describe('optional language preference storage', () => {
  it('uses the new preference before the earlier brand key', () => {
    const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'en', [LEGACY_LANGUAGE_STORAGE_KEY]: 'ko' });
    expect(readSavedLanguage(storage)).toBe('en');
    expect(storage.getItem).not.toHaveBeenCalledWith(LEGACY_LANGUAGE_STORAGE_KEY);
  });

  it.each(locales)('retains a legacy %s choice after the rename', locale => {
    expect(readSavedLanguage(memoryStorage({ [LEGACY_LANGUAGE_STORAGE_KEY]: locale }))).toBe(locale);
  });

  it('falls back to the legacy key when the new value is invalid', () => {
    expect(readSavedLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'ko-KR', [LEGACY_LANGUAGE_STORAGE_KEY]: 'es' }))).toBe('es');
  });

  it('does not use malformed stored preferences', () => {
    expect(readSavedLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'KO', [LEGACY_LANGUAGE_STORAGE_KEY]: 'fr' }))).toBeNull();
    expect(readSavedLanguage(memoryStorage())).toBeNull();
  });

  it('continues without storage or when access is blocked', () => {
    expect(readSavedLanguage(undefined)).toBeNull();
    expect(readSavedLanguage({ getItem: () => { throw new Error('Storage denied'); } })).toBeNull();
    expect(() => saveLanguage(undefined, 'ko')).not.toThrow();
    expect(() => saveLanguage({ setItem: () => { throw new Error('Storage denied'); } }, 'ja')).not.toThrow();
  });

  it.each(locales)('writes only the explicit %s choice under the renamed key', locale => {
    const storage = memoryStorage();
    saveLanguage(storage, locale);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(LANGUAGE_STORAGE_KEY, locale);
  });

  it('ignores an invalid runtime value instead of storing arbitrary data', () => {
    const storage = memoryStorage();
    saveLanguage(storage, 'not-a-language' as Locale);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
