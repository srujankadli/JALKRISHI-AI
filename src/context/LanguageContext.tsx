import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, type LanguageConfig } from '../i18n';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (code: string) => void;
  languageConfig: LanguageConfig;
  t: (key: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>('en');

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
  };

  useEffect(() => {
    setLanguage(currentLanguage);
  }, []);

  const tFunc = (key: any) => {
    const dicts: Record<string, Record<string, string>> = {
      en: {
        Dashboard: 'Dashboard',
        'Groundwater Map': 'Groundwater Map',
        'Forecast & Predictions': 'Forecast & Predictions',
        'Anomalies & Triage': 'Anomalies & Triage',
        'Crop & Irrigation Advice': 'Crop & Irrigation Advice',
        'Regional Analytics': 'Regional Analytics',
        'WhatsApp AI Assistant': 'WhatsApp AI Assistant',
        'Help & Knowledge Base': 'Help & Knowledge Base',
      },
      hi: {
        Dashboard: 'डैशबोर्ड',
        'Groundwater Map': 'भूजल मानचित्र',
        'Forecast & Predictions': 'पूर्वानुमान',
        'Anomalies & Triage': 'जोखिम चेतावनी',
        'Crop & Irrigation Advice': 'फसल एवं सिंचाई सलाह',
        'Regional Analytics': 'क्षेत्रीय विश्लेषण',
        'WhatsApp AI Assistant': 'व्हाट्सएप एआई सहायक',
        'Help & Knowledge Base': 'सहायता केंद्र',
      },
      te: {
        Dashboard: 'డాష్‌బోర్డ్',
        'Groundwater Map': 'భూజల పటం',
        'Forecast & Predictions': 'అంచనా',
        'Anomalies & Triage': 'రిస్క్ హెచ్చరికలు',
        'Crop & Irrigation Advice': 'పంట సలహా',
        'Regional Analytics': 'ప్రాంతీయ విశ్లేషణ',
        'WhatsApp AI Assistant': 'వాట్సాప్ అసిస్టెంట్',
        'Help & Knowledge Base': 'సహాయ కేంద్రం',
      },
      mr: {
        Dashboard: 'डॅशबोर्ड',
        'Groundwater Map': 'भूजल नकाशा',
        'Forecast & Predictions': 'पूर्वानुमान',
        'Anomalies & Triage': 'धोका इशारे',
        'Crop & Irrigation Advice': 'पीक व सिंचन सल्ला',
        'Regional Analytics': 'प्रादेशिक विश्लेषण',
        'WhatsApp AI Assistant': 'व्हॉट्सॲप सहाय्यक',
        'Help & Knowledge Base': 'मदत केंद्र',
      },
      ur: {
        Dashboard: 'ڈیش بورڈ',
        'Groundwater Map': 'زیر زمین پانی کا نقشہ',
        'Forecast & Predictions': 'پیشگوئی',
        'Anomalies & Triage': 'خطرے کی تنبیہات',
        'Crop & Irrigation Advice': 'فصل اور آبپاشی کی ہدایت',
        'Regional Analytics': 'علاقائی تجزیہ',
        'WhatsApp AI Assistant': 'واٹس ایپ اسسٹنٹ',
        'Help & Knowledge Base': 'مدد مرکز',
      },
    };

    const targetDict = dicts[currentLanguage] || dicts['en'];
    return targetDict[key] || dicts['en'][key] || key;
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
