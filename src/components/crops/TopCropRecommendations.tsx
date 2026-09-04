import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Award,
  Droplets,
  CheckCircle2,
  ArrowRight,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import type { CropRecommendation } from '../../types';
import { SectionHeader } from '../common/SectionHeader';

interface TopCropRecommendationsProps {
  crops: CropRecommendation[];
  onSelectCrop: (crop: CropRecommendation) => void;
}

export const TopCropRecommendations: React.FC<TopCropRecommendationsProps> = ({
  crops,
onSelectCrop,
}) => {
  const { t } = useLanguage();
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return {
          rank: 'Rank #1',
          medal: '🥇',
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          accent: 'border-agri-600 ring-2 ring-agri-500/20 shadow-elevated',
        };
      case 1:
        return {
          rank: 'Rank #2',
          medal: '🥈',
          bg: 'bg-stone-50 border-stone-300 text-stone-900',
          accent: 'border-stone-300 shadow-subtle',
        };
      case 2:
      default:
        return {
          rank: 'Rank #3',
          medal: '🥉',
          bg: 'bg-orange-50 border-orange-300 text-orange-900',
          accent: 'border-stone-300 shadow-subtle',
        };
    }
  };

  const getWaterMeter = (water: CropRecommendation['waterRequirement']) => {
    switch (water) {
      case 'Low':
        return {
          label: 'Low Water Draw',
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          bars: 1,
        };
      case 'Medium':
        return {
          label: 'Medium Water Need',
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          bars: 2,
        };
      case 'High':
      case 'Very High':
      default:
        return {
          label: 'High Water Demand',
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          bars: 3,
        };
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Top 3 Recommended Crops for Your Farm')}
        subtitle={t('Ranked options delivering optimal harvest stability and lowest groundwater depletion risk')}
        icon={<Award className="h-5 w-5 text-amber-600" />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {crops.map((crop, idx) => {
          const rank = getRankBadge(idx);
          const water = getWaterMeter(crop.waterRequirement);

          return (
            <div
              key={crop.id}
              onClick={() => onSelectCrop(crop)}
              className={`flex flex-col justify-between rounded-3xl border bg-white p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated cursor-pointer ${rank.accent}`}
            >
              <div>
                {/* Header: Rank + Suitability Score */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase ${rank.bg}`}
                  >
                    <span>{rank.medal}</span>
                    <span>{rank.rank}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black text-agri-800 font-mono">
                      {crop.suitabilityScore}%
                    </span>
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Match</span>
                  </div>
                </div>

                {/* Crop Name */}
                <div className="mt-3.5">
                  <h3 className="text-lg font-black text-stone-900 leading-snug">
                    {crop.name}
                  </h3>
                  {crop.hindiName && (
                    <span className="text-xs font-semibold text-agri-700">{crop.hindiName}</span>
                  )}
                </div>

                {/* Key Metadata Tags */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-bold ${water.color}`}>
                    <Droplets className="h-3 w-3" />
                    {water.label} ({crop.waterRequirementMm}mm)
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-0.5 font-semibold text-stone-700">
                    <Sun className="h-3 w-3 text-amber-500" />
                    {crop.season}
                  </span>
                </div>

                {/* Dynamic Reasons Bullet Points */}
                <div className="mt-4 space-y-2 rounded-2xl bg-stone-50/80 p-3.5 text-xs border border-stone-200/80">
                  <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                    Why We Recommend This Crop:
                  </span>
                  <ul className="space-y-1.5 text-stone-700 font-medium">
                    {(crop.bulletReasons || [crop.reason]).slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-snug">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-agri-700" />
                  {crop.groundwaterImpact}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCrop(crop);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-stone-800 shadow-xs cursor-pointer"
                >
                  <span>{t('Crop Details')}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
