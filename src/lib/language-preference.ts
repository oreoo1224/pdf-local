import { locales, type Locale } from './i18n';

export const LANGUAGE_STORAGE_KEY = 'pdfeditgo-language';
export const LEGACY_LANGUAGE_STORAGE_KEYS = ['pdfeditnow-language', 'pdfroom-language'] as const;

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (locales as readonly string[]).includes(value);

/** An explicit URL choice wins, then a saved choice, then browser language order. */
export function resolvePreferredLocale(
  saved: string | null,
  browserLanguages: readonly string[],
  requested?: string | null,
): Locale {
  if (isLocale(requested)) return requested;
  if (isLocale(saved)) return saved;
  for (const language of browserLanguages) {
    try {
      const [tag] = Intl.getCanonicalLocales(language.trim());
      const primary = tag?.split('-')[0]?.toLowerCase();
      if (isLocale(primary)) return primary;
    } catch {
      // Ignore malformed or unsupported browser entries and consider the next one.
    }
  }
  return 'en';
}

/** Keep the newest explicit choice and migrate earlier brand keys when possible. */
export function readSavedLanguage(
  storage: (Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem'>>) | undefined,
): Locale | null {
  try {
    const current = storage?.getItem(LANGUAGE_STORAGE_KEY);
    if (isLocale(current)) return current;
    for (const key of LEGACY_LANGUAGE_STORAGE_KEYS) {
      const legacy = storage?.getItem(key);
      if (!isLocale(legacy)) continue;
      if (storage?.setItem) saveLanguage({ setItem: storage.setItem.bind(storage) }, legacy);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

/** Language preferences are optional: blocked or full storage cannot stop a tool. */
export function saveLanguage(
  storage: Pick<Storage, 'setItem'> | undefined,
  locale: Locale,
): void {
  if (!isLocale(locale)) return;
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // Navigation still works when storage is disabled or unavailable.
  }
}
