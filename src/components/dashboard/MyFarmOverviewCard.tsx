import React, { useState } from 'react';
import {
  MapPin,
  Waves,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Info,
  Edit3,
  Radio,
  Satellite,
  Layers,
  Sprout,
  Calendar,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarm } from '../../context/FarmContext';
import { Link } from 'react-router-dom';
import type { DWLRStation } from '../../types';
import { FARMER_CONFIG } from '../../config/farmerConfig';

interface MyFarmOverviewCardProps {
  onOpenStation?: (station: DWLRStation) => void;
}

export const MyFarmOverviewCard: React.FC<MyFarmOverviewCardProps> = ({ onOpenStation }) => {
  const { t } = useLanguage();
  const {
    location,
    resolvedLocation,
    profile,
    nearbyStations,
    nearestStation,
    isDirectObservation,
    setFarmLocation,
  } = useFarm();

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState(location);

  if (!location) {
    return null;
  }

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocationInput.trim()) {
      await setFarmLocation(newLocationInput.trim());
      setIsEditingLocation(false);
    }
  };

  const primaryStation = nearestStation?.station;
  const waterDepth = isDirectObservation ? primaryStation?.waterLevel : null;
  const status = primaryStation?.status ?? 'moderate';
  const trend = primaryStation?.trend ?? 'stable';
  const daysToCritical = primaryStation?.daysToCritical;

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'healthy':
        return { bg: 'bg-emerald-500', text: 'text-emerald-800', lightBg: 'bg-emerald-50', border: 'border-emerald-200', label: t('Safe / Plentiful') };
      case 'warning':
        return { bg: 'bg-amber-500', text: 'text-amber-800', lightBg: 'bg-amber-50', border: 'border-amber-200', label: t('Moderate / Caution') };
      case 'critical':
        return { bg: 'bg-rose-500', text: 'text-rose-800', lightBg: 'bg-rose-50', border: 'border-rose-200', label: t('Critical / Depleting') };
      default:
        return { bg: 'bg-water-500', text: 'text-water-800', lightBg: 'bg-water-50', border: 'border-water-200', label: t('Moderate') };
    }
  };

  const statusConfig = getStatusColor(status);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {/* 1. Header Bar: Farm Location Badge & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-agri-100 text-agri-700">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-agri-700">
                {t('My Farm')}
              </span>
              {isDirectObservation ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
                  {t('Direct DWLR (≤ 15.0 km)')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-water-100 px-2 py-0.5 text-[11px] font-semibold text-water-800">
                  <Satellite className="h-3 w-3 text-water-600" />
                  {t('Regional Nearby Evidence')}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-stone-900">
              {resolvedLocation?.district || location}
              {resolvedLocation?.state && resolvedLocation.state !== resolvedLocation.district ? (
                <span className="text-sm font-normal text-stone-500 ml-1.5">({resolvedLocation.state})</span>
              ) : null}
            </h2>
          </div>
        </div>

        {/* Change Location Action */}
        <div className="flex items-center gap-2">
          {isEditingLocation ? (
            <form onSubmit={handleUpdateLocation} className="flex items-center gap-2">
              <input
                type="text"
                value={newLocationInput}
                onChange={(e) => setNewLocationInput(e.target.value)}
                placeholder={t('Enter village, town, or district')}
                className="rounded-lg border border-agri-300 px-3 py-1.5 text-sm focus:border-agri-600 focus:outline-none focus:ring-1 focus:ring-agri-600"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-lg bg-agri-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-agri-800"
              >
                {t('Save')}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
              >
                {t('Cancel')}
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setNewLocationInput(location);
                setIsEditingLocation(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              <Edit3 className="h-3.5 w-3.5 text-stone-500" />
              <span>{t('Change Location')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Situation Indicators */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Water Situation Status */}
        <div className={`rounded-xl border ${statusConfig.border} ${statusConfig.lightBg} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Water Situation')}
            </span>
            <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.bg}`} />
          </div>
          <p className={`mt-2 text-lg font-black ${statusConfig.text}`}>
            {statusConfig.label}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {isDirectObservation
              ? t('Local observation well within direct radius')
              : t('Regional spatial estimation')}
          </p>
        </div>

        {/* Card 2: Groundwater Depth */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Water Table Depth')}
            </span>
            <Waves className="h-4 w-4 text-water-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-stone-900">
            {waterDepth !== undefined && waterDepth !== null ? (
              <>{waterDepth.toFixed(1)} <span className="text-sm font-normal text-stone-500">m mbgl</span></>
            ) : (
              <span className="text-base">{t('Regional outlook only')}</span>
            )}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {isDirectObservation
              ? t('Nearby observation well; not a measurement from your borewell')
              : t('No direct observation within 15 km; do not treat this as a farm measurement')}
          </p>
        </div>

        {/* Card 3: Seasonal Trend */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Groundwater Trend')}
            </span>
            {trend === 'falling' ? (
              <TrendingDown className="h-4 w-4 text-rose-600" />
            ) : trend === 'rising' ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <Minus className="h-4 w-4 text-stone-600" />
            )}
          </div>
          <p className="mt-2 text-lg font-bold text-stone-900 capitalize">
            {t(trend === 'falling' ? 'Falling (-0.2 m/mo)' : trend === 'rising' ? 'Rising (+0.3 m/mo)' : 'Stable')}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {daysToCritical ? `${t('Days to watch threshold:')} ${daysToCritical}d` : t('Normal seasonal fluctuation')}
          </p>
        </div>

        {/* Card 4: Farm Water Profile Summary */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Farm Facilities')}
            </span>
            <Sprout className="h-4 w-4 text-agri-600" />
          </div>
          <p className="mt-2 text-sm font-bold text-stone-900 line-clamp-1">
            {profile.facilities.length > 0
              ? profile.facilities.join(', ').replace(/_/g, ' ')
              : t('Not added yet')}
          </p>
          <Link
            to="/crops"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-agri-700 hover:text-agri-800"
          >
            <span>{t('Manage Profile & Crops')}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 3. Nearby Monitoring Evidence Section */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-stone-600" />
            <h3 className="text-sm font-bold text-stone-900">
              {t('Nearby Monitoring Evidence')}
            </h3>
            <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
              ≤ {FARMER_CONFIG.NEARBY_EVIDENCE_RADIUS_KM} km
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {nearbyStations.length} {t('monitoring wells found in radius')}
          </span>
        </div>

        {nearbyStations.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {nearbyStations.map(({ station, distanceKm }) => (
              <div
                key={station.id}
                onClick={() => onOpenStation?.(station)}
                className="flex flex-col justify-between rounded-lg border border-stone-200 bg-stone-50/50 p-3 hover:border-agri-400 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-bold text-stone-900 text-sm line-clamp-1">
                      {station.stationName}
                    </p>
                    <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                      ~{distanceKm} km
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-1">
                    {station.block ? `${station.block}, ` : ''}{station.district}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-stone-200/60 pt-2 text-xs">
                  <span className="font-semibold text-stone-700">
                    {station.waterLevel.toFixed(1)} m mbgl
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      station.status === 'healthy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : station.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {station.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-water-200 bg-water-50/50 p-3 text-xs text-water-900">
            <Satellite className="h-5 w-5 text-water-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {t('Satellite-Assisted Regional Assessment Active')}
              </p>
              <p className="mt-0.5 text-water-800">
                {t('No physical DWLR station located within 35 km')} {nearestStation ? `(${t('nearest telemetry station is')} ~${nearestStation.distanceKm} km ${t('away')})` : ''}.
                {' '}{t('JalKrishi is utilizing inferred satellite-assisted groundwater estimates.')}
              </p>
            </div>
          </div>
        )}

        {/* Data Honesty Footnote */}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-500">
          <Info className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <span>
            {t('Nearby telemetry wells provide regional hydrogeological evidence and are not direct boreholes on your farm.')}
          </span>
        </p>
      </div>

      {/* 4. Quick Action Pills for Farmer */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/crops"
          className="inline-flex items-center gap-1.5 rounded-lg bg-agri-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-agri-800 shadow-sm transition-all"
        >
          <Sprout className="h-4 w-4" />
          <span>{t('Personalized Crop Advice')}</span>
        </Link>
        <Link
          to="/forecast"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all"
        >
          <Calendar className="h-4 w-4 text-stone-500" />
          <span>{t('30-Day Water Forecast')}</span>
        </Link>
        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all"
        >
          <Layers className="h-4 w-4 text-stone-500" />
          <span>{t('Explore Groundwater Map')}</span>
        </Link>
      </div>
    </div>
  );
};
