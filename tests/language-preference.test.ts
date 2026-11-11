import { describe, expect, it, vi } from 'vitest';
import { locales, type Locale } from '../src/lib/i18n';
import {
  LANGUAGE_STORAGE_KEY, LEGACY_LANGUAGE_STORAGE_KEYS,
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
  const [previousBrandKey, originalBrandKey] = LEGACY_LANGUAGE_STORAGE_KEYS;

  it('uses the PDFEditGo preference before either earlier brand key', () => {
    const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'en', [previousBrandKey]: 'ko', [originalBrandKey]: 'es' });
    expect(readSavedLanguage(storage)).toBe('en');
    for (const key of LEGACY_LANGUAGE_STORAGE_KEYS) expect(storage.getItem).not.toHaveBeenCalledWith(key);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  describe.each(LEGACY_LANGUAGE_STORAGE_KEYS)('migration from %s', key => {
    it.each(locales)('retains and migrates an explicit %s choice', locale => {
      const storage = memoryStorage({ [key]: locale });
      expect(readSavedLanguage(storage)).toBe(locale);
      expect(storage.setItem).toHaveBeenCalledExactlyOnceWith('pdfeditgo-language', locale);
      expect(storage.getItem(key)).toBe(locale);
      expect(readSavedLanguage(storage)).toBe(locale);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
    });

    it('keeps the migrated manual choice ahead of browser languages and behind a URL choice', () => {
      const storage = memoryStorage({ [key]: 'en' });
      const saved = readSavedLanguage(storage);
      expect(resolvePreferredLocale(saved, ['ko-KR', 'ja-JP'])).toBe('en');
      expect(resolvePreferredLocale(saved, ['ko-KR', 'ja-JP'], 'es')).toBe('es');
      expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    });
  });

  it('prefers the most recent brand choice when both old keys exist', () => {
    const storage = memoryStorage({ [previousBrandKey]: 'ja', [originalBrandKey]: 'ko' });
    expect(readSavedLanguage(storage)).toBe('ja');
    expect(storage.getItem).not.toHaveBeenCalledWith(originalBrandKey);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(LANGUAGE_STORAGE_KEY, 'ja');
  });

  it('skips invalid newer values and migrates a valid earlier manual choice', () => {
    const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'ko-KR', [previousBrandKey]: 'KO', [originalBrandKey]: 'es' });
    expect(readSavedLanguage(storage)).toBe('es');
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(LANGUAGE_STORAGE_KEY, 'es');
  });

  it('does not use malformed stored preferences', () => {
    const storage = memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'KO', [previousBrandKey]: 'fr', [originalBrandKey]: ' es ' });
    expect(readSavedLanguage(storage)).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(readSavedLanguage(memoryStorage())).toBeNull();
  });

  it('does not persist an automatic browser choice or an explicit URL request', () => {
    const storage = memoryStorage();
    expect(resolvePreferredLocale(readSavedLanguage(storage), ['ko-KR'])).toBe('ko');
    expect(resolvePreferredLocale(readSavedLanguage(storage), ['ko-KR'], 'ja')).toBe('ja');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('retains the manual choice when migration writes are blocked or unavailable', () => {
    const getItem = (key: string) => key === previousBrandKey ? 'ja' : null;
    expect(readSavedLanguage({ getItem })).toBe('ja');
    expect(readSavedLanguage({ getItem, setItem: () => { throw new Error('Storage full'); } })).toBe('ja');
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
