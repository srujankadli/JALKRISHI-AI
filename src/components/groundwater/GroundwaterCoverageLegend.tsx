import React from 'react';
import { Radio, Satellite, Info, ShieldCheck } from 'lucide-react';

export const GroundwaterCoverageLegend: React.FC = () => {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle space-y-3">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
          <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
            Groundwater Intelligence Coverage Legend
          </h4>
        </div>
        <span className="text-[10px] font-bold text-stone-500 font-mono">Radius: 15.0 km</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* 1. Direct DWLR Measurement */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block leading-tight">
              Direct Measurement
            </span>
            <p className="text-[10px] text-slate-600 leading-snug mt-0.5">
              DWLR observation well within 15.0 km. Hydrostatic pressure sensor telemetry.
            </p>
          </div>
        </div>

        {/* 2. Satellite-Assisted Estimate */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-teal-50/70 border border-teal-200">
          <div className="h-7 w-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Satellite className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-teal-950 block leading-tight">
              Satellite-Assisted Estimate
            </span>
            <p className="text-[10px] text-teal-800 leading-snug mt-0.5">
              Remote-sensing indicators, thermal stress, rainfall signals &amp; nearby DWLR trends.
            </p>
          </div>
        </div>

        {/* 3. Limited Confidence */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="h-7 w-7 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-amber-950 block leading-tight">
              Limited Confidence
            </span>
            <p className="text-[10px] text-amber-900 leading-snug mt-0.5">
              Distance &gt; 50 km from nearest DWLR well. Higher uncertainty envelope.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
