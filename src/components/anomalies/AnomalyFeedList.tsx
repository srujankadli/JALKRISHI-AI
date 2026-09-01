import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Eye,
  Info,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { GroundwaterAnomaly, AnomalySeverity } from '../../types';

interface AnomalyFeedListProps {
  anomalies: GroundwaterAnomaly[];
  onSelectAnomaly: (anomaly: GroundwaterAnomaly) => void;
  onNavigateToMap: (anomaly: GroundwaterAnomaly) => void;
}

export const AnomalyFeedList: React.FC<AnomalyFeedListProps> = ({
  anomalies,
  onSelectAnomaly,
  onNavigateToMap,
}) => {
  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return {
          label: 'CRITICAL ALERT',
          badge: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: AlertTriangle,
          border: 'border-rose-300 bg-gradient-to-br from-rose-50/40 via-white to-white',
        };
      case 'high':
        return {
          label: 'HIGH ATTENTION',
          badge: 'bg-orange-100 text-orange-900 border-orange-300',
          icon: AlertCircle,
          border: 'border-orange-200 bg-gradient-to-br from-orange-50/30 via-white to-white',
        };
      case 'warning':
      case 'medium':
        return {
          label: 'MONITORING WARNING',
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: Eye,
          border: 'border-amber-200 bg-gradient-to-br from-amber-50/20 via-white to-white',
        };
      case 'info':
      case 'low':
      default:
        return {
          label: 'INFORMATIONAL / LOW',
          badge: 'bg-stone-100 text-stone-800 border-stone-300',
          icon: Info,
          border: 'border-stone-200 bg-white',
        };
    }
  };

  if (anomalies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
        <p className="text-sm font-bold text-stone-700">No anomalies match your current filters.</p>
        <p className="text-xs text-stone-500 mt-1">Try selecting 'All Severities' or clearing your search keywords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {anomalies.map((a) => {
        const style = getSeverityBadge(a.severity);
        const Icon = style.icon;

        return (
          <div
            key={a.id}
            onClick={() => onSelectAnomaly(a)}
            className={`rounded-2xl border p-4 sm:p-5 shadow-subtle transition-all hover:shadow-elevated cursor-pointer ${style.border}`}
          >
            {/* Header row: Severity + Category + Detected time */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${style.badge}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {style.label}
                </span>

                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
                  {a.category}
                </span>

                <span className="text-xs font-semibold text-stone-500">
                  &bull; {a.anomalyType}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
                <Clock className="h-3.5 w-3.5 text-stone-400" />
                <span>Detected: {a.detectedAt}</span>
              </div>
            </div>

            {/* Station Title & Metrics */}
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 items-center">
              {/* Station Info */}
              <div className="lg:col-span-6">
                <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                  {a.stationName}
                </h3>
                <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-stone-400" />
                  {a.block ? `${a.block} Block • ` : ''}
                  {a.district}, {a.state} &bull;{' '}
                  <span className="font-mono text-stone-600 font-semibold">{a.stationId}</span>
                </p>
              </div>

              {/* Observed vs Expected vs Deviation */}
              <div className="lg:col-span-6 grid grid-cols-3 gap-2 text-xs text-center rounded-xl bg-white p-2.5 border border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Observed</span>
                  <strong className="text-sm font-black text-stone-900">{a.observedValue} m</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Expected</span>
                  <span className="text-sm font-bold text-stone-600">{a.expectedValue} m</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-600 font-bold uppercase block">Deviation</span>
                  <strong className="text-xs font-black text-rose-700 font-mono block truncate">
                    {a.deviation}
                  </strong>
                </div>
              </div>
            </div>

            {/* Farmer Explanation */}
            <div className="mt-3 rounded-xl border border-stone-200/80 bg-white/80 p-3 text-xs text-stone-700">
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-agri-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-stone-900 font-bold">Farmer Summary: </strong>
                  {a.farmerExplanation}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-100">
              <span className="text-[11px] font-semibold text-stone-500">
                Status: <strong className="text-stone-800">{a.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToMap(a);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
                >
                  <MapPin className="h-3 w-3 text-stone-500" />
                  <span>View on Map</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAnomaly(a);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1 text-xs font-bold text-white hover:bg-stone-800 shadow-xs cursor-pointer"
                >
                  <span>Inspect Details</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
