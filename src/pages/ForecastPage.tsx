import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Radio,
  Satellite,
  Clock,
  Waves,
  TrendingDown,
  TrendingUp,
  Minus,
  Sprout,
  CheckCircle2,
  MapPin,
  Info,
  ShieldCheck,
  Droplets,
  Edit3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { LocationForecast } from '../types';
import { forecastService } from '../services/forecastService';
import { ChartCard } from '../components/common/ChartCard';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';

export const ForecastPage: React.FC = () => {
  const { t } = useLanguage();
  const {
    location: farmLocation,
    resolvedLocation,
    profile,
    nearestStation,
    isDirectObservation,
    setFarmLocation,
  } = useFarm();

  const [forecast, setForecast] = useState<LocationForecast | null>(null);
  const [horizonDays, setHorizonDays] = useState<7 | 30 | 60 | 90>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [locationInput, setLocationInput] = useState<string>(farmLocation || '');

  // Active Request Counter to discard stale async responses during rapid location changes
  const activeRequestIdRef = useRef<number>(0);

  // Fetch forecast whenever farmLocation, resolvedLocation, profile, or horizonDays change
  useEffect(() => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);

    async function loadForecast() {
      try {
        const result = await forecastService.getForecastForLocation(
          farmLocation || undefined,
          resolvedLocation?.latitude,
          resolvedLocation?.longitude,
          horizonDays,
          {
            crop: profile.crop || undefined,
            waterSources: profile.waterSources,
            groundwaterDependence: profile.groundwaterDependence || undefined,
            waterReliability: profile.waterReliability || undefined,
          }
        );

        // Guard against race conditions: only update if this is the newest request
        if (requestId === activeRequestIdRef.current) {
          setForecast(result);
          setIsLoading(false);
        }
      } catch {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadForecast();
  }, [farmLocation, resolvedLocation, horizonDays, profile]);

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locationInput.trim()) {
      setForecast(null);
      setIsLoading(true);
      await setFarmLocation(locationInput.trim());
      setIsEditingLocation(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    if (urgency.includes('0–7') || urgency.includes('Critical')) {
      return {
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-600',
        label: t('Critical Alert (0–7 Days)'),
      };
    }
    if (urgency.includes('8–30') || urgency.includes('High')) {
      return {
        bg: 'bg-orange-100 text-orange-800 border-orange-200',
        dot: 'bg-orange-500',
        label: t('High Attention (8–30 Days)'),
      };
    }
    if (urgency.includes('31–60') || urgency.includes('Watch')) {
      return {
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: t('Watch Zone (31–60 Days)'),
      };
    }
    return {
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
      label: t('Lower Risk / Safe Reserve (60+ Days)'),
    };
  };

  const activePoints = forecast?.forecastPoints || [];
  const currentDepthVal = forecast?.currentLevel ?? (isDirectObservation ? nearestStation?.station.waterLevel : undefined);
  const endDepthVal = forecast?.projectedLevelEnd ?? forecast?.projectedLevel30d ?? (currentDepthVal !== undefined ? currentDepthVal + 0.3 : undefined);
  const netChange = currentDepthVal !== undefined && endDepthVal !== undefined ? endDepthVal - currentDepthVal : 0;
  const isFalling = netChange > 0.05;
  const isRising = netChange < -0.05;
  const urgencyStyle = getUrgencyBadge(forecast?.daysToCriticalUrgency || 'Safe');

  if (!farmLocation || !resolvedLocation || !resolvedLocation.is_resolved) {
    return (
      <div className="space-y-6 animate-fadeIn pb-8 select-none max-w-4xl mx-auto mt-6">
        <div className="overflow-hidden rounded-3xl border-2 border-agri-200 bg-gradient-to-br from-agri-50/80 via-white to-water-50/50 p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-agri-100 text-agri-700 mb-4">
            <MapPin className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-stone-900">
            {t('Enter your farm location to view forward groundwater forecasts')}
          </h2>
          <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            {t("We couldn't verify that location. Please enter a valid village, town, city, district, state, or 6-digit PIN code.")}
          </p>

          <form onSubmit={handleLocationSubmit} className="mt-6 flex flex-col sm:flex-row items-stretch justify-center gap-2.5 max-w-md mx-auto">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder={t('e.g. Nashik, Pune, Kochi, Jaipur, Ballari...')}
                className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-agri-600 focus:outline-none focus:ring-2 focus:ring-agri-500/20 shadow-sm"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-agri-700 px-6 py-3 text-sm font-bold text-white hover:bg-agri-800 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? t('Locating...') : t('View Forecast')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8 select-none">
      {/* 0. Top Provenance & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-agri-600 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            {t('JalKrishi Predictive Groundwater Forecasting')}
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-600 font-medium">
            {forecast?.evidenceMode === 'DIRECT_DWLR'
              ? t('Nearby DWLR Telemetry Model')
              : forecast?.evidenceMode === 'REGIONAL_NEARBY_EVIDENCE'
              ? t('Regional DWLR Evidence Model')
              : t('Satellite-Assisted Model')}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-agri-600" />
          {t('JalKrishi Reference Simulation Dataset')}
        </span>
      </div>

      {/* 1. Location-Aware Header with Quick Location Switcher */}
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-agri-900 via-stone-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-agri-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-agri-500/20 border border-agri-400/30 px-3 py-1 text-xs font-bold text-agri-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t('Personalized Groundwater Forecast')}
              </span>

              {forecast?.evidenceMode === 'DIRECT_DWLR' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {t('Direct DWLR Evidence (≤ 15 km)')}
                </span>
              ) : forecast?.evidenceMode === 'REGIONAL_NEARBY_EVIDENCE' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                  <Satellite className="h-3 w-3" />
                  {t('Regional Nearby Evidence (15–35 km)')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/30 px-2.5 py-0.5 text-xs font-bold text-purple-300">
                  <Satellite className="h-3 w-3" />
                  {t('Satellite-Assisted Outlook (> 35 km)')}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>{t('Water Forecast for')}</span>
              <span className="text-agri-400 underline decoration-agri-500/50 underline-offset-4">
                {resolvedLocation?.district || farmLocation || t('My Farm')}
              </span>
              {resolvedLocation?.state && (
                <span className="text-sm font-normal text-stone-300">
                  ({resolvedLocation.state})
                </span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-medium">
              {t('Deterministic hydrogeological projection estimating water table movement and critical suction margin over the next 7 to 90 days.')}
            </p>
          </div>

          {/* Quick Location Change in Header */}
          <div className="shrink-0 bg-stone-900/80 border border-stone-700/80 p-3.5 rounded-2xl backdrop-blur-md space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              {t('Active Farm Location')}
            </span>
            {isEditingLocation ? (
              <form onSubmit={handleLocationSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder={t('e.g. Nashik, Kochi, Jaipur')}
                  className="rounded-lg bg-stone-950 border border-agri-400/50 px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded-lg bg-agri-600 hover:bg-agri-500 px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  {t('Save')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingLocation(false)}
                  className="rounded-lg border border-stone-700 px-2 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-agri-400 shrink-0" />
                  <span className="text-sm font-bold text-white line-clamp-1">
                    {resolvedLocation?.district || farmLocation || t('Not Set')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLocationInput(farmLocation || '');
                    setIsEditingLocation(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1 text-xs font-semibold text-stone-200 hover:bg-stone-700 hover:text-white transition-all cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{t('Change')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Localized Forecast Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Water Table Horizon */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Projected Water Table')}
            </span>
            <Waves className="h-4 w-4 text-water-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {isLoading ? '...' : endDepthVal ? `${endDepthVal.toFixed(1)}` : '--'}
              </span>
              <span className="text-xs font-bold text-stone-500">m mbgl</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {currentDepthVal !== undefined
                ? `${t('Baseline today')}: ${currentDepthVal.toFixed(1)} m mbgl`
                : t('Inferred regional baseline')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600">{t('Expected Shift')}:</span>
            <span
              className={`font-bold font-mono ${
                isFalling ? 'text-rose-600' : isRising ? 'text-emerald-600' : 'text-stone-700'
              }`}
            >
              {netChange > 0 ? `+${netChange.toFixed(2)}m (Decline)` : netChange < 0 ? `${netChange.toFixed(2)}m (Recharge)` : 'Stable'}
            </span>
          </div>
        </div>

        {/* Card 2: Days to Critical Margin */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Days to Critical Limit')}
            </span>
            <Clock className="h-4 w-4 text-stone-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {isLoading
                  ? '...'
                  : forecast?.projectedDaysToCritical !== null && forecast?.projectedDaysToCritical !== undefined
                  ? `${forecast.projectedDaysToCritical} Days`
                  : t('60+ Days / Safe')}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {t('Threshold margin to 25.0 mbgl suction depth')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${urgencyStyle.dot}`} />
            <span className="text-[11px] font-bold text-stone-700 truncate">
              {urgencyStyle.label}
            </span>
          </div>
        </div>

        {/* Card 3: Seasonal Depletion Velocity */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Depletion Velocity')}
            </span>
            {isFalling ? (
              <TrendingDown className="h-4 w-4 text-rose-600" />
            ) : isRising ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <Minus className="h-4 w-4 text-stone-600" />
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {isLoading
                  ? '...'
                  : forecast?.dailyChangeM !== undefined
                  ? `${(forecast.dailyChangeM * 30).toFixed(2)}`
                  : '+0.15'}
              </span>
              <span className="text-xs font-bold text-stone-500">m / month</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {isFalling
                ? t('Seasonal aquifer drawdown active')
                : isRising
                ? t('Aquifer table rising from recharge')
                : t('Steady hydrostatic equilibrium')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600">{t('Risk Band')}:</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                forecast?.forecastRisk === 'critical'
                  ? 'bg-rose-100 text-rose-800'
                  : forecast?.forecastRisk === 'worsening'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {forecast?.forecastRisk || 'Moderate'}
            </span>
          </div>
        </div>

        {/* Card 4: Farm Water Profile Alignment */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Farm Profile Factors')}
            </span>
            <Sprout className="h-4 w-4 text-agri-600" />
          </div>
          <div className="mt-3">
            <p className="text-sm font-bold text-stone-900 line-clamp-1">
              {profile.crop ? `🌾 ${profile.crop}` : t('No crop selected')}
            </p>
            <p className="text-xs text-stone-500 mt-1 line-clamp-1">
              {profile.waterSources && profile.waterSources.length > 0
                ? `💧 ${profile.waterSources.join(', ')}`
                : profile.facilities && profile.facilities.length > 0
                ? `💧 ${profile.facilities.join(', ')}`
                : t('Borewell / Open Well')}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100">
            <Link
              to="/crops"
              className="text-xs font-bold text-agri-700 hover:text-agri-800 inline-flex items-center gap-1"
            >
              <span>{t('Manage Profile & Crops')} &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Primary Interactive Groundwater Forecast Curve Card */}
      <ChartCard
        title={t('Groundwater Forecast Curve & Demonstration Uncertainty Bounds')}
        subtitle={`${t('Forward trajectory for')} ${resolvedLocation?.district || farmLocation || 'My Farm'} (${horizonDays} ${t('day horizon')})`}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-agri-100 px-2.5 py-0.5 text-xs font-bold text-agri-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('Model Confidence')}: {forecast ? Math.round(forecast.confidenceScore * 100) : 88}%
          </span>
        }
        actions={
          <div className="flex items-center rounded-xl border border-stone-200 bg-stone-100 p-0.5 text-xs font-bold">
            {([7, 30, 60, 90] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizonDays(h)}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  horizonDays === h
                    ? 'bg-agri-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {h}D
              </button>
            ))}
          </div>
        }
      >
        <div className="h-80 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs font-semibold text-stone-400">
              <span className="animate-pulse">{t('Recalculating forward groundwater trajectory...')}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activePoints} margin={{ top: 10, right: 25, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUncertainty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  reversed={true}
                  domain={['dataMin - 0.5', 'dataMax + 0.8']}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-extrabold text-stone-900 border-b border-stone-100 pb-1">
                            {d.date} {d.change_label && `(${d.change_label})`}
                          </p>
                          <p className="font-bold text-agri-700">
                            {t('Predicted Depth')}: {d.predictedLevel} m mbgl
                          </p>
                          <p className="text-stone-500 text-[11px]">
                            {t('Uncertainty Envelope')}: {d.lowerConfidence}m — {d.upperConfidence}m
                          </p>
                          <p className="text-water-700 text-[11px] font-semibold">
                            {t('Est. Rainfall')}: {d.expectedRainfallMm} mm
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                {/* Upper & Lower Confidence Area Band */}
                <Area
                  type="monotone"
                  dataKey="upperConfidence"
                  stroke="transparent"
                  fill="url(#colorUncertainty)"
                  name={t('Uncertainty Range')}
                />
                <Area
                  type="monotone"
                  dataKey="lowerConfidence"
                  stroke="transparent"
                  fill="#ffffff"
                  legendType="none"
                />

                {/* Baseline & Predicted Line */}
                <Line
                  type="monotone"
                  dataKey="predictedLevel"
                  name={t('Projected Water Depth (m mbgl)')}
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0f766e' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* 4. Personalized Agronomic Guidance & Farm Water Profile Notes */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Sprout className="h-5 w-5 text-agri-700" />
          <h3 className="text-base font-bold text-stone-900">
            {t('Personalized Agronomic Water Advisory')}
          </h3>
        </div>

        {/* Primary Hydrological Guidance */}
        <div className="rounded-xl border border-agri-200 bg-agri-50/60 p-4 text-xs text-agri-950 font-medium leading-relaxed">
          <p className="font-bold text-agri-900 text-sm mb-1">
            📢 {t('Hydrological Action Summary')}
          </p>
          {forecast?.farmerGuidance || t('Water table expected to maintain seasonal stability. Calibrate irrigation hours based on soil moisture.')}
        </div>

        {/* Contextual Farm Profile Implications */}
        {forecast?.personalizedProfileNotes && forecast.personalizedProfileNotes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Specific Guidance for Your Farm Profile')}
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {forecast.personalizedProfileNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-xs text-stone-700 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-agri-600 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            to="/crops"
            className="inline-flex items-center gap-2 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-xs px-4 py-2.5 shadow-xs transition-all"
          >
            <Sprout className="h-4 w-4" />
            <span>{t('View Water-Smart Crop Recommendations')}</span>
          </Link>
          <Link
            to="/whatsapp"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs px-4 py-2.5 shadow-xs transition-all"
          >
            <Droplets className="h-4 w-4 text-water-600" />
            <span>{t('Simulate WhatsApp Farmer Alert')}</span>
          </Link>
        </div>
      </div>

      {/* 5. Scientific Provenance & Demonstration Disclaimer */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-xs text-stone-500 space-y-2">
        <div className="flex items-center gap-2 text-stone-700 font-bold">
          <Info className="h-4 w-4 text-stone-500" />
          <span>{t('Forecast Provenance & Scientific Methodology')}</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          {forecast?.provenanceLabel || t('Regional groundwater forecast based on nearby evidence.')}
          {' '}{t('Trajectory calculated using linear trend extrapolation of seasonal depletion velocity and simulated rainfall recharge infiltration with expanding uncertainty boundaries.')}
        </p>
        <p className="text-[10px] text-stone-400 font-medium">
          {t('JalKrishi Reference Simulation Model • Not a direct borehole measurement on your individual plot.')}
        </p>
      </div>
    </div>
  );
};

