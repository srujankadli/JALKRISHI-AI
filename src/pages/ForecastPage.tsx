import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useOutletContext } from 'react-router-dom';
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
  ArrowLeft,
  CloudRain,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { LocationForecast, StationForecast, DWLRStation } from '../types';
import { forecastService } from '../services/forecastService';
import { ChartCard } from '../components/common/ChartCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import { OfficialForecastView } from '../components/forecast/OfficialForecastView';

export const ForecastPage: React.FC = () => {
  const { t } = useLanguage();
  const { isOfficial } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const stationIdParam = searchParams.get('stationId');

  const outletCtx = useOutletContext<{ onSelectStation?: (station: DWLRStation) => void } | null>();

  const {
    location: farmLocation,
    resolvedLocation,
    profile,
    nearestStation,
    isDirectObservation,
    setFarmLocation,
  } = useFarm();

  // Forecast States
  const [horizonDays, setHorizonDays] = useState<7 | 30 | 60 | 90>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [farmForecast, setFarmForecast] = useState<LocationForecast | null>(null);
  const [stationForecast, setStationForecast] = useState<StationForecast | null>(null);

  // Farm Location editing state
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [locationInput, setLocationInput] = useState<string>(farmLocation || '');

  // Active Request Counter to prevent race conditions during rapid param changes
  const activeRequestIdRef = useRef<number>(0);

  // Effect: Load either Station-Specific Forecast OR Farm-Location Forecast
  useEffect(() => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);

    async function loadData() {
      if (stationIdParam) {
        // Station-Specific Mode: Load ONLY this station's forecast context
        try {
          const result = await forecastService.getForecastForStation(stationIdParam, horizonDays);
          if (requestId === activeRequestIdRef.current) {
            setStationForecast(result);
            setIsLoading(false);
          }
        } catch {
          if (requestId === activeRequestIdRef.current) {
            setIsLoading(false);
          }
        }
      } else if (!isOfficial) {
        // Farm Location Mode: Load Location-Aware Forecast for Farmer
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

          if (requestId === activeRequestIdRef.current) {
            setFarmForecast(result);
            setIsLoading(false);
          }
        } catch {
          if (requestId === activeRequestIdRef.current) {
            setIsLoading(false);
          }
        }
      } else {
        setIsLoading(false);
      }
    }

    loadData();
  }, [stationIdParam, farmLocation, resolvedLocation, horizonDays, profile, isOfficial]);

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locationInput.trim()) {
      setFarmForecast(null);
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

  // =========================================================================
  // RENDER MODE A: STATION-SPECIFIC FORECAST MODE
  // =========================================================================
  if (stationIdParam) {
    if (!isLoading && !stationForecast) {
      return (
        <div className="space-y-6 animate-fadeIn pb-8 select-none max-w-4xl mx-auto mt-6">
          <div className="overflow-hidden rounded-3xl border-2 border-stone-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4">
              <Radio className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-stone-900">
              {t('Observation Station Not Found')}
            </h2>
            <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
              {t('No telemetry or forecast data was found for station ID:')}{' '}
              <code className="font-mono font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                {stationIdParam}
              </code>
              .{' '}{t('Please select a valid DWLR monitoring node from the network.')}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setSearchParams({})}
                className="inline-flex items-center gap-2 rounded-xl bg-agri-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-agri-800 transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isOfficial ? t('Return to Nationwide Overview') : t('Return to My Farm Forecast')}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isStationLoading = isLoading || !stationForecast;
    const activePoints = stationForecast?.forecastPoints || [];
    const currentDepthVal = stationForecast?.currentLevel;
    const endDepthVal = stationForecast?.projectedLevelEnd ?? stationForecast?.projectedLevel30d ?? (currentDepthVal !== undefined ? currentDepthVal + 0.3 : undefined);
    const netChange = currentDepthVal !== undefined && endDepthVal !== undefined ? endDepthVal - currentDepthVal : 0;
    const isFalling = netChange > 0.05;
    const isRising = netChange < -0.05;
    const urgencyStyle = getUrgencyBadge(stationForecast?.daysToCriticalUrgency || 'Safe');
    const monthlyRate = stationForecast?.monthlyChangeM ?? (stationForecast?.dailyChangeM ? stationForecast.dailyChangeM * 30 : 0.15);
    const criticalLimit = stationForecast?.criticalThreshold ?? 25.0;

    return (
      <div className="space-y-6 animate-fadeIn pb-8 select-none">
        {/* 0. Top Navigation & Telemetry Provenance Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1.5 font-bold text-agri-700 hover:text-agri-800 hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{isOfficial ? t('Back to Nationwide Forecast') : t('Back to My Farm Forecast')}</span>
            </button>
            <span className="text-stone-300">|</span>
            <span className="flex h-2 w-2 rounded-full bg-water-600 animate-pulse" />
            <span className="font-extrabold text-stone-900">
              {t('Station-Specific Hydrodynamic Forecast')}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
            <Radio className="h-3 w-3 text-water-600" />
            {t('JalKrishi Reference Simulation Dataset')}
          </span>
        </div>

        {/* 1. Station Identity Hero Banner */}
        <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-900 via-water-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-water-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-water-500/20 border border-water-400/30 px-3 py-1 text-xs font-bold text-water-300">
                  <Waves className="h-3.5 w-3.5" />
                  {t('DWLR Observation Well Forecast')}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 border border-stone-700 px-2.5 py-0.5 text-xs font-mono text-stone-300">
                  ID: {stationForecast?.stationId || stationIdParam}
                </span>

                {stationForecast?.currentStatus && (
                  <StatusBadge status={stationForecast.currentStatus as any} size="sm" />
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
                <span>{stationForecast?.stationName || t('Observation Station')}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-stone-300 font-medium">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-water-400" />
                  {stationForecast?.block ? `${stationForecast.block}, ` : ''}
                  {stationForecast?.district}, {stationForecast?.state}
                </span>
                {stationForecast?.soilType && (
                  <span>&bull; {t('Soil')}: <strong className="text-stone-200">{stationForecast.soilType}</strong></span>
                )}
                {stationForecast?.aquiferType && (
                  <span>&bull; {t('Aquifer')}: <strong className="text-stone-200">{stationForecast.aquiferType}</strong></span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-medium pt-1">
                {t('Deterministic hydrogeological projection estimating water table movement and critical suction margin over the next 7 to 90 days.')}
              </p>
            </div>

            {/* Quick Summary Pill on Right */}
            <div className="shrink-0 bg-stone-900/90 border border-stone-700 p-4 rounded-2xl backdrop-blur-md space-y-2 min-w-[200px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                {t('Current Water Depth')}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">
                  {isStationLoading ? '...' : currentDepthVal !== undefined ? `${currentDepthVal.toFixed(1)}` : '--'}
                </span>
                <span className="text-xs font-bold text-stone-400">m mbgl</span>
              </div>
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-400">{t('Risk Score')}:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {stationForecast?.riskScore !== undefined ? `${Math.round(stationForecast.riskScore * 100)}/100` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Key Metrics Summary Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Projected Level */}
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
                  {isStationLoading ? '...' : endDepthVal !== undefined ? `${endDepthVal.toFixed(1)}` : '--'}
                </span>
                <span className="text-xs font-bold text-stone-500">m mbgl</span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {currentDepthVal !== undefined
                  ? `${t('Baseline today')}: ${currentDepthVal.toFixed(1)} m mbgl`
                  : t('Current observed baseline')}
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

          {/* Card 2: Days to Critical Limit */}
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
                  {isStationLoading
                    ? '...'
                    : stationForecast?.projectedDaysToCritical !== null && stationForecast?.projectedDaysToCritical !== undefined
                    ? `${stationForecast.projectedDaysToCritical} Days`
                    : t('60+ Days / Safe')}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {t('Threshold margin to')} {criticalLimit.toFixed(1)} {t('m mbgl station head limit')}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${urgencyStyle.dot}`} />
              <span className="text-[11px] font-bold text-stone-700 truncate">
                {urgencyStyle.label}
              </span>
            </div>
          </div>

          {/* Card 3: Monthly Depletion Rate */}
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
                  {isStationLoading ? '...' : `${monthlyRate > 0 ? '+' : ''}${monthlyRate.toFixed(2)}`}
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
                  stationForecast?.forecastRisk === 'critical'
                    ? 'bg-rose-100 text-rose-800'
                    : stationForecast?.forecastRisk === 'worsening'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {stationForecast?.forecastRisk || 'Moderate'}
              </span>
            </div>
          </div>

          {/* Card 4: Switch Mode / Profile Link */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                {t('View Scope')}
              </span>
              <Radio className="h-4 w-4 text-agri-600" />
            </div>
            <div className="mt-3">
              <p className="text-sm font-bold text-stone-900 line-clamp-1">
                {t('Station Context')}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {stationForecast?.stationName}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-100">
              <button
                onClick={() => setSearchParams({})}
                className="text-xs font-bold text-agri-700 hover:text-agri-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isOfficial ? t('Switch to Nationwide Overview') : t('Switch to My Farm Forecast')} &rarr;</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY VISUALIZATION: Dual-Axis Groundwater Trajectory & Historical Rainfall Context */}
        <ChartCard
          title={t('Groundwater Forecast Trajectory & Historical Rainfall Context')}
          subtitle={`${t('Forward trajectory for')} ${stationForecast?.stationName || stationIdParam} (${horizonDays} ${t('day horizon')})`}
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-agri-100 px-2.5 py-0.5 text-xs font-bold text-agri-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('Simulation Stability Index')}: {stationForecast ? Math.round(stationForecast.confidenceScore * 100) : 88}%
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
          <div className="space-y-3 pt-1">
            <div className="h-88 w-full">
              {isStationLoading ? (
                <div className="h-full flex items-center justify-center text-xs font-semibold text-stone-400">
                  <span className="animate-pulse">{t('Recalculating forward groundwater trajectory...')}</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activePoints} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorUncertaintyStation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />

                    {/* Left Y-Axis: Groundwater Depth (Inverted so deeper mbgl goes downward) */}
                    <YAxis
                      yAxisId="gw"
                      reversed={true}
                      domain={['dataMin - 0.5', 'dataMax + 0.8']}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#0f766e' }}
                      tickFormatter={(v) => `${v}m`}
                      label={{
                        value: t('Water Depth (mbgl) ↓ Deeper'),
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#0f766e',
                        fontSize: 11,
                        style: { textAnchor: 'middle' },
                      }}
                    />

                    {/* Right Y-Axis: Historical Rainfall Context */}
                    <YAxis
                      yAxisId="rain"
                      orientation="right"
                      domain={[0, 'dataMax + 10']}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#0284c7' }}
                      tickFormatter={(v) => `${v}mm`}
                      label={{
                        value: t('Historical Rainfall Ref. (mm)'),
                        angle: 90,
                        position: 'insideRight',
                        fill: '#0284c7',
                        fontSize: 11,
                        style: { textAnchor: 'middle' },
                      }}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          const isBaselinePoint = d.day_offset === 0 || d.date === 'Today';
                          return (
                            <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xl text-xs space-y-1.5 min-w-[210px]">
                              <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                                <span className="font-extrabold text-stone-900">
                                  {d.date} {isBaselinePoint ? `(${t('Current Observed')})` : `(${d.change_label || '+' + d.day_offset + 'd'})`}
                                </span>
                                {isBaselinePoint && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                    {t('Observed Baseline')}
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-agri-700">
                                {t('Water Depth')}: {d.predictedLevel} m mbgl
                              </p>
                              <p className="text-stone-500 text-[11px]">
                                {t('Model Projection Envelope')}: {d.lowerConfidence}m — {d.upperConfidence}m
                              </p>
                              <p className="text-sky-700 text-[11px] font-semibold flex items-center gap-1">
                                <CloudRain className="h-3 w-3" />
                                {t('Historical Rainfall Context')}: {d.expectedRainfallMm} mm ({t('Station monthly reference norm')})
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                    {/* Reference Line for Station-Specific Critical Threshold */}
                    <ReferenceLine
                      yAxisId="gw"
                      y={criticalLimit}
                      stroke="#e11d48"
                      strokeDasharray="4 4"
                      label={{
                        value: `${t('Station Reference Threshold')} (${criticalLimit.toFixed(1)}m)`,
                        fill: '#e11d48',
                        fontSize: 10,
                        position: 'insideBottomRight',
                      }}
                    />

                    {/* Historical Reference Rainfall Bars (Right Axis) */}
                    <Bar
                      yAxisId="rain"
                      dataKey="expectedRainfallMm"
                      name={t('Historical Rainfall Context (mm)')}
                      fill="#bae6fd"
                      stroke="#38bdf8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />

                    {/* Uncertainty Envelope (Left Axis) */}
                    <Area
                      yAxisId="gw"
                      type="monotone"
                      dataKey="upperConfidence"
                      stroke="transparent"
                      fill="url(#colorUncertaintyStation)"
                      name={t('Model Projection Envelope')}
                    />
                    <Area
                      yAxisId="gw"
                      type="monotone"
                      dataKey="lowerConfidence"
                      stroke="transparent"
                      fill="#ffffff"
                      legendType="none"
                    />

                    {/* Groundwater Projected Trajectory Line (Left Axis) */}
                    <Line
                      yAxisId="gw"
                      type="monotone"
                      dataKey="predictedLevel"
                      name={t('Projected Water Depth (mbgl)')}
                      stroke="#0f766e"
                      strokeWidth={3}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isToday = payload.day_offset === 0 || payload.date === 'Today';
                        return (
                          <circle
                            key={`dot-${payload.date}`}
                            cx={cx}
                            cy={cy}
                            r={isToday ? 6 : 4}
                            fill={isToday ? '#047857' : '#0f766e'}
                            stroke="#ffffff"
                            strokeWidth={isToday ? 2 : 1.5}
                          />
                        );
                      }}
                      activeDot={{ r: 7 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Visual Axis & Data Legend Clarifications */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl bg-stone-50 p-3 text-[11px] text-stone-600 border border-stone-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-agri-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{t('Inverted Depth Axis')}:</strong> {t('Plotted downward so deeper groundwater levels are visually lower. Lower mbgl indicates shallower water table.')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CloudRain className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{t('Rainfall & Recharge Note')}:</strong> {t('Rainfall can increase recharge potential, but groundwater response also depends on infiltration, aquifer characteristics, seasonal conditions and water use.')}
                </span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* 4. "What This Means" Multi-Driver Hydrogeological Interpretation */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Sprout className="h-5 w-5 text-agri-700" />
            <h3 className="text-base font-bold text-stone-900">
              {t('What This Means: Hydrogeological Interpretation & Farmer Advisory')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 1. Trajectory & Drawdown Analysis */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
                <Activity className="h-4 w-4 text-agri-600" />
                {t('Aquifer Table Trajectory')}
              </h4>
              <p className="text-stone-700 leading-relaxed">
                {isFalling
                  ? `${t('Aquifer table is experiencing active seasonal drawdown at an estimated rate of')} ${Math.abs(monthlyRate).toFixed(2)} m/month. ${t('Water depth is projected to deepen from')} ${currentDepthVal?.toFixed(1)}m ${t('to')} ${endDepthVal?.toFixed(1)}m mbgl over ${horizonDays} days.`
                  : isRising
                  ? `${t('Aquifer table is recovering at an estimated recharge velocity of')} ${Math.abs(monthlyRate).toFixed(2)} m/month. ${t('Water depth is projected to rise from')} ${currentDepthVal?.toFixed(1)}m ${t('to')} ${endDepthVal?.toFixed(1)}m mbgl.`
                  : `${t('Aquifer table is in near-steady equilibrium with minimal seasonal fluctuation near')} ${currentDepthVal?.toFixed(1)}m mbgl.`}
              </p>
            </div>

            {/* 2. Rainfall & Infiltration Context */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
                <CloudRain className="h-4 w-4 text-sky-600" />
                {t('Rainfall Context & Infiltration Dynamics')}
              </h4>
              <p className="text-stone-700 leading-relaxed">
                {t('Rainfall can increase recharge potential, but groundwater response also depends on infiltration, aquifer characteristics, seasonal conditions and water use.')} {stationForecast?.soilType ? `${t('Local')} ${stationForecast.soilType} ${t('soil strata determine the actual rate of seasonal percolation.')}` : t('Percolation rates determine how efficiently surface moisture reaches the unconfined aquifer layer.')}
              </p>
            </div>

            {/* 3. Pump Suction & Critical Margin */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-amber-600" />
                {t('Suction Margin & Days-to-Critical')}
              </h4>
              <p className="text-stone-700 leading-relaxed">
                {stationForecast?.projectedDaysToCritical !== null && stationForecast?.projectedDaysToCritical !== undefined
                  ? `${t('Estimated operational buffer to the')} ${criticalLimit.toFixed(1)}m mbgl ${t('station reference threshold is')} ${stationForecast.projectedDaysToCritical} ${t('days. Pumping shifts should be planned ahead to avoid dry suction.')}`
                  : `${t('Water table remains well within safe operational head limits (>60 days buffer). No imminent suction failure detected.')}`}
              </p>
            </div>

            {/* 4. Actionable Farm Guidance */}
            <div className="rounded-xl border border-agri-200 bg-agri-50/60 p-4 space-y-1.5">
              <h4 className="font-bold text-agri-950 flex items-center gap-1.5 text-sm">
                <Sprout className="h-4 w-4 text-agri-700" />
                {t('Actionable Field Advisory')}
              </h4>
              <p className="text-agri-900 leading-relaxed font-medium">
                {stationForecast?.farmerGuidance || t('Calibrate irrigation timing to night hours to minimize evaporative losses. Practice soil mulching where feasible.')}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
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
            {stationForecast?.methodology || t('Deterministic linear hydrostatic trajectory modeled from observed DWLR baseline and seasonal rate of change with widening uncertainty bounds.')}
          </p>
          <p className="text-[10px] text-stone-400 font-medium">
            {t('JalKrishi Reference Simulation Model • Station-specific reference dataset for testing and demonstration.')}
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER MODE B: NATIONWIDE OFFICIAL FORECAST VIEW (For Officials when no stationId)
  // =========================================================================
  if (isOfficial) {
    return <OfficialForecastView onSelectStation={outletCtx?.onSelectStation} />;
  }

  // =========================================================================
  // RENDER MODE C: LOCATION-AWARE FARM PROFILE FORECAST MODE (For Farmers when no stationId)
  // =========================================================================
  const activePoints = farmForecast?.forecastPoints || [];
  const currentDepthVal = farmForecast?.currentLevel ?? (isDirectObservation ? nearestStation?.station.waterLevel : undefined);
  const endDepthVal = farmForecast?.projectedLevelEnd ?? farmForecast?.projectedLevel30d ?? (currentDepthVal !== undefined ? currentDepthVal + 0.3 : undefined);
  const netChange = currentDepthVal !== undefined && endDepthVal !== undefined ? endDepthVal - currentDepthVal : 0;
  const isFalling = netChange > 0.05;
  const isRising = netChange < -0.05;
  const urgencyStyle = getUrgencyBadge(farmForecast?.daysToCriticalUrgency || 'Safe');
  const monthlyRate = farmForecast?.dailyChangeM !== undefined ? farmForecast.dailyChangeM * 30 : 0.15;
  const criticalLimit = farmForecast?.criticalThreshold ?? 25.0;

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
            {farmForecast?.evidenceMode === 'DIRECT_DWLR'
              ? t('Nearby DWLR Telemetry Model')
              : farmForecast?.evidenceMode === 'REGIONAL_NEARBY_EVIDENCE'
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

              {farmForecast?.evidenceMode === 'DIRECT_DWLR' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {t('Direct DWLR Evidence (≤ 15 km)')}
                </span>
              ) : farmForecast?.evidenceMode === 'REGIONAL_NEARBY_EVIDENCE' ? (
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
                {isLoading ? '...' : endDepthVal !== undefined ? `${endDepthVal.toFixed(1)}` : '--'}
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
                  : farmForecast?.projectedDaysToCritical !== null && farmForecast?.projectedDaysToCritical !== undefined
                  ? `${farmForecast.projectedDaysToCritical} Days`
                  : t('60+ Days / Safe')}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {t('Threshold margin to')} {criticalLimit.toFixed(1)} {t('m mbgl operational head limit')}
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
                  : `${monthlyRate > 0 ? '+' : ''}${monthlyRate.toFixed(2)}`}
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
                farmForecast?.forecastRisk === 'critical'
                  ? 'bg-rose-100 text-rose-800'
                  : farmForecast?.forecastRisk === 'worsening'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {farmForecast?.forecastRisk || 'Moderate'}
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

      {/* 3. PRIMARY VISUALIZATION: Dual-Axis Forecast & Historical Rainfall Context */}
      <ChartCard
        title={t('Groundwater Forecast Trajectory & Historical Rainfall Context')}
        subtitle={`${t('Forward trajectory for')} ${resolvedLocation?.district || farmLocation || 'My Farm'} (${horizonDays} ${t('day horizon')})`}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-agri-100 px-2.5 py-0.5 text-xs font-bold text-agri-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('Simulation Stability Index')}: {farmForecast ? Math.round(farmForecast.confidenceScore * 100) : 88}%
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
        <div className="space-y-3 pt-1">
          <div className="h-88 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs font-semibold text-stone-400">
                <span className="animate-pulse">{t('Recalculating forward groundwater trajectory...')}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activePoints} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorUncertaintyFarm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />

                  {/* Left Y-Axis: Groundwater Depth (Inverted so deeper mbgl goes downward) */}
                  <YAxis
                    yAxisId="gw"
                    reversed={true}
                    domain={['dataMin - 0.5', 'dataMax + 0.8']}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#0f766e' }}
                    tickFormatter={(v) => `${v}m`}
                    label={{
                      value: t('Water Depth (mbgl) ↓ Deeper'),
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#0f766e',
                      fontSize: 11,
                      style: { textAnchor: 'middle' },
                    }}
                  />

                  {/* Right Y-Axis: Historical Rainfall Context */}
                  <YAxis
                    yAxisId="rain"
                    orientation="right"
                    domain={[0, 'dataMax + 10']}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#0284c7' }}
                    tickFormatter={(v) => `${v}mm`}
                    label={{
                      value: t('Historical Rainfall Ref. (mm)'),
                      angle: 90,
                      position: 'insideRight',
                      fill: '#0284c7',
                      fontSize: 11,
                      style: { textAnchor: 'middle' },
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const isBaselinePoint = d.day_offset === 0 || d.date === 'Today';
                        return (
                          <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xl text-xs space-y-1.5 min-w-[210px]">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                              <span className="font-extrabold text-stone-900">
                                {d.date} {isBaselinePoint ? `(${t('Current Observed')})` : `(${d.change_label || '+' + d.day_offset + 'd'})`}
                              </span>
                              {isBaselinePoint && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                  {t('Observed Baseline')}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-agri-700">
                              {t('Water Depth')}: {d.predictedLevel} m mbgl
                            </p>
                            <p className="text-stone-500 text-[11px]">
                              {t('Model Projection Envelope')}: {d.lowerConfidence}m — {d.upperConfidence}m
                            </p>
                            <p className="text-sky-700 text-[11px] font-semibold flex items-center gap-1">
                              <CloudRain className="h-3 w-3" />
                              {t('Historical Rainfall Context')}: {d.expectedRainfallMm} mm ({t('Station monthly reference norm')})
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                  {/* Reference Line for Critical Suction Limit */}
                  <ReferenceLine
                    yAxisId="gw"
                    y={criticalLimit}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    label={{
                      value: `${t('Station Reference Threshold')} (${criticalLimit.toFixed(1)}m)`,
                      fill: '#e11d48',
                      fontSize: 10,
                      position: 'insideBottomRight',
                    }}
                  />

                  {/* Historical Reference Rainfall Bars (Right Axis) */}
                  <Bar
                    yAxisId="rain"
                    dataKey="expectedRainfallMm"
                    name={t('Historical Rainfall Context (mm)')}
                    fill="#bae6fd"
                    stroke="#38bdf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />

                  {/* Uncertainty Envelope (Left Axis) */}
                  <Area
                    yAxisId="gw"
                    type="monotone"
                    dataKey="upperConfidence"
                    stroke="transparent"
                    fill="url(#colorUncertaintyFarm)"
                    name={t('Model Projection Envelope')}
                  />
                  <Area
                    yAxisId="gw"
                    type="monotone"
                    dataKey="lowerConfidence"
                    stroke="transparent"
                    fill="#ffffff"
                    legendType="none"
                  />

                  {/* Groundwater Projected Trajectory Line (Left Axis) */}
                  <Line
                    yAxisId="gw"
                    type="monotone"
                    dataKey="predictedLevel"
                    name={t('Projected Water Depth (mbgl)')}
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isToday = payload.day_offset === 0 || payload.date === 'Today';
                      return (
                        <circle
                          key={`dot-${payload.date}`}
                          cx={cx}
                          cy={cy}
                          r={isToday ? 6 : 4}
                          fill={isToday ? '#047857' : '#0f766e'}
                          stroke="#ffffff"
                          strokeWidth={isToday ? 2 : 1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 7 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Visual Axis & Data Legend Clarifications */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl bg-stone-50 p-3 text-[11px] text-stone-600 border border-stone-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-agri-600 shrink-0 mt-0.5" />
              <span>
                <strong>{t('Inverted Depth Axis')}:</strong> {t('Plotted downward so deeper groundwater levels are visually lower. Lower mbgl indicates shallower water table.')}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CloudRain className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <strong>{t('Rainfall & Recharge Note')}:</strong> {t('Rainfall can increase recharge potential, but groundwater response also depends on infiltration, aquifer characteristics, seasonal conditions and water use.')}
              </span>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* 4. "What This Means" Multi-Driver Hydrogeological Interpretation */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Sprout className="h-5 w-5 text-agri-700" />
          <h3 className="text-base font-bold text-stone-900">
            {t('What This Means: Hydrogeological Interpretation & Farmer Advisory')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* 1. Trajectory & Drawdown Analysis */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
              <Activity className="h-4 w-4 text-agri-600" />
              {t('Aquifer Table Trajectory')}
            </h4>
            <p className="text-stone-700 leading-relaxed">
              {isFalling
                ? `${t('Aquifer table is experiencing active seasonal drawdown at an estimated rate of')} ${Math.abs(monthlyRate).toFixed(2)} m/month. ${t('Water depth is projected to deepen from')} ${currentDepthVal?.toFixed(1)}m ${t('to')} ${endDepthVal?.toFixed(1)}m mbgl over ${horizonDays} days.`
                : isRising
                ? `${t('Aquifer table is recovering at an estimated recharge velocity of')} ${Math.abs(monthlyRate).toFixed(2)} m/month. ${t('Water depth is projected to rise from')} ${currentDepthVal?.toFixed(1)}m ${t('to')} ${endDepthVal?.toFixed(1)}m mbgl.`
                : `${t('Aquifer table is in near-steady equilibrium with minimal seasonal fluctuation near')} ${currentDepthVal?.toFixed(1)}m mbgl.`}
            </p>
          </div>

          {/* 2. Rainfall & Infiltration Context */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
              <CloudRain className="h-4 w-4 text-sky-600" />
              {t('Rainfall Context & Infiltration Dynamics')}
            </h4>
            <p className="text-stone-700 leading-relaxed">
              {t('Rainfall can increase recharge potential, but groundwater response also depends on infiltration, aquifer characteristics, seasonal conditions and water use.')} {t('Percolation rates determine how efficiently surface moisture reaches the unconfined aquifer layer.')}
            </p>
          </div>

          {/* 3. Pump Suction & Critical Margin */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              {t('Suction Margin & Days-to-Critical')}
            </h4>
            <p className="text-stone-700 leading-relaxed">
              {farmForecast?.projectedDaysToCritical !== null && farmForecast?.projectedDaysToCritical !== undefined
                ? `${t('Estimated operational buffer to the')} ${criticalLimit.toFixed(1)}m mbgl ${t('operational threshold is')} ${farmForecast.projectedDaysToCritical} ${t('days. Pumping shifts should be planned ahead to avoid dry suction.')}`
                : `${t('Water table remains well within safe operational head limits (>60 days buffer). No imminent suction failure detected.')}`}
            </p>
          </div>

          {/* 4. Actionable Farm Guidance */}
          <div className="rounded-xl border border-agri-200 bg-agri-50/60 p-4 space-y-1.5">
            <h4 className="font-bold text-agri-950 flex items-center gap-1.5 text-sm">
              <Sprout className="h-4 w-4 text-agri-700" />
              {t('Actionable Field Advisory')}
            </h4>
            <p className="text-agri-900 leading-relaxed font-medium">
              {farmForecast?.farmerGuidance || t('Calibrate irrigation timing to night hours to minimize evaporative losses. Practice soil mulching where feasible.')}
            </p>
          </div>
        </div>

        {/* Contextual Farm Profile Implications */}
        {farmForecast?.personalizedProfileNotes && farmForecast.personalizedProfileNotes.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('Specific Guidance for Your Farm Profile')}
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {farmForecast.personalizedProfileNotes.map((note, idx) => (
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

        {/* Action CTAs */}
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
          {farmForecast?.provenanceLabel || t('Regional groundwater forecast based on nearby evidence.')}
          {' '}{t('Trajectory calculated using linear trend extrapolation of seasonal depletion velocity with expanding uncertainty boundaries.')}
        </p>
        <p className="text-[10px] text-stone-400 font-medium">
          {t('JalKrishi Reference Simulation Model • Not a direct borehole measurement on your individual plot.')}
        </p>
      </div>
    </div>
  );
};
