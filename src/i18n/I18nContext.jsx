import React, { createContext, useContext, useState, useEffect } from 'react';
import enStrings from './en.json';
import deStrings from './de.json';
import frStrings from './fr.json';

const translations = {
  en: enStrings,
  de: deStrings,
  fr: frStrings
};

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  // Default to English for Admin, can be overridden by client-facing pages
  const [locale, setLocale] = useState(localStorage.getItem('portal_locale') || 'en');

  useEffect(() => {
    localStorage.setItem('portal_locale', locale);
  }, [locale]);

  const t = (path) => {
    if (!path) return '';
    const keys = path.split('.');
    let result = translations[locale] || translations['en'];

    for (const key of keys) {
      if (result[key] === undefined) {
        // Fallback to English if key missing in current locale
        let fallbackResult = translations['en'];
        for (const fallbackKey of keys) {
          if (fallbackResult[fallbackKey] === undefined) return path;
          fallbackResult = fallbackResult[fallbackKey];
        }
        return fallbackResult;
      }
      result = result[key];
    }
    return result;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
