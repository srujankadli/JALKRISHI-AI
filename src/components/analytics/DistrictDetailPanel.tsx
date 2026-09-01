import React from 'react';
import {
  MapPin,
  TrendingDown,
  Clock,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { DistrictAnalysisRow } from '../../utils/exportUtils';

interface DistrictDetailPanelProps {
  district: DistrictAnalysisRow | null;
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToForecast: () => void;
  onNavigateToAnomalies: () => void;
  onNavigateToCrops: () => void;
}

export const DistrictDetailPanel: React.FC<DistrictDetailPanelProps> = ({
  district,
  onClose,
  onNavigateToMap,
  onNavigateToForecast,
  onNavigateToAnomalies,
  onNavigateToCrops,
}) => {
  if (!district) return null;

  // Generate 14-day depth curve for district
  const miniTrendData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const depthVal = +(district.avgDepth - (13 - i) * 0.06 + Math.sin(i) * 0.1).toFixed(2);
    return {
      date: dateStr,
      depth: depthVal,
    };
  });

  return (
    <div className="rounded-3xl border border-agri-300 bg-gradient-to-br from-agri-50/60 via-white to-white p-6 shadow-elevated space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-agri-800 tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-agri-700" />
            <span>District Hydrogeological Profile &bull; {district.state}</span>
          </div>
          <h3 className="mt-1 text-2xl font-black text-stone-900">
            {district.district} District
          </h3>
        </div>

        <button
          onClick={onClose}
          className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grid of Key District Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase block">Monitored Wells</span>
          <strong className="text-xl font-black text-stone-900 font-mono">
            {district.totalStations}
          </strong>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase block">Avg Depth (mbgl)</span>
          <strong className="text-xl font-black text-sky-800 font-mono">
            {district.avgDepth} m
          </strong>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase block">Critical Drawdown</span>
          <strong className="text-xl font-black text-rose-800 font-mono">
            {district.criticalCount} wells
          </strong>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase block">Days to Critical</span>
          <strong className="text-xl font-black text-amber-900 font-mono flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {typeof district.avgDaysToCritical === 'number'
              ? `${district.avgDaysToCritical}d`
              : district.avgDaysToCritical}
          </strong>
        </div>
      </div>

      {/* Mini Trend Chart */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-stone-800">
          <span>14-Day Average Groundwater Drawdown Trajectory:</span>
          <span className="text-rose-700 font-mono">
            {district.trend === 'falling' ? '↓ Falling (-0.06m/day)' : '→ Stable'}
          </span>
        </div>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={miniTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis reversed domain={['auto', 'auto']} stroke="#94a3b8" fontSize={9} tickLine={false} unit="m" />
              <Tooltip />
              <Area type="monotone" dataKey="depth" stroke="#0284c7" fill="#e0f2fe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
        <span className="text-xs text-stone-500 flex items-center gap-1 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-agri-600" />
          Cross-module deep drill-down available
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNavigateToMap}
            className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-50 shadow-xs cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-agri-700" />
            <span>View on Map</span>
          </button>

          <button
            onClick={onNavigateToForecast}
            className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-50 shadow-xs cursor-pointer"
          >
            <TrendingDown className="h-3.5 w-3.5 text-sky-700" />
            <span>View Forecast</span>
          </button>

          <button
            onClick={onNavigateToAnomalies}
            className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-50 shadow-xs cursor-pointer"
          >
            <span>Anomalies</span>
          </button>

          <button
            onClick={onNavigateToCrops}
            className="inline-flex items-center gap-1 rounded-xl bg-agri-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-agri-800 shadow-xs cursor-pointer"
          >
            <span>Crop Advisor</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
