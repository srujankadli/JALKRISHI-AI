import React, { useState } from 'react';
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
import { Sparkles, Activity, Calendar, MapPin } from 'lucide-react';
import { ChartCard } from '../common/ChartCard';
import type { StationForecast, DWLRStation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface ForecastCurveCardProps {
  forecast: StationForecast | null;
  stations: DWLRStation[];
  selectedStationId: string;
  onSelectStationId: (id: string) => void;
  selectedState: string;
  onSelectState: (state: string) => void;
  statesList: string[];
}

export const ForecastCurveCard: React.FC<ForecastCurveCardProps> = ({
  forecast,
  stations,
  selectedStationId,
  onSelectStationId,
  selectedState,
  onSelectState,
  statesList,
}) => {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '60d' | '90d'>('90d');
  const [scope, setScope] = useState<'station' | 'state'>('station');

  if (!forecast) return null;

  // Filter forecast points based on timeframe
  const points = forecast.forecastPoints || [];
  const filteredPoints = points.filter((pt) => {
    if (timeframe === '7d') return pt.date === 'Today' || pt.date === '+7 Days';
    if (timeframe === '30d') return pt.date === 'Today' || pt.date === '+7 Days' || pt.date === '+15 Days' || pt.date === '+30 Days' || pt.date.includes('22');
    if (timeframe === '60d') return pt.date !== '+90 Days';
    return true; // 90d includes all
  });

  return (
    <ChartCard
      title={t('Groundwater Forecast Curve & Uncertainty Bounds')}
      subtitle={`${t('Projected water depth for')} ${forecast.stationName} (${forecast.district}, ${forecast.state})`}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-water-100 px-2.5 py-0.5 text-xs font-bold text-water-800">
          <Activity className="h-3.5 w-3.5" />
          {t('Confidence')}: {Math.round(forecast.confidenceScore * 100)}%
        </span>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setScope('station')}
              className={`rounded px-2.5 py-1 transition-all ${
                scope === 'station' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('Station Scope')}
            </button>
            <button
              onClick={() => setScope('state')}
              className={`rounded px-2.5 py-1 transition-all ${
                scope === 'state' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('State Scope')}
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-semibold">
            {(['7d', '30d', '60d', '90d'] as const).map((tVal) => (
              <button
                key={tVal}
                onClick={() => setTimeframe(tVal)}
                className={`rounded px-2 py-1 transition-all ${
                  timeframe === tVal ? 'bg-agri-700 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tVal.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {/* Scope Selector Control Row */}
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-stone-100 pb-3 text-xs">
        {scope === 'station' ? (
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <MapPin className="h-4 w-4 text-agri-700 shrink-0" />
            <span className="font-bold text-stone-700">{t('Observation Well')}:</span>
            <select
              value={selectedStationId}
              onChange={(e) => onSelectStationId(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
            >
              {stations.slice(0, 30).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.stationName} ({st.district}, {st.state}) - {st.waterLevel}m
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="font-bold text-stone-700">{t('State Aggregate')}:</span>
            <select
              value={selectedState}
              onChange={(e) => onSelectState(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
            >
              {statesList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs font-semibold ml-auto">
          <span className="text-stone-500">
            {t('Current Depth')}: <strong className="text-stone-900">{forecast.currentLevel} mbgl</strong>
          </span>
          <span className="text-stone-500">
            {t('30d Projected')}: <strong className="text-rose-700">{forecast.projectedLevel30d} mbgl</strong>
          </span>
        </div>
      </div>

      {/* Main Recharts Forecast with Confidence Band */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={filteredPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastUpperGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: '#78716c' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                    <p className="font-bold text-stone-900 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-stone-400" />
                      {item.date}
                    </p>
                    <div className="border-t border-stone-100 pt-1 space-y-0.5">
                      <p className="text-water-900 font-black text-sm">
                        {t('Expected')}: {item.predictedLevel} mbgl
                      </p>
                      <p className="text-stone-500 text-[11px]">
                        {t('Forecast Range')}: {item.lowerConfidence}m — {item.upperConfidence}m
                      </p>
                      <p className="text-emerald-700 font-semibold text-[11px]">
                        {t('Expected Rainfall')}: {item.expectedRainfallMm} mm
                      </p>
                      {item.change && (
                        <p className="text-stone-600 font-mono text-[11px]">
                          {t('Cumulative Change')}: {item.change}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

          {/* Uncertainty Band */}
          <Area
            type="monotone"
            dataKey="upperConfidence"
            name={t('Upper Range (+Uncertainty)')}
            stroke="#93c5fd"
            strokeDasharray="3 3"
            fillOpacity={1}
            fill="url(#forecastUpperGrad)"
          />
          <Area
            type="monotone"
            dataKey="lowerConfidence"
            name={t('Lower Range (-Uncertainty)')}
            stroke="#93c5fd"
            strokeDasharray="3 3"
            fillOpacity={0}
          />

          {/* Projected Trend Line */}
          <Line
            type="monotone"
            dataKey="predictedLevel"
            name={t('Projected Water Depth (mbgl)')}
            stroke="#0284c7"
            strokeWidth={3}
            dot={{ r: 4, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Dynamic Forecast Insight Box */}
      <div className="mt-4 rounded-xl border border-agri-200 bg-agri-50/70 p-3.5 text-xs text-agri-950">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-agri-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-agri-950 block">{t('Forecast Insight')}:</span>
            <p className="mt-0.5 leading-relaxed text-agri-900">
              {t(forecast.farmerGuidance)}
            </p>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};
