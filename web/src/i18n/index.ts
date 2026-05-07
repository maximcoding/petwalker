'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import he from './locales/he.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'es', 'zh', 'he'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ['he'];

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}

let initialized = false;

export function initI18n(): typeof i18n {
  if (initialized) return i18n;
  initialized = true;

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ru: { translation: ru },
        es: { translation: es },
        zh: { translation: zh },
        he: { translation: he },
      },
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      interpolation: { escapeValue: false }, // react already escapes
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'petwalker.lang',
      },
    });

  return i18n;
}

/** Apply <html dir="rtl"> when the active language is RTL. */
export function applyDirection(lang: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}
