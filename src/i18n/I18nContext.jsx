import React, { createContext, useContext, useState, useEffect } from 'react';
import deStrings from './de.json';
import frStrings from './fr.json';

const translations = {
  de: deStrings,
  fr: frStrings
};

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(localStorage.getItem('locale') || 'de');

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = (path) => {
    const keys = path.split('.');
    let result = translations[locale];
    for (const key of keys) {
      if (result[key] === undefined) return path;
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
