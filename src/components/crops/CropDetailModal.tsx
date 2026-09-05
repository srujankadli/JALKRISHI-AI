import React from 'react';
import {
  X,
  Droplets,
  Sprout,
  AlertCircle,
  CheckCircle2,
  MapPin,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import type { CropRecommendation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface CropDetailModalProps {
  crop: CropRecommendation | null;
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToForecast: () => void;
}

export const CropDetailModal: React.FC<CropDetailModalProps> = ({
  crop,
  onClose,
  onNavigateToMap,
  onNavigateToForecast,
}) => {
  const { t } = useLanguage();
  if (!crop) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="pr-10 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-black uppercase ${
                crop.isRecommended
                  ? 'bg-agri-100 text-agri-900 border border-agri-200'
                  : 'bg-rose-100 text-rose-900 border border-rose-200'
              }`}
            >
              <Sprout className="h-3.5 w-3.5" />
              {t(crop.statusLabel)}
            </span>

            <span className="font-mono text-xs font-bold text-stone-600">
              {t(crop.cropCategory || 'Field Crop')}
            </span>
          </div>

          <h2 className="text-2xl font-black text-stone-900 pt-1">
            {t(crop.name)}
          </h2>
          {crop.hindiName && (
            <p className="text-sm font-semibold text-agri-700">{crop.hindiName}</p>
          )}
        </div>

        {/* Key Agronomic Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t('Match Score')}</span>
            <strong className="text-xl font-black text-agri-800 font-mono">
              {crop.suitabilityScore}%
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t('Water Need')}</span>
            <strong className="text-sm font-bold text-stone-900 flex items-center gap-1 mt-0.5">
              <Droplets className="h-3.5 w-3.5 text-water-700" />
              {crop.waterRequirementMm} mm
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t('Duration')}</span>
            <strong className="text-sm font-bold text-stone-900 font-mono mt-0.5 block">
              {t(crop.durationDays || '90 - 110 days')}
            </strong>
          </div>

          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t('Root Depth')}</span>
            <strong className="text-sm font-bold text-stone-900 mt-0.5 block">
              {t(crop.rootDepth || '80 - 110 cm')}
            </strong>
          </div>
        </div>

        {/* Why We Recommend It or Why Not */}
        <div
          className={`rounded-2xl border p-4 text-xs space-y-2 ${
            crop.isRecommended
              ? 'border-agri-200 bg-agri-50/70 text-agri-950'
              : 'border-rose-200 bg-rose-50/70 text-rose-950'
          }`}
        >
          <span className="font-extrabold uppercase text-[11px] block">
            {crop.isRecommended ? `🌾 ${t('Why We Recommend This Crop:')}` : `⚠️ ${t('Why This Crop is Not Recommended:')}`}
          </span>
          <ul className="space-y-1.5 font-medium leading-relaxed">
            {(crop.bulletReasons || [crop.reason]).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                {crop.isRecommended ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{t(r)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Irrigation Strategy */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <Activity className="h-4 w-4 text-water-700" />
            <span>{t('Recommended Irrigation & Water-Saving Strategy:')}</span>
          </div>
          <p className="text-stone-700 leading-relaxed font-medium">
            {t(crop.irrigationStrategy)}
          </p>
          <div className="pt-1.5 flex items-center gap-1 text-[11px] font-bold text-agri-800">
            <ShieldCheck className="h-3.5 w-3.5 text-agri-600" />
            <span>{t('Aquifer Impact:')} {t(crop.groundwaterImpact)}</span>
          </div>
        </div>

        {/* Things to Watch (Warnings) */}
        {crop.warnings && crop.warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-950 space-y-1">
            <span className="font-extrabold uppercase text-[10px] text-amber-900 block">
              🛡️ {t('Agronomic Management & Things to Watch:')}
            </span>
            <ul className="space-y-1 font-medium text-[11px] text-stone-800">
              {crop.warnings.map((w, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">&bull;</span>
                  <span>{t(w)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            {t('Close')}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigateToMap();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 shadow-xs cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 text-stone-600" />
              <span>{t('Check Groundwater Map')}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onNavigateToForecast();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-agri-700 px-4 py-2 text-xs font-bold text-white hover:bg-agri-800 shadow-xs cursor-pointer"
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>{t('View Water Forecast')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
