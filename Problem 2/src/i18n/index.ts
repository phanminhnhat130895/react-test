import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
import { readLanguage, saveLanguage } from './preferences';

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
  ja: { translation: ja },
};
export const supportedLanguages = Object.keys(resources);
export const i18n = createInstance();
// Bundled resources keep the demo offline and allow synchronous initialization.
void i18n.use(initReactI18next).init({
  resources,
  lng: readLanguage(),
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});
export function syncDocumentLanguage() {
  document.documentElement.lang = i18n.resolvedLanguage || 'en';
  document.documentElement.dir = i18n.dir();
  document.title = i18n.t('app.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('app.description'));
}
i18n.on('languageChanged', () => {
  syncDocumentLanguage();
  saveLanguage(i18n.resolvedLanguage || 'en');
});
syncDocumentLanguage();
