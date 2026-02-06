import en from './en';
import de from './de';

export type Locale = 'en' | 'de';

const translations = { en, de } as const;

export function getTranslations(locale: Locale) {
  return translations[locale];
}

export function getLocaleFromUrl(url: URL): Locale {
  const segment = url.pathname.split('/').filter(Boolean);
  // Account for base path: /abacus-cli/en/... → ['abacus-cli', 'en', ...]
  const localeSegment = segment[0] === 'abacus-cli' ? segment[1] : segment[0];
  if (localeSegment === 'de') return 'de';
  return 'en';
}

export function localePath(locale: Locale, path: string) {
  return `/abacus-cli/${locale}${path}`;
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'de' : 'en';
}
