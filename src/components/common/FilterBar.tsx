import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { StationStatus } from '../../types';
import { mockStates } from '../../data/mockStations';

interface FilterBarProps {
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedStatus: StationStatus | 'all';
  onStatusChange: (status: StationStatus | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset?: () => void;
  totalResults?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedState,
  onStateChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  onReset,
  totalResults,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by station, district, state or code..."
            className="w-full rounded-lg border border-stone-300 bg-stone-50/50 py-2 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-agri-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-agri-600"
          />
        </div>

        {/* State select */}
        <div className="min-w-[160px]">
          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm text-stone-800 focus:border-agri-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-agri-600"
          >
            {mockStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'healthy', 'moderate', 'warning', 'critical'] as const).map((status) => {
            const isSelected = selectedStatus === status;
            const labels: Record<string, string> = {
              all: 'All',
              healthy: '🟢 Healthy',
              moderate: '🟡 Moderate',
              warning: '🟠 Warning',
              critical: '🔴 Critical',
            };

            return (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
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
      </div>

      {/* Results and reset */}
      <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2 lg:border-t-0 lg:pt-0">
        {totalResults !== undefined && (
          <span className="text-xs font-medium text-stone-500">
            Showing <strong className="text-stone-900">{totalResults}</strong> stations
          </span>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
