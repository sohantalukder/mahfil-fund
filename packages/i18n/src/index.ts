import en from './en.json';
import bn from './bn.json';

export const resources = {
  en: { translation: en },
  bn: { translation: bn }
} as const;

export type SupportedLanguage = keyof typeof resources;

export const DEFAULT_LANGUAGE: SupportedLanguage = 'bn';

