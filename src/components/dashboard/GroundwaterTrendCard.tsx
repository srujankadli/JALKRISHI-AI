import React, { useState, useEffect } from 'react';
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
import { TrendingDown, Activity, Calendar } from 'lucide-react';
import { ChartCard } from '../common/ChartCard';
import { metricService } from '../../services/metricService';
import { useLanguage } from '../../context/LanguageContext';

export const GroundwaterTrendCard: React.FC = () => {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const data = await metricService.getTrendTimeframe(timeframe);
      setChartData(data);
    }
    loadData();
  }, [timeframe]);

  return (
    <ChartCard
      title={t('Groundwater Trend')}
      subtitle={t('National monitored station average')}
      badge={
        <span className="inline-flex items-center gap-1 rounded-full bg-water-100 px-2.5 py-0.5 text-xs font-bold text-water-800">
          <Activity className="h-3 w-3" />
          14.80 mbgl {t('Current')}
        </span>
      }
      actions={
        <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100/80 p-0.5 text-xs font-semibold">
          {(['7d', '30d', '90d'] as const).map((timeVal) => (
            <button
              key={timeVal}
              onClick={() => setTimeframe(timeVal)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                timeframe === timeVal
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {timeVal === '7d' ? `7 ${t('Days')}` : timeVal === '30d' ? `30 ${t('Days')}` : `90 ${t('Days')}`}
            </button>
          ))}
        </div>
      }
    >
      {/* Top Trend Summary Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-stone-500">{t('Trend Direction:')}</span>
          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
            <TrendingDown className="h-3 w-3" />
            {t('Water level is falling (-4.2% seasonal draw)')}
          </span>
        </div>
        <span className="text-stone-400">{t('Lower curve = deeper water')}</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendWaterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 11, fill: '#78716c' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-xs space-y-1">
                    <p className="font-bold text-stone-900 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-stone-400" />
                      {item.date}
                    </p>
                    <div className="border-t border-stone-100 pt-1">
                      <p className="text-water-800 font-extrabold text-sm">
                        {t('Depth:')} {item.depth} mbgl
                      </p>
                      <p className="text-stone-500">
                        {t('Historical Baseline:')} {item.baseline} mbgl
                      </p>
                      <p className={`font-semibold ${item.delta.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {t('Change:')} {item.delta}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          <Area
            type="monotone"
            dataKey="depth"
            name={t('Current Water Level (mbgl)')}
            stroke="#0284c7"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#trendWaterGrad)"
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name={t('Historical Baseline (mbgl)')}
            stroke="#a8a29e"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
