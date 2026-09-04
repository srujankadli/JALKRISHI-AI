import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { Sprout, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

interface AgriculturalWaterOutlookProps {
  criticalPct: number;
  avgDepth: number;
  regionLabel: string;
  onNavigateToCrops: () => void;
}

export const AgriculturalWaterOutlook: React.FC<AgriculturalWaterOutlookProps> = ({
  criticalPct,
  avgDepth,
  regionLabel,
  onNavigateToCrops,
}) => {
  const { t } = useLanguage();
  const isHighStress = criticalPct > 15 || avgDepth > 25;
  const isModerateStress = criticalPct > 8 || avgDepth > 18;

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Agricultural Groundwater Vulnerability & Sowing Implications')}
        subtitle={t('Translating sub-surface hydrogeology into seasonal crop planning decisions')}
        icon={<Sprout className="h-5 w-5 text-agri-700" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            {isHighStress ? (
              <span className="rounded-md bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-black text-rose-800 uppercase flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                Severe Groundwater Depletion Zone
              </span>
            ) : isModerateStress ? (
              <span className="rounded-md bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-800 uppercase flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Moderate Extraction Stress
              </span>
            ) : (
              <span className="rounded-md bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs font-black text-emerald-800 uppercase flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Adequate Hydrogeological Buffer
              </span>
            )}
            <span className="text-xs text-stone-500 font-bold">{regionLabel}</span>
          </div>

          <h4 className="text-base font-black text-stone-900">
            {isHighStress
              ? 'Urgent Shift to Drought-Tolerant Pulses & Millets Advised'
              : isModerateStress
              ? 'Controlled Irrigation & Micro-Drip Adoption Recommended'
              : 'Standard Seasonal Cropping Rotation Viable'}
          </h4>

          <p className="text-xs text-stone-600 leading-relaxed">
            {isHighStress
              ? `Elevated drawdown across ${criticalPct}% of monitored wells indicates acute cone of depression risks. Flooded paddy or summer maize will trigger pump cavitation before harvest. Switching to Chana, Bajra, or Mustard protects farmer capital.`
              : isModerateStress
              ? `Water table depth averaging ${avgDepth} mbgl requires strict scheduling of night-time irrigation and laser land leveling to avoid entering the critical depletion bracket.`
              : `Aquifer recharge is stable with low vulnerability. Farmers can proceed with balanced cereal and legume rotations with supplemental moisture checks.`}
          </p>
        </div>

        <button
          onClick={onNavigateToCrops}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-agri-700 px-6 py-3 text-xs font-black text-white hover:bg-agri-800 shadow-elevated transition-all cursor-pointer shrink-0"
        >
          <span>{t('Open Smart Crop Advisor')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
