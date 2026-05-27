import { createContext, useContext, useMemo, useState } from 'react';
import { enUS, es } from 'date-fns/locale';
import { translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'hmms_language';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en');

  const value = useMemo(() => {
    const dictionary = translations[language] || translations.en;
    const locale = language === 'es' ? 'es-ES' : 'en-US';
    const dateLocale = language === 'es' ? es : enUS;

    const t = (key, fallback = '') => {
      const parts = key.split('.');
      let current = dictionary;

      for (const part of parts) {
        current = current?.[part];
      }

      return current ?? fallback;
    };

    const tr = (englishText, spanishText = '') => (
      language === 'es'
        ? (spanishText || englishText)
        : englishText
    );

    const changeLanguage = (nextLanguage) => {
      setLanguage(nextLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    };

    return {
      language,
      setLanguage: changeLanguage,
      locale,
      dateLocale,
      t,
      tr,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
