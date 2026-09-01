import React from 'react';
import { Droplets, ShieldCheck, Eye, AlertTriangle, ShieldAlert } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const GroundwaterStatusGuide: React.FC = () => {
  const statuses = [
    {
      level: 'HEALTHY (SAFE)',
      color: 'border-emerald-300 bg-emerald-50/60 text-emerald-950',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: ShieldCheck,
      depthRange: '< 15 meters below ground level (mbgl)',
      meaning: 'Aquifer water table is shallow with steady seasonal recharge. Hydrostatic head pressure is robust.',
      whatToWatch: 'Maintain standard canal and rainwater recharge structures. Monitor for seasonal drawdown swings.',
      suggestedAction: 'Balanced crop rotations (cereals, legumes, oilseeds) are fully viable with regular moisture checks.',
    },
    {
      level: 'MODERATE',
      color: 'border-amber-300 bg-amber-50/60 text-amber-950',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: Eye,
      depthRange: '15 – 22 meters below ground level (mbgl)',
      meaning: 'Water reserves are adequate for current seasonal demands, but buffer is sensitive to monsoon deficits.',
      whatToWatch: 'Track weekly drawdown velocity and check local rainfall departure indicators.',
      suggestedAction: 'Adopt laser land leveling and micro-sprinklers. Avoid high-water summer crops if pre-monsoon rain is low.',
    },
    {
      level: 'WARNING (ELEVATED DRAW)',
      color: 'border-orange-300 bg-orange-50/60 text-orange-950',
      badge: 'bg-orange-100 text-orange-900 border-orange-300',
      icon: AlertTriangle,
      depthRange: '22 – 28 meters below ground level (mbgl)',
      meaning: 'Significant drawdown detected. Pumping rates exceed localized natural recharge velocity.',
      whatToWatch: 'Rising tube-well electricity draw and falling discharge liters per minute.',
      suggestedAction: 'Implement night-time irrigation rosters. Shift toward low-water pulses (Chana/Moong) or millets (Bajra/Jowar).',
    },
    {
      level: 'CRITICAL (SEVERE DEPLETION)',
      color: 'border-rose-300 bg-rose-50/60 text-rose-950',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      icon: ShieldAlert,
      depthRange: '> 28 mbgl or < 30 Days-to-Critical Limit',
      meaning: 'Acute aquifer stress. Water table is approaching the critical pump head failure threshold.',
      whatToWatch: 'Risk of borewell pump cavitation, suction loss, and neighborhood well dry-up.',
      suggestedAction: 'Urgent restriction on flooded paddy or sugarcane. Switch entirely to drought-hardy crops and drip irrigation.',
    },
  ];

  return (
    <div id="status-guide" className="space-y-4">
      <SectionHeader
        title="Understanding Groundwater Status Levels"
        subtitle="Hydrogeological definitions, depth ranges, and practical actions for each alert tier"
        icon={<Droplets className="h-5 w-5 text-water-700" />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {statuses.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.level}
              className={`rounded-3xl border p-5 shadow-subtle flex flex-col justify-between space-y-3 ${st.color}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                  <span className={`rounded-md border px-2.5 py-0.5 text-xs font-black uppercase flex items-center gap-1 ${st.badge}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {st.level}
                  </span>
                  <span className="font-mono text-xs font-bold text-stone-600">
                    {st.depthRange}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-800 pt-1">
                  <p>
                    <strong className="text-stone-900 block font-bold">Hydrogeological Meaning:</strong>
                    {st.meaning}
                  </p>
                  <p>
                    <strong className="text-stone-900 block font-bold">What to Watch:</strong>
                    {st.whatToWatch}
                  </p>
                  <p>
                    <strong className="text-stone-900 block font-bold">Suggested Farmer Action:</strong>
                    {st.suggestedAction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
