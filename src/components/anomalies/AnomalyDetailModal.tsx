import React from 'react';
import {
  X,
  MapPin,
  Radio,
  Zap,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { GroundwaterAnomaly } from '../../types';

interface AnomalyDetailModalProps {
  anomaly: GroundwaterAnomaly | null;
  onClose: () => void;
  onNavigateToMap: (stationId: string) => void;
  onNavigateToForecast: (stationId: string) => void;
  onNavigateToCrops: () => void;
}

export const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({
  anomaly,
  onClose,
  onNavigateToMap,
  onNavigateToForecast,
  onNavigateToCrops,
}) => {
  if (!anomaly) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header: Severity & Category */}
        <div className="space-y-1 pr-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                anomaly.severity === 'critical'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : anomaly.severity === 'high'
                  ? 'bg-orange-100 text-orange-900 border border-orange-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {anomaly.severity.toUpperCase()} ANOMALY ALERT
            </span>

            <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-800">
              {anomaly.category}
            </span>

            <span className="text-xs font-mono text-stone-500 font-semibold">
              {anomaly.id}
            </span>
          </div>

          <h2 className="text-xl font-black text-stone-900 pt-1">
            {anomaly.stationName}
          </h2>

          <p className="text-xs text-stone-500 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-stone-400" />
            {anomaly.block ? `${anomaly.block} Block • ` : ''}
            {anomaly.district}, {anomaly.state} &bull;{' '}
            <span className="font-mono font-semibold text-stone-700">{anomaly.stationId}</span>
          </p>
        </div>

        {/* Observation Comparison Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">Observed Reading</span>
            <strong className="text-lg font-black text-stone-900 font-mono">
              {anomaly.observedValue} m
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">Expected Baseline</span>
            <strong className="text-lg font-bold text-stone-600 font-mono">
              {anomaly.expectedValue} m
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Deviation</span>
            <strong className="text-sm font-black text-rose-700 font-mono block truncate">
              {anomaly.deviation}
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">Telemetry Status</span>
            <span className="inline-flex items-center gap-1 rounded bg-stone-200/80 px-2 py-0.5 font-bold text-stone-800 text-[11px] mt-0.5">
              <Radio className="h-3 w-3 text-stone-600" />
              {anomaly.status}
            </span>
          </div>
        </div>

        {/* Timeline Chart (If Available) */}
        {anomaly.timelineData && anomaly.timelineData.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-water-700" />
                Hourly Telemetry vs Expected Baseline Curve
              </span>
              <span className="text-[11px] text-stone-500">Meters Below Ground Level (mbgl)</span>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={anomaly.timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#78716c' }} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 10, fill: '#78716c' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-stone-200 bg-white p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold text-stone-900">{item.time}</p>
                          <p className="text-rose-700 font-bold">Observed: {item.observed} m</p>
                          <p className="text-stone-500 font-medium">Expected: {item.expected} m</p>
                          {item.isAnomaly && (
                            <span className="inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                              ⚠️ Anomaly Trigger
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                <Line
                  type="monotone"
                  dataKey="expected"
                  name="Expected Baseline"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="observed"
                  name="Observed DWLR Reading"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#dc2626' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Farmer Plain-Language Interpretation */}
        <div className="rounded-2xl border border-agri-200 bg-agri-50/70 p-4 text-xs text-agri-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-extrabold text-agri-950">
            <Sparkles className="h-4 w-4 text-agri-700" />
            <span>Plain-Language Farmer Insight</span>
          </div>
          <p className="leading-relaxed text-agri-900 font-medium">
            {anomaly.farmerExplanation}
          </p>
        </div>

        {/* Technical Root Cause & Telemetry Specs */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <Zap className="h-4 w-4 text-amber-600" />
            <span>Technical Root Cause Analysis</span>
          </div>
          <p className="text-stone-600 font-mono text-[11px] leading-relaxed">
            {anomaly.technicalDetails}
          </p>

          {anomaly.telemetryHealth && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 text-[11px]">
              <div>
                <span className="text-stone-400 block">Battery Voltage:</span>
                <strong className="text-stone-800 font-mono">{anomaly.telemetryHealth.batteryVoltage}</strong>
              </div>
              <div>
                <span className="text-stone-400 block">Signal Strength:</span>
                <strong className="text-stone-800 font-mono">{anomaly.telemetryHealth.signalDbm}</strong>
              </div>
              <div>
                <span className="text-stone-400 block">Hardware Status:</span>
                <strong className="text-stone-800">{anomaly.telemetryHealth.hardwareStatus}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Recommended Action */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs space-y-1">
          <span className="font-extrabold text-rose-900 block uppercase text-[11px]">
            🌱 Recommended Agronomic Action
          </span>
          <p className="text-stone-800 font-medium leading-relaxed">
            {anomaly.suggestedAction}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Dismiss Alert
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateToMap(anomaly.stationId)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 shadow-xs cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 text-stone-600" />
              <span>Locate on Map</span>
            </button>

            <button
              onClick={() => onNavigateToForecast(anomaly.stationId)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-water-300 bg-water-50 px-3.5 py-2 text-xs font-bold text-water-900 hover:bg-water-100 shadow-xs cursor-pointer"
            >
              <TrendingDown className="h-3.5 w-3.5 text-water-700" />
              <span>View Forecast</span>
            </button>

            <button
              onClick={onNavigateToCrops}
              className="inline-flex items-center gap-1.5 rounded-xl bg-agri-700 px-4 py-2 text-xs font-bold text-white hover:bg-agri-800 shadow-xs cursor-pointer"
            >
              <span>Crop Advisor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
