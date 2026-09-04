import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Layers, ArrowRight } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { CropRecommendation } from '../../types';

interface CropComparisonTableProps {
  crops: CropRecommendation[];
  onSelectCrop: (crop: CropRecommendation) => void;
}

export const CropComparisonTable: React.FC<CropComparisonTableProps> = ({
  crops,
onSelectCrop,
}) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Compare Recommended Crops Side-by-Side')}
        subtitle={t('Evaluate water consumption, maturity duration, and expected yield potential')}
        icon={<Layers className="h-5 w-5 text-water-700" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[11px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">{t('Crop Name')}</th>
                <th className="px-4 py-3">{t('Match Score')}</th>
                <th className="px-4 py-3">{t('Water Demand')}</th>
                <th className="px-4 py-3">{t('Duration')}</th>
                <th className="px-4 py-3">Expected Yield</th>
                <th className="px-4 py-3">Groundwater Impact</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {crops.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectCrop(c)}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-stone-900">{c.name}</div>
                    {c.hindiName && (
                      <div className="text-xs text-agri-700">{c.hindiName}</div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-black text-agri-800">
                    {c.suitabilityScore}%
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                        c.waterRequirement === 'Low'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.waterRequirement === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {c.waterRequirement} ({c.waterRequirementMm}mm)
                    </span>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-stone-600">
                    {c.durationDays || '90 - 110 days'}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-stone-700">
                    {c.expectedYieldPotential}
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="text-xs font-bold text-stone-700">
                      {c.groundwaterImpact}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCrop(c);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
                    >
                      <span>View</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
