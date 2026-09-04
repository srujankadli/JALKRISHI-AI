import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { Search, X } from 'lucide-react';

interface HelpSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matchCount?: number;
}

export const HelpSearchBar: React.FC<HelpSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  matchCount,
}) => {
  const { t } = useLanguage();
  return (
    <div className="relative rounded-2xl border border-stone-200 bg-white p-2 shadow-subtle flex items-center gap-2">
      <div className="pl-3 text-stone-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('Search FAQs, telemetry guides, forecasting, crop rules, or data sources...')}
        className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
      />
      {searchQuery && (
        <div className="flex items-center gap-2 pr-2">
          {typeof matchCount === 'number' && (
            <span className="text-[11px] font-bold text-agri-700 bg-agri-50 px-2 py-0.5 rounded-md border border-agri-200">
              {matchCount} found
            </span>
          )}
          <button
            onClick={() => onSearchChange('')}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
