import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, DEFAULT_LANGUAGE } from '@mahfil/i18n';

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

