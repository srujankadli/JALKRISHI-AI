import React from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { DWLRStation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { getTrendDetails } from '../../utils/statusHelpers';
import { formatDepth, formatDaysToCritical, formatRiskScore } from '../../utils/formatters';

interface StationPopupContentProps {
  station: DWLRStation;
  onViewDetails: (station: DWLRStation) => void;
}

export const StationPopupContent: React.FC<StationPopupContentProps> = ({
  station,
  onViewDetails,
}) => {
  const trend = getTrendDetails(station.trend);

  return (
    <div className="w-[280px] p-3.5 text-stone-900 bg-white font-sans">
      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <StatusBadge status={station.status} size="sm" />
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-600">
          {station.stationCode}
        </span>
      </div>

      {/* Station Name */}
      <div className="mt-2">
        <h4 className="text-sm font-bold text-stone-900 leading-tight">
          {station.stationName}
        </h4>
        <p className="text-[11px] text-stone-500">
          {station.district}, {station.state}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-lg bg-stone-50 p-2 border border-stone-100 text-xs">
        <div>
          <span className="text-[10px] text-stone-500 block">Water Depth</span>
          <span className="text-sm font-bold text-stone-900">
            {formatDepth(station.waterLevel)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-stone-500 block">Risk Score</span>
          <span className="text-sm font-bold text-stone-900">
            {formatRiskScore(station.riskScore)}
          </span>
        </div>
      </div>

      {/* Farmer Summary */}
      <div className="mt-2 text-[11px] text-stone-700 leading-snug">
        <p className="line-clamp-2">
          <span className="font-semibold text-agri-800">Trend: </span>
          {trend.farmerText}
        </p>
      </div>

      {/* Days to Critical alert */}
      {station.daysToCritical !== null && (
        <div className="mt-2 flex items-center gap-1 rounded bg-rose-50 p-1.5 text-[11px] font-semibold text-rose-800 border border-rose-100">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>{formatDaysToCritical(station.daysToCritical)}</span>
        </div>
      )}

      {/* CTA Button */}
      <div className="mt-3 pt-2 border-t border-stone-100">
        <button
          onClick={() => onViewDetails(station)}
          className="w-full flex items-center justify-center gap-1 rounded-lg bg-agri-700 py-1.5 px-3 text-xs font-semibold text-white shadow-xs hover:bg-agri-800 active:scale-95 transition-all"
        >
          <span>View Station Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
