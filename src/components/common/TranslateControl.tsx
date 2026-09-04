import React, { useState } from 'react';
import { Languages, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../i18n';

interface TranslateControlProps {
  originalText?: string;
  className?: string;
  onToggle?: (isTranslated: boolean) => void;
  renderContent?: (isTranslated: boolean) => React.ReactNode;
}

export const TranslateControl: React.FC<TranslateControlProps> = ({
  className = '',
  onToggle,
  renderContent,
}) => {
  const { currentLanguage, t } = useLanguage();
  const [isTranslated, setIsTranslated] = useState(false);

  // If current language is English, no need for dynamic translate toggle
  if (currentLanguage === 'en') {
    return renderContent ? <>{renderContent(false)}</> : null;
  }

  const currentLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || {
    name: 'Hindi',
    nativeName: 'हिन्दी',
  };

  const handleToggle = () => {
    const nextState = !isTranslated;
    setIsTranslated(nextState);
    if (onToggle) {
      onToggle(nextState);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {renderContent && renderContent(isTranslated)}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-teal-800 shadow-2xs hover:bg-stone-50 hover:border-teal-300 transition-all cursor-pointer"
        >
          {isTranslated ? (
            <>
              <RotateCcw className="h-3 w-3 text-stone-500" />
              <span>{t('Show original')}</span>
            </>
          ) : (
            <>
              <Languages className="h-3 w-3 text-teal-600" />
              <span>
                {t('Translate to')} {currentLangConfig.nativeName}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
