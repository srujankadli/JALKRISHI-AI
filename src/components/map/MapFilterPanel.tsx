import React from 'react';
import { Filter, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { StationStatus, TrendDirection } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface MapFilterPanelProps {
  states: string[];
  districts: string[];
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedStatus: StationStatus | 'all';
  onStatusChange: (status: StationStatus | 'all') => void;
  selectedTrend: TrendDirection | 'all';
  onTrendChange: (trend: TrendDirection | 'all') => void;
  selectedRisk: 'all' | 'low' | 'medium' | 'high' | 'critical';
  onRiskChange: (risk: 'all' | 'low' | 'medium' | 'high' | 'critical') => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
  totalStationCount: number;
}

export const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
  states,
  districts,
  selectedState,
  onStateChange,
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange,
  selectedTrend,
  onTrendChange,
  selectedRisk,
  onRiskChange,
  onResetFilters,
  totalFilteredCount,
  totalStationCount,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const hasActiveFilters =
    (selectedState !== 'All States' && selectedState !== 'All India') ||
    selectedDistrict !== 'All Districts' ||
    selectedStatus !== 'all' ||
    selectedTrend !== 'all' ||
    selectedRisk !== 'all';

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-4">
      {/* Primary Row: State, District, Status Pills & Expand Toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* State & District Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 max-w-xl">
          {/* State Dropdown */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase block mb-1">
              {t('Select State')}
            </label>
            <select
              value={selectedState}
              onChange={(e) => onStateChange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/60 px-3 py-2 text-xs font-semibold text-stone-800 focus:border-agri-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-agri-600"
            >
              {states.map((st) => (
                <option key={st} value={st}>
                  {t(st)}
                </option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <label className="text-[11px] font-bold text-stone-500 uppercase block mb-1">
              {t('Select District')}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/60 px-3 py-2 text-xs font-semibold text-stone-800 focus:border-agri-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-agri-600"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {t(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'healthy', 'moderate', 'warning', 'critical'] as const).map((status) => {
              const isSelected = selectedStatus === status;
              const labels: Record<string, string> = {
                all: t('All'),
                healthy: `🟢 ${t('Healthy')}`,
                moderate: `🟡 ${t('Moderate')}`,
                warning: `🟠 ${t('Warning')}`,
                critical: `🔴 ${t('Critical')}`,
              };

              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>

          {/* Expand/Collapse Additional Filters Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-stone-500" />
            <span>{t('More Filters')}</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Secondary Row: Trend & Risk Filters (Expandable) */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100 pt-3 animate-fadeIn text-xs">
          {/* Trend Direction */}
          <div className="space-y-1.5">
            <span className="font-bold text-stone-600 block">{t('Water Trend:')}</span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'rising', 'stable', 'falling'] as const).map((trend) => (
                <button
                  key={trend}
                  onClick={() => onTrendChange(trend)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize cursor-pointer transition-all ${
                    selectedTrend === trend
                      ? 'bg-water-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {trend === 'rising' ? `↑ ${t('Rising')}` : trend === 'falling' ? `↓ ${t('Falling')}` : trend === 'stable' ? `→ ${t('Stable')}` : t('All Trends')}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Level */}
          <div className="space-y-1.5">
            <span className="font-bold text-stone-600 block">{t('Risk Severity Index:')}</span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'low', 'medium', 'high', 'critical'] as const).map((risk) => (
                <button
                  key={risk}
                  onClick={() => onRiskChange(risk)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize cursor-pointer transition-all ${
                    selectedRisk === risk
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {risk === 'all' ? t('All Risk Levels') : t(risk)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row: Results counter and Reset */}
      <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
        <span className="text-stone-500 font-medium">
          {t('Showing')} <strong className="text-stone-900 font-bold">{totalFilteredCount.toLocaleString('en-IN')}</strong> {t('of')} {totalStationCount.toLocaleString('en-IN')} {t('stations')}
        </span>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 text-stone-400" />
            <span>{t('Clear All Filters')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
