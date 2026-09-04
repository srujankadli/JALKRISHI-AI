import React from 'react';
import { ArrowUpRight, Battery, Wifi, AlertTriangle, Clock } from 'lucide-react';
import type { DWLRStation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { getTrendDetails } from '../../utils/statusHelpers';
import { formatDepth, formatDaysToCritical } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface StationCardProps {
  station: DWLRStation;
  onSelect?: (station: DWLRStation) => void;
  isSelected?: boolean;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onSelect,
  isSelected = false,
}) => {
  const { t } = useLanguage();
  const trend = getTrendDetails(station.trend);

  return (
    <div
      onClick={() => onSelect?.(station)}
      className={`group relative rounded-xl border bg-white p-4.5 shadow-subtle transition-all duration-200 hover:shadow-card ${
        isSelected
          ? 'border-agri-600 ring-2 ring-agri-600/20'
          : 'border-stone-200 hover:border-stone-300'
      } cursor-pointer`}
    >
      {/* Top row: Status and Station Code */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={station.status} size="sm" />
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-stone-600">
            {station.stationCode}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-400">
          <span title={t('Telemetry Online')} className="flex items-center">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
          </span>
          <div className="flex items-center gap-0.5 text-[11px] font-medium text-stone-500">
            <Battery className="h-3.5 w-3.5" />
            <span>{station.batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* Station Name and Location */}
      <div className="mt-2.5">
        <h3 className="text-base font-bold text-stone-900 group-hover:text-agri-800 transition-colors line-clamp-1">
          {station.stationName}
        </h3>
        <p className="text-xs text-stone-500">
          {station.district}, {station.state} &bull; {t('Block:')} {station.block}
        </p>
      </div>

      {/* Water Depth and Trend Highlight */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-lg bg-stone-50 p-2.5 border border-stone-100">
        <div>
          <span className="text-[11px] font-medium text-stone-500">{t('Depth to Water')}</span>
          <p className="text-lg font-extrabold text-stone-900">
            {formatDepth(station.waterLevel)}
            <span className="ml-1 text-[11px] font-normal text-stone-500">mbgl</span>
          </p>
        </div>

        <div>
          <span className="text-[11px] font-medium text-stone-500">{t('Trend')}</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${trend.color}`}>
              {trend.arrow} {t(trend.label)}
            </span>
          </div>
        </div>
      </div>

      {/* Farmer Summary Note */}
      {station.farmerSummary && (
        <p className="mt-2.5 text-xs text-stone-700 line-clamp-2">
          <span className="font-semibold text-agri-900">{t('Summary:')} </span>
          {t(station.farmerSummary)}
        </p>
      )}

      {/* Days to Critical indicator */}
      {station.daysToCritical !== null && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800 border border-rose-100">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          <span>{formatDaysToCritical(station.daysToCritical)}</span>
        </div>
      )}

      {/* Footer / CTA */}
      <div className="mt-3.5 flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs">
        <span className="inline-flex items-center gap-1 text-stone-400">
          <Clock className="h-3 w-3" />
          {t(station.lastUpdated)}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-agri-700 group-hover:text-agri-900">
          {t('View Station Details')}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </div>
  );
};
