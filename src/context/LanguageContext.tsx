import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, type LanguageConfig, t as tI18n, type TranslationKey } from '../i18n';
import { UI_DICTIONARIES } from '../i18n/translations';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (code: string) => void;
  languageConfig: LanguageConfig;
  t: (key: any, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jalkrishi_language');
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    }
    return 'en';
  });

  const languageConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const setLanguage = (code: string) => {
    setCurrentLanguageState(code);
    const target = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    const dir = target?.dir || 'ltr';

    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
      document.documentElement.lang = code;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalkrishi_language', code);
    }
  };

  useEffect(() => {
    setLanguage(currentLanguage);
  }, []);

  const tFunc = (key: any, fallback?: string): string => {
    if (!key) return fallback || '';
    const strKey = String(key).trim();

    // 1. Check UI_DICTIONARIES for currentLanguage
    const targetUiDict = UI_DICTIONARIES[currentLanguage];
    if (targetUiDict && targetUiDict[strKey] && targetUiDict[strKey].trim()) {
      return targetUiDict[strKey];
    }

    // 2. Check i18n t() resolver for standard TranslationKey FIRST (when clean localized value exists)
    const i18nResult = tI18n(strKey as TranslationKey, currentLanguage);
    if (i18nResult && i18nResult !== strKey && !i18nResult.includes('_')) {
      return i18nResult;
    }

    // 3. Fall back to English UI dictionary
    const enVal = UI_DICTIONARIES['en']?.[strKey];
    if (enVal && enVal.trim()) {
      return enVal;
    }

    // 4. If an explicit fallback string was provided, use it!
    if (fallback && fallback.trim()) {
      return fallback;
    }

    // 5. If strKey is an internal key (e.g. proactive_*, default_*, *_stable), humanize it cleanly
    if (strKey.includes('_') || strKey.startsWith('default') || strKey.startsWith('proactive')) {
      return strKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return strKey;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, languageConfig, t: tFunc }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
