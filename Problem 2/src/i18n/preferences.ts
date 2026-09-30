export const LANGUAGE_STORAGE_KEY = 'demo-swap.language';
export const languages = {
  en: { label: 'English', short: 'EN' },
  vi: { label: 'Tiếng Việt', short: 'VI' },
  ja: { label: '日本語', short: 'JA' },
} as const;
export type Language = keyof typeof languages;
export function resolveLanguage(value: unknown): Language {
  const code = typeof value === 'string' ? value.toLowerCase().split('-')[0] : '';
  return Object.hasOwn(languages, code) ? (code as Language) : 'en';
}
export function readLanguage(): Language {
  try {
    return resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return 'en';
  }
}
export function saveLanguage(value: string) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, resolveLanguage(value));
  } catch {
    /* Private browsing or blocked storage must not prevent switching. */
  }
}
