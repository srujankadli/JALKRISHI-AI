import React from 'react';
import {
  Droplets,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardSummary } from '../../types';

interface WaterSituationCardProps {
  metrics: DashboardSummary | null;
}

export const WaterSituationCard: React.FC<WaterSituationCardProps> = ({ metrics }) => {
  const navigate = useNavigate();

  const total = metrics?.totalStationsMonitored || 5260;
  const healthy = metrics?.healthyCount || 2412;
  const moderate = metrics?.moderateCount || 1624;
  const warning = metrics?.warningCount || 780;
  const critical = metrics?.criticalCount || 444;

  const healthyPct = Math.round((healthy / total) * 100);
  const moderatePct = Math.round((moderate / total) * 100);
  const warningPct = Math.round((warning / total) * 100);
  const criticalPct = Math.round((critical / total) * 100);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-subtle sm:p-7 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-water-600" />
            Your Water Situation
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                Water Status: <span className="text-amber-700">Moderate (मध्यम)</span>
              </h2>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-0.5 text-xs font-semibold text-stone-600">
              National Index
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/map')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-agri-700 hover:text-agri-900 hover:underline self-start sm:self-auto"
        >
          <span>View Station Map</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Main Plain-Language Explanation */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-stone-900">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-900 sm:text-base">
              Groundwater levels are stable overall, but some monitored areas are showing decline.
            </p>
            <p className="text-xs sm:text-sm text-stone-600">
              Monsoon showers are actively recharging shallow aquifers in eastern and central states. However, intensive irrigation in North-West (Punjab, Haryana, Rajasthan) requires conservation caution.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Multi-Segment Distribution Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>National Monitored Station Distribution</span>
          <span className="font-mono text-stone-900">{total.toLocaleString('en-IN')} DWLR Stations</span>
        </div>

        {/* The Colored Segmented Bar */}
        <div
          className="flex h-4 w-full overflow-hidden rounded-full bg-stone-100 p-0.5 border border-stone-200"
          role="progressbar"
          aria-label="Groundwater status breakdown"
        >
          <div
            style={{ width: `${healthyPct}%` }}
            className="h-full rounded-l-full bg-emerald-600 transition-all duration-500"
            title={`Healthy: ${healthy} stations (${healthyPct}%)`}
          />
          <div
            style={{ width: `${moderatePct}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Moderate: ${moderate} stations (${moderatePct}%)`}
          />
          <div
            style={{ width: `${warningPct}%` }}
            className="h-full bg-orange-500 transition-all duration-500"
            title={`Warning: ${warning} stations (${warningPct}%)`}
          />
          <div
            style={{ width: `${criticalPct}%` }}
            className="h-full rounded-r-full bg-rose-600 transition-all duration-500"
            title={`Critical: ${critical} stations (${criticalPct}%)`}
          />
        </div>
      </div>

      {/* 4 Status Breakdown Blocks (Multi-modal with icons + text + counts + %) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Healthy */}
        <div
          onClick={() => navigate('/map')}
          className="group rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 transition-all hover:bg-emerald-50 hover:shadow-subtle cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Healthy</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-stone-900">
            {healthy.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-stone-500 font-medium">
            <strong className="text-emerald-700">{healthyPct}%</strong> of total • Safe
          </p>
        </div>

        {/* Moderate */}
        <div
          onClick={() => navigate('/map')}
          className="group rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 transition-all hover:bg-amber-50 hover:shadow-subtle cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold uppercase">
            <Droplets className="h-4 w-4 text-amber-600" />
            <span>Moderate</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-stone-900">
            {moderate.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-stone-500 font-medium">
            <strong className="text-amber-700">{moderatePct}%</strong> • Manageable
          </p>
        </div>

        {/* Warning */}
        <div
          onClick={() => navigate('/map')}
          className="group rounded-xl border border-orange-200 bg-orange-50/40 p-3.5 transition-all hover:bg-orange-50 hover:shadow-subtle cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-orange-800 text-xs font-bold uppercase">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <span>Warning</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-stone-900">
            {warning.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-stone-500 font-medium">
            <strong className="text-orange-700">{warningPct}%</strong> • Declining
          </p>
        </div>

        {/* Critical */}
        <div
          onClick={() => navigate('/map')}
          className="group rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 transition-all hover:bg-rose-50 hover:shadow-subtle cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold uppercase">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <span>Critical</span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-rose-900">
            {critical.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-stone-500 font-medium">
            <strong className="text-rose-700">{criticalPct}%</strong> • Urgent Action
          </p>
        </div>
      </div>
    </div>
  );
};
