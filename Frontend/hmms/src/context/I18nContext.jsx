import { createContext, useContext, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'hmms_language';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en');

  const value = useMemo(() => {
    const dictionary = translations[language] || translations.en;

    const t = (key, fallback = '') => {
      const parts = key.split('.');
      let current = dictionary;

      for (const part of parts) {
        current = current?.[part];
      }

      return current ?? fallback;
    };

    const changeLanguage = (nextLanguage) => {
      setLanguage(nextLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    };

    return {
      language,
      setLanguage: changeLanguage,
      t,
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
