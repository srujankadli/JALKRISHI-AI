import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { Search, Filter, RotateCcw, Tag } from 'lucide-react';
import type { AnomalyCategory, AnomalySeverity } from '../../types';

interface AnomalyFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: 'all' | AnomalyCategory) => void;
  selectedSeverity: string;
  onSeverityChange: (sev: 'all' | AnomalySeverity) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  statesList: string[];
  totalFiltered: number;
  totalAnomalies: number;
  onReset: () => void;
}

export const AnomalyFilterBar: React.FC<AnomalyFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSeverity,
  onSeverityChange,
  selectedState,
  onStateChange,
  statesList,
  totalFiltered,
  totalAnomalies,
  onReset,
}) => {
  const { t } = useLanguage();
  const isFiltered =
    searchQuery !== '' ||
    selectedCategory !== 'all' ||
    selectedSeverity !== 'all' ||
    (selectedState !== 'All States' && selectedState !== 'All India');

  const categories: { id: 'all' | AnomalyCategory; label: string }[] = [
    { id: 'all', label: 'All Types' },
    { id: 'Sudden Drop', label: 'Sudden Drop' },
    { id: 'Possible Extraction', label: 'Abnormal Extraction' },
    { id: 'Missing Data', label: 'Missing Data' },
    { id: 'Sensor Issue', label: 'Sensor Issue' },
    { id: 'Sudden Rise', label: 'Sudden Rise' },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-3">
      {/* Row 1: Search & State Filter */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Instant Search Bar */}
        <div className="relative sm:col-span-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('Search anomalies by station code, village name, district, or category...')}
            className="w-full rounded-xl border border-stone-300 bg-stone-50/80 py-2.5 pl-10 pr-4 text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:border-agri-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* State Selector */}
        <div className="sm:col-span-4">
          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-stone-50/80 py-2.5 px-3 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
          >
            {statesList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
        <span className="font-bold text-stone-500 flex items-center gap-1 mr-1">
          <Tag className="h-3.5 w-3.5 text-stone-400" />
          Category:
        </span>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onCategoryChange(c.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedCategory === c.id
                ? 'bg-agri-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Row 3: Severity Filter Pills & Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-stone-500 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            Severity:
          </span>

          {(
            [
              { id: 'all', label: 'All Severities' },
              { id: 'critical', label: '🔴 Critical' },
              { id: 'high', label: '🟠 High' },
              { id: 'warning', label: '🟡 Warning' },
              { id: 'info', label: 'ℹ️ Info / Low' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => onSeverityChange(s.id as any)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                selectedSeverity === s.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-stone-500">
            Showing <strong className="text-stone-900">{totalFiltered}</strong> of {totalAnomalies} alerts
          </span>

          {isFiltered && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{t('Clear')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
