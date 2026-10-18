import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationsAr from './locales/ar.json';

const resources = {
  ar: {
    translation: translationsAr,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    supportedLngs: ['ar'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
