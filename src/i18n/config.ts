import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationsAr from './locales/ar.json';
import translationsEn from './locales/en.json';

const resources = {
  ar: {
    translation: translationsAr,
  },
  en: {
    translation: translationsEn,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: false,
    supportedLngs: ['ar', 'en'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
