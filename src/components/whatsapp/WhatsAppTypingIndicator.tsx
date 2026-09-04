import { useLanguage } from '../../context/LanguageContext';
import React from 'react';

export const WhatsAppTypingIndicator: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 mb-3 animate-fadeIn">
      <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs border border-stone-200/80 flex items-center gap-1.5">
        <span className="text-xs text-stone-500 font-medium">{t('JalKrishi AI is typing')}</span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce"></span>
        </div>
      </div>
    </div>
  );
};
