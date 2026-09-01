import React from 'react';
import { Award, Users, Target, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const AboutHackstackCard: React.FC = () => {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="About the Project & Team HACKSTACK"
        subtitle="Developed for the Smart Horizon 2026 International Hackathon"
        icon={<Award className="h-5 w-5 text-amber-600" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-stone-900 px-2.5 py-0.5 text-xs font-black text-white font-mono">
                SH-AGR-005
              </span>
              <span className="rounded-md bg-agri-100 px-2.5 py-0.5 text-xs font-bold text-agri-800">
                Team HACKSTACK
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black text-stone-900">
              Real-Time Groundwater Resource Evaluation Using DWLR Data
            </h3>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-stone-400 block">Competition:</span>
            <span className="text-sm font-extrabold text-stone-900">
              Smart Horizon 2026 &bull; 48-Hour International Hackathon
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Target className="h-4 w-4 text-agri-700" />
              <span>Core Mission</span>
            </div>
            <p className="text-stone-600 leading-relaxed font-medium">
              Bridging the critical gap between complex hydrological sensor telemetry and everyday agricultural sowing decisions for Indian farmers.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Users className="h-4 w-4 text-water-700" />
              <span>Target Stakeholders</span>
            </div>
            <p className="text-stone-600 leading-relaxed font-medium">
              Farmers, Krishi Vigyan Kendra (KVK) agronomists, district water resource officers, policy planners, and groundwater researchers.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>Implementation Scope</span>
            </div>
            <p className="text-stone-600 leading-relaxed font-medium">
              Complete, verified frontend architecture with interactive mapping, forecasting, anomaly triage, crop advisory, and multi-format report exports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
