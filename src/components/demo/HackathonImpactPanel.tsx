import React from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';

export const HackathonImpactPanel: React.FC = () => {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div className="border-b border-stone-100 pb-3">
        <h3 className="text-base font-black text-stone-900">
          Problem &amp; Solution Impact (Before vs With JalKrishi AI)
        </h3>
        <p className="text-xs text-stone-500 font-medium">
          Transforming fragmented groundwater measurements into actionable farm sowing decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WITHOUT JalKrishi AI */}
        <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-rose-900 uppercase tracking-wider">
            <XCircle className="h-4 w-4 text-rose-700" />
            <span>Without JalKrishi AI (Traditional Fragmented Flow)</span>
          </div>

          <div className="space-y-2 text-xs text-stone-700 font-medium">
            <div className="p-2.5 rounded-xl bg-white border border-rose-200">
              <strong className="text-rose-950 font-bold block">1. Isolated Sensor Readings:</strong>
              DWLR data stored in raw tables without real-time analytics.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-rose-200">
              <strong className="text-rose-950 font-bold block">2. Manual Interpretation:</strong>
              Depletion trends noticed only after borewell dry-up.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-rose-200">
              <strong className="text-rose-950 font-bold block">3. Generic Agricultural Advice:</strong>
              Cropping choices unaligned with local aquifer capacity.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-rose-200">
              <strong className="text-rose-950 font-bold block">4. Communication Barrier:</strong>
              Technical reports inaccessible to smallholder farmers.
            </div>
          </div>
        </div>

        {/* WITH JalKrishi AI */}
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>With JalKrishi AI (Connected Intelligence Platform)</span>
          </div>

          <div className="space-y-2 text-xs text-stone-700 font-medium">
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
              <strong className="text-emerald-950 font-bold block">1. Automated DWLR Telemetry Audit:</strong>
              12 quality checks validate sensor data integrity in real time.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
              <strong className="text-emerald-950 font-bold block">2. 30-Day Hydrodynamic Forecast:</strong>
              Early Days-to-Critical countdown alerts farmers before crisis.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
              <strong className="text-emerald-950 font-bold block">3. Groundwater-Aware Crop Recommendations:</strong>
              Multi-factor scoring matches crops (Chickpea/Mustard) to water availability.
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
              <strong className="text-emerald-950 font-bold block">4. Conversational WhatsApp Assistant:</strong>
              Instant bilingual guidance accessible on any mobile phone.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
