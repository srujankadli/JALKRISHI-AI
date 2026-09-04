import React, { useState } from 'react';
import {
  X,
  MapPin,
  Wifi,
  Activity,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { DWLRStation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatDepth, formatRiskScore } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface StationDetailModalProps {
  station: DWLRStation | null;
  onClose: () => void;
  onNavigateToCropAdvisor?: () => void;
  onNavigateToForecast?: (stationId: string) => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({
  station,
  onClose,
  onNavigateToCropAdvisor,
  onNavigateToForecast,
}) => {
  const { t } = useLanguage();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!station) return null;

  // Fallback historical data if none provided
  const chartData = station.historicalData || [
    { date: 'Month 1', waterLevel: station.waterLevel + 1.2, rainfall: 20 },
    { date: 'Month 2', waterLevel: station.waterLevel + 0.8, rainfall: 40 },
    { date: 'Month 3', waterLevel: station.waterLevel + 0.4, rainfall: 85 },
    { date: 'Month 4', waterLevel: station.waterLevel + 0.1, rainfall: 120 },
    { date: 'Month 5', waterLevel: station.previousWaterLevel, rainfall: 90 },
    { date: 'Current', waterLevel: station.waterLevel, rainfall: 45 },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label={t('Close station modal')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top Header */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={station.status} size="lg" />
          <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-mono font-semibold text-stone-700">
            {station.stationCode}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-stone-500">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            {t('Telemetry Online')} ({station.lastUpdated})
          </span>
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">
            {station.stationName}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-stone-500 sm:text-sm mt-0.5">
            <MapPin className="h-4 w-4 text-stone-400 shrink-0" />
            {station.block} {t('Block')}, {station.district} {t('District')}, {station.state} &bull; Lat: {station.latitude.toFixed(4)}, Long: {station.longitude.toFixed(4)}
          </p>
        </div>

        {/* Farmer Plain Language Summary Banner */}
        <div className="mt-5 rounded-xl border border-agri-200 bg-agri-50/80 p-4 text-agri-950">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">🌾</span>
            <div>
              <h3 className="text-sm font-bold text-agri-900">{t('Groundwater Situation for Farmers')}</h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-agri-900">
                {station.farmerSummary || t('Groundwater table is being continuously monitored by Central Ground Water Board telemetry.')}
              </p>
              {station.actionableAdvice && (
                <p className="mt-2 text-xs sm:text-sm font-semibold text-agri-950 bg-white/70 rounded-lg p-2.5 border border-agri-200/60">
                  🌱 {t('Recommended Action')}: {station.actionableAdvice}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-center">
            <span className="text-xs font-medium text-stone-500">{t('Current Water Depth')}</span>
            <p className="mt-1 text-xl font-extrabold text-stone-900">
              {formatDepth(station.waterLevel)}
            </p>
            <span className="text-[11px] text-stone-400">{t('meters below ground')}</span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-center">
            <span className="text-xs font-medium text-stone-500">{t('Seasonal Average')}</span>
            <p className="mt-1 text-xl font-extrabold text-stone-900">
              {formatDepth(station.seasonalAverage)}
            </p>
            <span className="text-[11px] text-stone-400">{t('historical benchmark')}</span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-center">
            <span className="text-xs font-medium text-stone-500">{t('Risk Assessment')}</span>
            <p className="mt-1 text-xl font-extrabold text-stone-900">
              {formatRiskScore(station.riskScore)}
            </p>
            <span className="text-[11px] text-stone-400">{t(station.status.toUpperCase())}</span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-center">
            <span className="text-xs font-medium text-stone-500">{t('Days to Critical')}</span>
            <p className="mt-1 text-xl font-extrabold text-rose-700">
              {station.daysToCritical ? `${station.daysToCritical} ${t('Days')}` : t('Safe')}
            </p>
            <span className="text-[11px] text-stone-400">{t('at current draw rate')}</span>
          </div>
        </div>

        {/* Historical Water Level Trend Chart */}
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-agri-700" />
              <h4 className="text-sm font-bold text-stone-900">{t('6-Month Water Level & Rainfall Profile')}</h4>
            </div>
            <span className="text-xs text-stone-500">{t('Depth in mbgl (Lower curve = deeper water)')}</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterLevelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-stone-200 bg-white p-2 text-xs shadow-md">
                          <p className="font-semibold text-stone-800">{payload[0].payload.date}</p>
                          <p className="text-water-700">{t('Depth')}: {payload[0].value} mbgl</p>
                          {payload[0].payload.rainfall && (
                            <p className="text-agri-700">{t('Rainfall')}: {payload[0].payload.rainfall} mm</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="waterLevel"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#waterLevelGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technical Data Accordion Toggle */}
        <div className="mt-4 border-t border-stone-100 pt-3">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 underline"
          >
            {showTechnicalDetails ? t('▼ Hide Technical & Hydrogeological Specs') : t('▶ Show Technical & Hydrogeological Specs (For Researchers / Engineers)')}
          </button>

          {showTechnicalDetails && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-700 border border-stone-200">
              <div><strong className="text-stone-900">{t('Aquifer Type')}:</strong> {station.aquiferType || 'Unconfined Alluvial'}</div>
              <div><strong className="text-stone-900">{t('Soil Stratum')}:</strong> {station.soilType || 'Sandy Alluvium'}</div>
              <div><strong className="text-stone-900">{t('Critical Threshold')}:</strong> {station.criticalThreshold} mbgl</div>
              <div><strong className="text-stone-900">{t('Depletion Slope')}:</strong> {station.trendRateMetersPerMonth} m/month</div>
              <div><strong className="text-stone-900">{t('Telemetry Battery')}:</strong> {station.batteryLevel}% (Solar float)</div>
              <div><strong className="text-stone-900">{t('Hardware ID')}:</strong> {station.id}</div>
            </div>
          )}
        </div>

        {/* Quick Action Navigation Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            {t('Close')}
          </button>

          <div className="flex items-center gap-2">
            {onNavigateToCropAdvisor && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToCropAdvisor();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-agri-50 px-3.5 py-2 text-xs font-bold text-agri-800 border border-agri-200 hover:bg-agri-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t('View Crop Advice for this Well')}
              </button>
            )}

            {onNavigateToForecast && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToForecast(station.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-water-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-water-800"
              >
                <span>{t('30-90 Day Forecast')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
