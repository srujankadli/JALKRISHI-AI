import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, AlertCircle, Droplets, ArrowRight } from 'lucide-react';
import type { CropRecommendation } from '../../types';
import { SectionHeader } from '../common/SectionHeader';

interface NotRecommendedCropsProps {
  crops: CropRecommendation[];
  onSelectCrop: (crop: CropRecommendation) => void;
}

export const NotRecommendedCrops: React.FC<NotRecommendedCropsProps> = ({
  crops,
onSelectCrop,
}) => {
  const { t } = useLanguage();
  if (crops.length === 0) return null;

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Crops Not Recommended Under Current Conditions')}
        subtitle={t('Crops with excessive water footprint or poor season/soil alignment that increase borewell failure risk')}
        icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {crops.map((crop) => (
          <div
            key={crop.id}
            onClick={() => onSelectCrop(crop)}
            className="flex flex-col justify-between rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-white p-5 shadow-subtle transition-all hover:shadow-elevated cursor-pointer"
          >
            <div>
              {/* Header: Score & Risk Label */}
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                <span className="rounded-md bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-black uppercase text-rose-800">
                  {crop.statusLabel}
                </span>

                <span className="font-mono text-base font-black text-rose-700">
                  {crop.suitabilityScore}% Match
                </span>
              </div>

              {/* Crop Title */}
              <div className="mt-3">
                <h4 className="text-base font-extrabold text-stone-900 leading-snug">
                  {crop.name}
                </h4>
                {crop.hindiName && (
                  <span className="text-xs text-stone-500">{crop.hindiName}</span>
                )}
              </div>

              {/* High Water Indicator */}
              <div className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-800">
                <Droplets className="h-3.5 w-3.5" />
                <span>Heavy Water Demand: {crop.waterRequirementMm} mm</span>
              </div>

              {/* Negative Bullet Reasons */}
              <div className="mt-3 rounded-2xl bg-rose-50/60 p-3 text-xs border border-rose-200/60 space-y-1.5">
                <span className="text-[10px] font-extrabold text-rose-900 uppercase block">
                  Why Not Recommended:
                </span>
                <ul className="space-y-1 text-stone-700 font-medium text-[11px]">
                  {(crop.warnings || [crop.reason]).slice(0, 2).map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Inspect Button */}
            <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCrop(crop);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
              >
                <span>{t('View Risk Analysis')}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
