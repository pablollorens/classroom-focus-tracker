export const locales = ['nl', 'es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'nl';

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  es: 'Español',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  nl: '🇳🇱',
  es: '🇪🇸',
  en: '🇬🇧',
};
