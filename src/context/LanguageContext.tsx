import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, type LanguageConfig, t as tI18n, type TranslationKey } from '../i18n';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (code: string) => void;
  languageConfig: LanguageConfig;
  t: (key: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const UI_DICTIONARIES: Record<string, Record<string, string>> = {
  en: {
    Dashboard: 'Dashboard',
    'Groundwater Map': 'Groundwater Map',
    'Forecast & Predictions': 'Forecast & Predictions',
    'Anomalies & Triage': 'Anomalies & Triage',
    'Anomaly Detection': 'Anomaly Detection',
    'Crop & Irrigation Advice': 'Crop & Irrigation Advice',
    'Crop Advisor': 'Crop Advisor',
    'Regional Analytics': 'Regional Analytics',
    'WhatsApp AI Assistant': 'WhatsApp AI Assistant',
    'WhatsApp Farmer': 'WhatsApp Farmer',
    'Help & Knowledge Base': 'Help & Knowledge Base',
    'Help & Knowledge': 'Help & Knowledge',
    'Officer Login Portal': 'Officer Login Portal',
  },
  hi: {
    Dashboard: 'डैशबोर्ड',
    'Groundwater Map': 'भूजल मानचित्र',
    'Forecast & Predictions': 'पूर्वानुमान',
    'Anomalies & Triage': 'जोखिम चेतावनी',
    'Anomaly Detection': 'असामान्य गिरावट',
    'Crop & Irrigation Advice': 'फसल एवं सिंचाई सलाह',
    'Crop Advisor': 'फसल सलाहकार',
    'Regional Analytics': 'क्षेत्रीय विश्लेषण',
    'WhatsApp AI Assistant': 'व्हाट्सएप एआई सहायक',
    'WhatsApp Farmer': 'व्हाट्सएप किसान सेवा',
    'Help & Knowledge Base': 'सहायता केंद्र',
    'Help & Knowledge': 'सहायता व स्रोत',
    'Officer Login Portal': 'अधिकारी लॉगिन पोर्टल',
  },
  bn: {
    Dashboard: 'ড্যাশবোর্ড',
    'Groundwater Map': 'ভূগর্ভস্থ জল মানচিত্র',
    'Forecast & Predictions': 'পূর্বাভাস ও অনুমান',
    'Anomalies & Triage': 'ঝুঁকি ও সতর্কতা',
    'Anomaly Detection': 'অস্বাভাবিক পতন সনাক্তকরণ',
    'Crop & Irrigation Advice': 'ফসল ও সেচ পরামর্শ',
    'Crop Advisor': 'ফসল উপদেষ্টা',
    'Regional Analytics': 'আঞ্চলিক বিশ্লেষণ',
    'WhatsApp AI Assistant': 'হোয়াটসঅ্যাপ এআই সহকারী',
    'WhatsApp Farmer': 'হোয়াটসঅ্যাপ কৃষক সেবা',
    'Help & Knowledge Base': 'সাহায্য ও তথ্য কেন্দ্র',
    'Help & Knowledge': 'সাহায্য ও তথ্য',
    'Officer Login Portal': 'অফিসার লগইন পোর্টাল',
  },
  te: {
    Dashboard: 'డాష్‌బోర్డ్',
    'Groundwater Map': 'భూజల పటం',
    'Forecast & Predictions': 'అంచనా & భవిష్యత్తు',
    'Anomalies & Triage': 'రిస్క్ హెచ్చరికలు',
    'Anomaly Detection': 'అసాధారణ తగ్గుదల గుర్తింపు',
    'Crop & Irrigation Advice': 'పంట & సాగునీటి సలహా',
    'Crop Advisor': 'పంట సలహాదారు',
    'Regional Analytics': 'ప్రాంతీయ విశ్లేషణ',
    'WhatsApp AI Assistant': 'వాట్సాప్ ఏఐ అసిస్టెంట్',
    'WhatsApp Farmer': 'వాట్సాప్ రైతు సేవ',
    'Help & Knowledge Base': 'సహాయ కేంద్రం',
    'Help & Knowledge': 'సహాయం & సమాచారం',
    'Officer Login Portal': 'అధికారుల లాగిన్ పోర్టల్',
  },
  mr: {
    Dashboard: 'डॅशबोर्ड',
    'Groundwater Map': 'भूजल नकाशा',
    'Forecast & Predictions': 'पूर्वानुमान व अंदाज',
    'Anomalies & Triage': 'धोका इशारे',
    'Anomaly Detection': 'असामान्य घट ओळख',
    'Crop & Irrigation Advice': 'पीक व सिंचन सल्ला',
    'Crop Advisor': 'पीक सल्लागार',
    'Regional Analytics': 'प्रादेशिक विश्लेषण',
    'WhatsApp AI Assistant': 'व्हॉट्सॲप एआय सहाय्यक',
    'WhatsApp Farmer': 'व्हॉट्सॲप शेतकरी सेवा',
    'Help & Knowledge Base': 'मदत व माहिती केंद्र',
    'Help & Knowledge': 'मदत व माहिती',
    'Officer Login Portal': 'अधिकारी लॉगिन पोर्टल',
  },
  ta: {
    Dashboard: 'டாஷ்போர்டு',
    'Groundwater Map': 'நிலத்தடி நீர் வரைபடம்',
    'Forecast & Predictions': 'முன்னறிவிப்பு & கணிப்புகள்',
    'Anomalies & Triage': 'அபாய எச்சரிக்கைகள்',
    'Anomaly Detection': 'இயல்பற்ற வீழ்ச்சி கண்டறிதல்',
    'Crop & Irrigation Advice': 'பயிர் & பாசன ஆலோசனை',
    'Crop Advisor': 'பயிர் ஆலோசகர்',
    'Regional Analytics': 'பிராந்திய பகுப்பாய்வு',
    'WhatsApp AI Assistant': 'வாட்ஸ்அப் ஏஐ உதவியாளர்',
    'WhatsApp Farmer': 'வாட்ஸ்அப் விவசாயி சேவை',
    'Help & Knowledge Base': 'உதவி & அறிவு மையம்',
    'Help & Knowledge': 'உதவி & மையம்',
    'Officer Login Portal': 'அதிகாரி உள்நுழைவு தளம்',
  },
  gu: {
    Dashboard: 'ડેશબોર્ડ',
    'Groundwater Map': 'ભૂગર્ભજળ નકશો',
    'Forecast & Predictions': 'પૂર્વાનુમાન અને અંદાજ',
    'Anomalies & Triage': 'જોખમ ચેતવણીઓ',
    'Anomaly Detection': 'અસામાન્ય ઘટાડો ઓળખ',
    'Crop & Irrigation Advice': 'પાક અને સિંચાઈ સલાહ',
    'Crop Advisor': 'પાક સલાહકાર',
    'Regional Analytics': 'પ્રાદેશિક પૃથક્કરણ',
    'WhatsApp AI Assistant': 'વોટ્સએપ એઆઈ આસિસ્ટન્ટ',
    'WhatsApp Farmer': 'વોટ્સએપ ખેડૂત સેવા',
    'Help & Knowledge Base': 'મદદ અને જ્ઞાન કેન્દ્ર',
    'Help & Knowledge': 'મદદ અને જ્ઞાન',
    'Officer Login Portal': 'અધિકારી લોગિન પોર્ટલ',
  },
  kn: {
    Dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Groundwater Map': 'ಅಂತರ್ಜಲ ನಕ್ಷೆ',
    'Forecast & Predictions': 'ಮುನ್ಸೂಚನೆ ಮತ್ತು ಅಂದಾಜು',
    'Anomalies & Triage': 'ಅಪಾಯ ಸೂಚನೆಗಳು',
    'Anomaly Detection': 'ಅಸಹಜ ಕುಸಿತ ಪತ್ತೆ',
    'Crop & Irrigation Advice': 'ಬೆಳೆ ಮತ್ತು ನೀರಾವರಿ ಸಲಹೆ',
    'Crop Advisor': 'ಬೆಳೆ ಸಲಹೆಗಾರ',
    'Regional Analytics': 'ಪ್ರಾದೇಶಿಕ ವಿಶ್ಲೇಷಣೆ',
    'WhatsApp AI Assistant': 'ವಾಟ್ಸಾಪ್ ಎಐ ಸಹಾಯಕ',
    'WhatsApp Farmer': 'ವಾಟ್ಸಾಪ್ ರೈತ ಸೇವೆ',
    'Help & Knowledge Base': 'ಸಹಾಯ ಮತ್ತು ಮಾಹಿತಿ ಕೇಂದ್ರ',
    'Help & Knowledge': 'ಸಹಾಯ ಮತ್ತು ಮಾಹಿತಿ',
    'Officer Login Portal': 'ಅಧಿಕಾರಿ ಲಾಗಿನ್ ಪೋರ್ಟಲ್',
  },
  ml: {
    Dashboard: 'ഡാഷ്‌ബോർഡ്',
    'Groundwater Map': 'ഭൂഗർഭജല ഭൂപടം',
    'Forecast & Predictions': 'പ്രവചനങ്ങളും കണക്കുകൂട്ടലുകളും',
    'Anomalies & Triage': 'അപായ മുന്നറിയിപ്പുകൾ',
    'Anomaly Detection': 'അസാധാരണ ഇടിവ് കണ്ടെത്തൽ',
    'Crop & Irrigation Advice': 'വിളയും നനയ്ക്കൽ നിർദ്ദേശവും',
    'Crop Advisor': 'വിള ഉപദേഷ്ടാവ്',
    'Regional Analytics': 'പ്രദേശിക വിശകലനം',
    'WhatsApp AI Assistant': 'വാട്സ്ആപ്പ് എഐ അസിസ്റ്റന്റ്',
    'WhatsApp Farmer': 'വാട്സ്ആപ്പ് കർഷക സേവനം',
    'Help & Knowledge Base': 'സഹായ കേന്ദ്രം',
    'Help & Knowledge': 'സഹായവും വിവരങ്ങളും',
    'Officer Login Portal': 'ഓഫീസർ ലോഗിൻ പോർട്ടൽ',
  },
  pa: {
    Dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    'Groundwater Map': 'ਭੂਮੀਗਤ ਜਲ ਨਕਸ਼ਾ',
    'Forecast & Predictions': 'ਭਵਿੱਖਬਾਣੀ ਅਤੇ ਅਨੁਮਾਨ',
    'Anomalies & Triage': 'ਜੋਖਮ ਚੇਤਾਵਨੀਆਂ',
    'Anomaly Detection': 'ਅਸਧਾਰਨ ਗਿਰਾਵਟ ਪਛਾਣ',
    'Crop & Irrigation Advice': 'ਫਸਲ ਅਤੇ ਸਿੰਚਾਈ ਸਲਾਹ',
    'Crop Advisor': 'ਫਸਲ ਸਲਾਹਕਾਰ',
    'Regional Analytics': 'ਖੇਤਰੀ ਵਿਸ਼ਲੇਸ਼ਣ',
    'WhatsApp AI Assistant': 'ਵਟਸਐਪ ਏਆਈ ਸਹਾਇਕ',
    'WhatsApp Farmer': 'ਵਟਸਐਪ ਕਿਸਾਨ ਸੇਵਾ',
    'Help & Knowledge Base': 'ਮਦਦ ਅਤੇ ਜਾਣਕਾਰੀ ਕੇਂਦਰ',
    'Help & Knowledge': 'ਮਦਦ ਅਤੇ ਜਾਣਕਾਰੀ',
    'Officer Login Portal': 'ਅਧਿਕਾਰੀ ਲੌਗਇਨ ਪੋਰਟਲ',
  },
  or: {
    Dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
    'Groundwater Map': 'ଭୂତଳ ଜଳ ମାନଚିତ୍ର',
    'Forecast & Predictions': 'ପୂର୍ବାନୁମାନ ଓ ଆକଳନ',
    'Anomalies & Triage': 'ବିପଦ ଚେତାବନୀ',
    'Anomaly Detection': 'ଅସ୍ୱାଭାବିକ ହ୍ରାସ ଚିହ୍ନଟ',
    'Crop & Irrigation Advice': 'ଫସଲ ଓ ଜଳସେଚନ ପରାମର୍ଶ',
    'Crop Advisor': 'ଫସଲ ପରାମର୍ଶଦାତା',
    'Regional Analytics': 'ଆଞ୍ચଳିକ ବିଶ୍ଳେଷଣ',
    'WhatsApp AI Assistant': 'ହ୍ୱାଟସଆପ ଏଆଇ ସହାୟକ',
    'WhatsApp Farmer': 'ହ୍ୱାଟସଆପ କୃଷକ ସେବା',
    'Help & Knowledge Base': 'ସାହାଯ୍ୟ ଓ ତଥ୍ୟ କେନ୍ଦ୍ର',
    'Help & Knowledge': 'ସାହାଯ୍ୟ ଓ ତଥ୍ୟ',
    'Officer Login Portal': 'ଅଧିକାରୀ ଲଗଇନ୍ ପୋର୍ଟାଲ୍',
  },
  as: {
    Dashboard: 'ড্যাশবোর্ড',
    'Groundwater Map': 'ভূগৰ্ভস্থ পানীৰ মানচিত্ৰ',
    'Forecast & Predictions': 'পূৰ্বানুমান আৰু অনুমান',
    'Anomalies & Triage': 'আশংকা সকীয়নি',
    'Anomaly Detection': 'অস্বাভাৱিক হ্ৰাস চিনাক্তকৰণ',
    'Crop & Irrigation Advice': 'শস্য আৰু জলসিঞ্চন পৰামৰ্শ',
    'Crop Advisor': 'শস্য পৰামৰ্শদাতা',
    'Regional Analytics': 'আঞ্চলিক বিশ্লেষণ',
    'WhatsApp AI Assistant': 'হোৱাটছএপ এআই সহায়ক',
    'WhatsApp Farmer': 'হোৱাটছএপ কৃষক সেৱা',
    'Help & Knowledge Base': 'সহায় আৰু তথ্য কেন্দ্ৰ',
    'Help & Knowledge': 'সহায় আৰু তথ্য',
    'Officer Login Portal': 'বিষয়া লগইন প’ৰ্টেল',
  },
  ur: {
    Dashboard: 'ڈیش بورڈ',
    'Groundwater Map': 'زیر زمین پانی کا نقشہ',
    'Forecast & Predictions': 'پیشگوئی اور تخمینے',
    'Anomalies & Triage': 'خطرے کی تنبیہات',
    'Anomaly Detection': 'غیر معمولی کمی کی نشاندہی',
    'Crop & Irrigation Advice': 'فصل اور آبپاشی کی ہدایت',
    'Crop Advisor': 'فصل کا مشیر',
    'Regional Analytics': 'علاقائی تجزیہ',
    'WhatsApp AI Assistant': 'واٹس ایپ اے آئی اسسٹنٹ',
    'WhatsApp Farmer': 'واٹس ایپ کسان سروس',
    'Help & Knowledge Base': 'مدد اور معلومات مرکز',
    'Help & Knowledge': 'مدد اور معلومات',
    'Officer Login Portal': 'آفیسر لاگ ان پورٹل',
  },
};

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

  const tFunc = (key: any): string => {
    if (!key) return '';
    const strKey = String(key);

    // 1. Check UI_DICTIONARIES for exact navigation / header UI key string
    const targetUiDict = UI_DICTIONARIES[currentLanguage] || UI_DICTIONARIES['en'];
    if (targetUiDict && targetUiDict[strKey]) {
      return targetUiDict[strKey];
    }

    // 2. Check i18n t() resolver for standard TranslationKey
    const i18nResult = tI18n(strKey as TranslationKey, currentLanguage);
    if (i18nResult && i18nResult !== strKey) {
      return i18nResult;
    }

    // 3. Fall back to English UI dictionary or raw key string
    return UI_DICTIONARIES['en']?.[strKey] || strKey;
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

