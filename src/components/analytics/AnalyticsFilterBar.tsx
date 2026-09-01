import React from 'react';
import { Filter, RotateCcw, LayoutGrid, BarChart2 } from 'lucide-react';
import type { StationStatus, TrendDirection } from '../../types';

interface AnalyticsFilterBarProps {
  states: string[];
  districts: string[];
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedStatus: StationStatus | 'all';
  onStatusChange: (status: StationStatus | 'all') => void;
  selectedRisk: 'all' | 'low' | 'medium' | 'high' | 'critical';
  onRiskChange: (risk: 'all' | 'low' | 'medium' | 'high' | 'critical') => void;
  selectedTrend: TrendDirection | 'all';
  onTrendChange: (trend: TrendDirection | 'all') => void;
  timeframe: '7d' | '30d' | '90d';
  onTimeframeChange: (tf: '7d' | '30d' | '90d') => void;
  viewMode: 'analyst' | 'simple';
  onViewModeChange: (mode: 'analyst' | 'simple') => void;
  totalFiltered: number;
  totalStations: number;
  onReset: () => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  states,
  districts,
  selectedState,
  onStateChange,
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange,
  selectedRisk,
  onRiskChange,
  selectedTrend,
  onTrendChange,
  timeframe,
  onTimeframeChange,
  viewMode,
  onViewModeChange,
  totalFiltered,
  totalStations,
  onReset,
}) => {
  const isFiltered =
    selectedState !== 'All States' ||
    selectedDistrict !== 'All Districts' ||
    selectedStatus !== 'all' ||
    selectedRisk !== 'all' ||
    selectedTrend !== 'all';

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-3.5">
      {/* Row 1: Geographic & Timeframe Filters + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* State & District Selectors */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
            <Filter className="h-3.5 w-3.5 text-agri-700" />
            <span>Region:</span>
          </div>

          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className="rounded-xl border border-stone-300 bg-stone-50/80 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
          >
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="rounded-xl border border-stone-300 bg-stone-50/80 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
          >
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe & Mode Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Switcher */}
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-semibold">
            {(['7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTimeframeChange(t)}
                className={`rounded px-2.5 py-1 transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Simple vs Analyst */}
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => onViewModeChange('simple')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition-all cursor-pointer ${
                viewMode === 'simple'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span>Simple</span>
            </button>
            <button
              onClick={() => onViewModeChange('analyst')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition-all cursor-pointer ${
                viewMode === 'analyst'
                  ? 'bg-agri-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart2 className="h-3 w-3" />
              <span>Analyst View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Status, Risk, and Trend Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-stone-100 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-stone-400 font-bold text-[11px]">Status:</span>
            {(['all', 'healthy', 'moderate', 'warning', 'critical'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  selectedStatus === s
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1">
            <span className="text-stone-400 font-bold text-[11px]">Risk:</span>
            {(['all', 'low', 'medium', 'high', 'critical'] as const).map((r) => (
              <button
                key={r}
                onClick={() => onRiskChange(r)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  selectedRisk === r
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>

          {/* Trend Filter */}
          <div className="flex items-center gap-1">
            <span className="text-stone-400 font-bold text-[11px]">Trend:</span>
            {(['all', 'rising', 'stable', 'falling'] as const).map((tr) => (
              <button
                key={tr}
                onClick={() => onTrendChange(tr)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  selectedTrend === tr
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tr === 'all' ? 'All' : tr === 'rising' ? '↑ Rising' : tr === 'falling' ? '↓ Falling' : '→ Stable'}
              </button>
            ))}
          </div>
        </div>

        {/* Counter & Reset */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-stone-500">
            <strong className="text-stone-900 font-bold">{totalFiltered.toLocaleString('en-IN')}</strong> of {totalStations.toLocaleString('en-IN')} wells
          </span>

          {isFiltered && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
