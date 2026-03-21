import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import mr from '../locales/mr.json';

const resources = {
  en: { translation: en },
  mr: { translation: mr },
};

// Get device locale safely
const deviceLocale = Localization.getLocales()[0]?.languageTag ?? 'en';
const deviceLang: 'en' | 'mr' = ['en', 'mr'].includes(deviceLocale.split('-')[0])
  ? (deviceLocale.split('-')[0] as 'en' | 'mr')
  : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;