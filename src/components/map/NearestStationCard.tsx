import React from 'react';
import { MapPin, Navigation, ArrowRight, X, Sprout } from 'lucide-react';
import type { DWLRStation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatDepth } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface NearestStationCardProps {
  nearest: { station: DWLRStation; distanceKm: number } | null;
  onClose: () => void;
  onViewStation: (station: DWLRStation) => void;
  onPanToStation: (station: DWLRStation) => void;
  onNavigateToCropAdvisor?: () => void;
}

export const NearestStationCard: React.FC<NearestStationCardProps> = ({
  nearest,
  onClose,
  onViewStation,
  onPanToStation,
  onNavigateToCropAdvisor,
}) => {
  const { t } = useLanguage();
  if (!nearest) return null;
  const { station, distanceKm } = nearest;

  return (
    <div className="rounded-2xl border-2 border-agri-600 bg-gradient-to-br from-agri-50/90 via-white to-white p-5 shadow-elevated animate-fadeIn relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        title={t('Dismiss nearest station')}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header Tag */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-agri-700 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
          <Navigation className="h-3 w-3" />
          {t('Nearest DWLR Station')} ({distanceKm} km {t('away')})
        </span>
        <StatusBadge status={station.status} size="sm" />
      </div>

      {/* Station Name and Location */}
      <div className="mt-2.5">
        <h3 className="text-lg font-black text-stone-900 leading-snug">
          {station.stationName}
        </h3>
        <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
          <MapPin className="h-3.5 w-3.5 text-stone-400" />
          {station.block} {t('Block')} &bull; {station.district}, {station.state} &bull;{' '}
          <span className="font-mono text-stone-700 font-semibold">{station.stationCode}</span>
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl bg-white p-3 border border-stone-200 text-xs">
        <div>
          <span className="text-[10px] text-stone-500 font-semibold block">{t('Water Depth')}</span>
          <strong className="text-base font-extrabold text-stone-900">
            {formatDepth(station.waterLevel)}
          </strong>
        </div>

        <div>
          <span className="text-[10px] text-stone-500 font-semibold block">{t('Aquifer Risk')}</span>
          <strong className="text-base font-extrabold text-stone-900">
            {Math.round(station.riskScore * 100)}/100
          </strong>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-stone-500 font-semibold block">{t('Depletion Trend')}</span>
          <span className="text-xs font-bold text-rose-700 block">
            {station.trend === 'falling' ? `↓ ${t('Falling')}` : station.trend === 'rising' ? `↑ ${t('Rising')}` : `→ ${t('Stable')}`}
          </span>
        </div>
      </div>

      {/* Farmer Advice */}
      {station.farmerSummary && (
        <div className="mt-3 rounded-lg bg-agri-100/60 p-2.5 text-xs text-agri-950 border border-agri-200">
          <strong>🌾 {t('Farmer Insight')}: </strong>
          {station.farmerSummary}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
        <button
          onClick={() => onViewStation(station)}
          className="inline-flex items-center gap-1 rounded-xl bg-agri-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-agri-800 active:scale-95 transition-all cursor-pointer"
        >
          <span>{t('View Station Details')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => onPanToStation(station)}
          className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
        >
          <MapPin className="h-3.5 w-3.5 text-stone-500" />
          <span>{t('Center on Map')}</span>
        </button>

        {onNavigateToCropAdvisor && (
          <button
            onClick={onNavigateToCropAdvisor}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-all cursor-pointer ml-auto"
          >
            <Sprout className="h-3.5 w-3.5 text-emerald-700" />
            <span>{t('Get Crop Advice')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
