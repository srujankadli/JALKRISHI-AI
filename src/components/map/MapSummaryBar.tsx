import React from 'react';
import { Radio, ShieldCheck, Droplets, TrendingDown, ShieldAlert } from 'lucide-react';
import type { DWLRStation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface MapSummaryBarProps {
  filteredStations: DWLRStation[];
  totalStationCount: number;
}

export const MapSummaryBar: React.FC<MapSummaryBarProps> = ({
  filteredStations,
  totalStationCount,
}) => {
  const { t } = useLanguage();
  const total = filteredStations.length;
  const healthy = filteredStations.filter((s) => s.status === 'healthy').length;
  const moderate = filteredStations.filter((s) => s.status === 'moderate').length;
  const warning = filteredStations.filter((s) => s.status === 'warning').length;
  const critical = filteredStations.filter((s) => s.status === 'critical').length;

  const avgDepth =
    total > 0
      ? (filteredStations.reduce((sum, s) => sum + s.waterLevel, 0) / total).toFixed(1)
      : '0.0';

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-3">
      {/* Top row: Network status & telemetry tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            {t('India DWLR Hydrostatic Network')}
          </span>
          <span className="rounded bg-water-50 border border-water-200 px-2 py-0.5 text-[10px] font-bold text-water-800">
            {t('Demo / Simulated Telemetry')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-stone-500 font-medium">
          <Radio className="h-3.5 w-3.5 text-stone-400" />
          <span>
            {t('Displaying')} <strong className="text-stone-900 font-bold">{total.toLocaleString('en-IN')}</strong> {t('of')}{' '}
            {totalStationCount.toLocaleString('en-IN')} {t('Stations')}
          </span>
        </div>
      </div>

      {/* Metric badges grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-xs">
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-2.5">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">{t('Avg Water Depth')}</span>
          <span className="text-base font-black text-stone-900">{avgDepth} mbgl</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-800">{t('Healthy')}</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <span className="text-base font-black text-emerald-950">
            {healthy.toLocaleString('en-IN')}{' '}
            <span className="text-[10px] font-normal text-emerald-700">
              ({total > 0 ? Math.round((healthy / total) * 100) : 0}%)
            </span>
          </span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-800">{t('Moderate')}</span>
            <Droplets className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <span className="text-base font-black text-amber-950">
            {moderate.toLocaleString('en-IN')}{' '}
            <span className="text-[10px] font-normal text-amber-700">
              ({total > 0 ? Math.round((moderate / total) * 100) : 0}%)
            </span>
          </span>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-orange-800">{t('Warning')}</span>
            <TrendingDown className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <span className="text-base font-black text-orange-950">
            {warning.toLocaleString('en-IN')}{' '}
            <span className="text-[10px] font-normal text-orange-700">
              ({total > 0 ? Math.round((warning / total) * 100) : 0}%)
            </span>
          </span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-800">{t('Critical')}</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <span className="text-base font-black text-rose-950">
            {critical.toLocaleString('en-IN')}{' '}
            <span className="text-[10px] font-normal text-rose-700">
              ({total > 0 ? Math.round((critical / total) * 100) : 0}%)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
