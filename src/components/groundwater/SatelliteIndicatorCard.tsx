import React from 'react';
import { Radio, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import type { IndicatorItem } from '../../services/satelliteGroundwaterService';

interface SatelliteIndicatorCardProps {
  indicatorKey: string;
  indicator: IndicatorItem;
}

export const SatelliteIndicatorCard: React.FC<SatelliteIndicatorCardProps> = ({
  indicatorKey,
  indicator,
}) => {
  const isNotConfigured = indicator.status.includes('NOT_CONFIGURED') || indicator.source.includes('NOT_CONFIGURED');

  const getStatusBadge = (status: string) => {
    if (isNotConfigured) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-stone-200 text-stone-700 px-2 py-0.5 text-[10px] font-bold font-mono">
          <HelpCircle className="h-3 w-3 text-stone-500" />
          NOT_CONFIGURED (STUB)
        </span>
      );
    }
    if (status.includes('CRITICAL') || status.includes('DEFICIT') || status.includes('WARMING')) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
          <AlertTriangle className="h-3 w-3 text-rose-600" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
        <ShieldCheck className="h-3 w-3 text-emerald-600" />
        {status}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-2.5 hover:border-teal-300 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block font-mono">
            {indicatorKey}
          </span>
          <h4 className="text-xs font-black text-stone-900 leading-tight">
            {indicator.name}
          </h4>
        </div>
        {getStatusBadge(indicator.status)}
      </div>

      <div className="flex items-baseline gap-2 py-0.5">
        <span className="text-xl font-black text-stone-900 font-mono">
          {indicator.value}
        </span>
        <span className="text-xs font-semibold text-stone-500">
          {indicator.unit}
        </span>
      </div>

      <p className="text-[11px] text-stone-600 leading-snug">
        {indicator.description}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[10px] text-stone-500">
        <span className="flex items-center gap-1 font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
          <Radio className="h-3 w-3 text-teal-600" />
          {indicator.source}
        </span>
        <span className="font-semibold text-stone-600">
          Confidence: <strong className="text-stone-800">{indicator.confidence}</strong>
        </span>
      </div>
    </div>
  );
};
