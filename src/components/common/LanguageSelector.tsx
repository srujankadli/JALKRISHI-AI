import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs shadow-2xs transition-all cursor-pointer"
        aria-expanded={isOpen}
        aria-label="Select preferred language"
      >
        <Globe className="h-3.5 w-3.5 text-teal-600 shrink-0" />
        <span className="font-semibold hidden sm:inline">{selectedLang.nativeName}</span>
        <span className="text-[10px] text-stone-600 uppercase font-mono sm:hidden font-bold">{selectedLang.code}</span>
        <span className="text-[10px] text-stone-600 uppercase font-mono hidden sm:inline">({selectedLang.code})</span>
        <ChevronDown className={`h-3 w-3 text-stone-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-stone-200 shadow-xl z-50 py-2 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-600 border-b border-stone-100">
            Select Language (13 Supported)
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50/60 transition-colors ${
                  isSelected ? 'bg-teal-50 text-teal-900 font-black' : 'text-stone-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{lang.nativeName}</span>
                  <span className="text-[10px] text-stone-600">({lang.name})</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-teal-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
