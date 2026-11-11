import { locales, type Locale } from './i18n';

export const LANGUAGE_STORAGE_KEY = 'pdfeditnow-language';
export const LEGACY_LANGUAGE_STORAGE_KEY = 'pdfroom-language';

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

/** Read the renamed preference first, retaining earlier users' explicit choices. */
export function readSavedLanguage(
  storage: Pick<Storage, 'getItem'> | undefined,
): Locale | null {
  try {
    const current = storage?.getItem(LANGUAGE_STORAGE_KEY);
    if (isLocale(current)) return current;
    const legacy = storage?.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
    return isLocale(legacy) ? legacy : null;
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
