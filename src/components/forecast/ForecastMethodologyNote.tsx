import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ForecastMethodologyNote: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4.5 text-xs text-stone-700 space-y-2">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 font-extrabold text-stone-900">
          <Info className="h-4 w-4 text-water-700" />
          <span>{t('How JalKrishi AI Groundwater Forecasts Work (Methodology & Transparency)')}</span>
        </div>
        <button className="text-stone-500 hover:text-stone-800 cursor-pointer">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-[11px] text-stone-600 leading-relaxed">
        {t('The groundwater forecasts combine DWLR time-series drawdown velocity, seasonal precipitation forecasts, and soil-aquifer infiltration parameters to estimate future water table depths and days-to-critical thresholds.')}
      </p>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-2 text-[11px] text-stone-600 animate-fadeIn">
          <div>
            <strong className="text-stone-900">{t('1. Drawdown Velocity Model')}: </strong>
            {t('Calculates 30-day moving average depletion slope (m/month) based on telemetry hydrostatic head pressure records.')}
          </div>
          <div>
            <strong className="text-stone-900">{t('2. Days-to-Critical Threshold')}: </strong>
            {t('Estimated as (Current Depth - Critical Threshold) / Daily Depletion Rate, bounded by seasonal rainfall recharge coefficients.')}
          </div>
          <div>
            <strong className="text-stone-900">{t('3. Uncertainty & Confidence Envelope')}: </strong>
            {t('Upper and lower bands expand over 30–90 days to transparently reflect variability in monsoon arrival and unmetered pump extraction surges.')}
          </div>
          <div>
            <strong className="text-stone-900">{t('4. Data Disclaimer')}: </strong>
            {t('All values displayed are simulated DWLR data intended for model evaluation and operational planning. Future phases will integrate live CGWB REST telemetry endpoints and IMD meteorological grids.')}
          </div>
        </div>
      )}
    </div>
  );
};
