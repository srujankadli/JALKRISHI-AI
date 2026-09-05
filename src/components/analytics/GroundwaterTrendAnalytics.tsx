import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartCard } from '../common/ChartCard';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface GroundwaterTrendAnalyticsProps {
  timeframe: '7d' | '30d' | '90d';
  selectedRegionLabel: string;
  avgDepth: number;
}

export const GroundwaterTrendAnalytics: React.FC<GroundwaterTrendAnalyticsProps> = ({
  timeframe,
  selectedRegionLabel,
  avgDepth,
}) => {
  const { t } = useLanguage();
  
  // Generate realistic historical depth trajectory matching timeframe and current avgDepth
  const count = timeframe === '7d' ? 7 : timeframe === '30d' ? 15 : 24;
  const daysStep = timeframe === '7d' ? 1 : timeframe === '30d' ? 2 : 4;

  const data = Array.from({ length: count }, (_, i) => {
    const dayOffset = (count - 1 - i) * daysStep;
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    // Slight gradual depletion slope backwards
    const historicalDelta = (count - 1 - i) * 0.08;
    const depthVal = +(avgDepth - historicalDelta + (Math.sin(i) * 0.15)).toFixed(2);
    const baseline = +(avgDepth - 1.2).toFixed(2);

    return {
      date: dateStr,
      depth: depthVal,
      baseline,
    };
  });

  const netChange = +(data[data.length - 1].depth - data[0].depth).toFixed(2);
  const isDeclining = netChange > 0; // In mbgl, higher depth = lower water table

  return (
    <ChartCard
      title={`${t('Groundwater Table Trajectory')} — ${selectedRegionLabel}`}
      subtitle={`${t('Depth below ground level (mbgl) over past')} ${timeframe === '7d' ? t('7 Days') : timeframe === '30d' ? t('30 Days') : t('90 Days')}`}
      actions={
        <div className="flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
          {isDeclining ? (
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          ) : netChange < 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span>
            {isDeclining
              ? `+${netChange}m ${t('Drawdown (Declining)')}`
              : netChange < 0
              ? `${netChange}m ${t('Recharge (Rising)')}`
              : t('Stable Baseline')}
          </span>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="analyticsDepthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              reversed
              domain={['auto', 'auto']}
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="m"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-xs space-y-1">
                      <p className="font-bold text-stone-900">{label}</p>
                      <p className="text-sky-700 font-extrabold font-mono">
                        {t('Depth:')} {payload[0].value} mbgl
                      </p>
                      <p className="text-[10px] text-stone-500">
                        {t('Seasonal Baseline:')} {payload[0].payload.baseline} mbgl
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="depth"
              stroke="#0284c7"
              strokeWidth={2.5}
              fill="url(#analyticsDepthGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
        <span>{t('* Y-axis is inverted: Lower position indicates deeper water table (hydrostatic drawdown).')}</span>
        <span className="font-semibold text-stone-700">{t("Baseline Target:")} {(avgDepth - 1.2).toFixed(1)}m</span>
      </div>
    </ChartCard>
  );
};
