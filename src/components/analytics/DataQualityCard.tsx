import React from 'react';
import { ShieldCheck, Radio, Info } from 'lucide-react';

interface DataQualityCardProps {
  totalStations: number;
  reportingRatePct: number;
  anomalyCount: number;
}

export const DataQualityCard: React.FC<DataQualityCardProps> = ({
  reportingRatePct,
  anomalyCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Telemetry Health */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
          <Radio className="h-4 w-4 text-emerald-600" />
          <span>Telemetry Link Integrity</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-stone-900 font-mono">
            {reportingRatePct}%
          </span>
          <span className="text-xs text-stone-500 font-semibold">Online & Synchronized</span>
        </div>
        <p className="text-[11px] text-stone-500 leading-snug">
          6-hour scheduled transmission intervals with automatic cellular retry buffers.
        </p>
      </div>

      {/* 2. Automated Quality Control */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
          <ShieldCheck className="h-4 w-4 text-agri-600" />
          <span>Automated QC Flags</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-rose-700 font-mono">
            {anomalyCount}
          </span>
          <span className="text-xs text-stone-500 font-semibold">Active Quality Flags</span>
        </div>
        <p className="text-[11px] text-stone-500 leading-snug">
          Real-time Z-score deviation filters isolate sensor faults from genuine drawdown events.
        </p>
      </div>

      {/* 3. Methodology & Disclaimer */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-subtle space-y-1 text-xs text-stone-600">
        <div className="flex items-center gap-1.5 font-bold text-stone-900">
          <Info className="h-4 w-4 text-agri-700" />
          <span>Methodology & Disclaimer</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Demonstration dataset featuring 5,260 simulated DWLR stations across India. Values represent hydrogeologically realistic patterns generated for the Smart Horizon 2026 Hackathon.
        </p>
      </div>
    </div>
  );
};
