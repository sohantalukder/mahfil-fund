import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import bn from './locales/bn.json';

const resources = {
  en: { translation: en },
  bn: { translation: bn },
} as const;

const DEFAULT_LANGUAGE = 'bn';

let initialized = false;

export function ensureI18n() {
  if (initialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
  initialized = true;
  return i18n;
}
