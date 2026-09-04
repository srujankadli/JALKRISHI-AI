import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, TrendingDown, MapPin, Sprout, Radio } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const FarmerAnomalyActionCenter: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Recommended Next Steps')}
        subtitle={t('Actionable guidance for farmers and field officials when unusual signals are detected')}
        icon={<CheckCircle2 className="h-5 w-5 text-agri-700" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Sudden Drawdown */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-white p-4.5 shadow-subtle space-y-3">
          <div>
            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
              {t('Water Drop')}
            </span>
            <h4 className="mt-2 text-sm font-extrabold text-stone-900">
              {t('Check Groundwater Forecast')}
            </h4>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              {t('Review projected days-to-critical and consider adjusting pumping intervals or pump depth.')}
            </p>
          </div>

          <button
            onClick={() => navigate('/forecast')}
            className="w-full flex items-center justify-center gap-1 rounded-xl bg-rose-700 py-2 text-xs font-bold text-white hover:bg-rose-800 transition-all shadow-xs cursor-pointer"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>{t('Open Forecast')}</span>
          </button>
        </div>

        {/* 2. Over-Extraction Wave */}
        <div className="flex flex-col justify-between rounded-2xl border border-orange-200 bg-white p-4.5 shadow-subtle space-y-3">
          <div>
            <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 uppercase">
              {t('Abnormal Extraction')}
            </span>
            <h4 className="mt-2 text-sm font-extrabold text-stone-900">
              {t('Inspect Neighboring Stations')}
            </h4>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              {t('Explore nearby monitoring stations on the map to determine whether the drop is localized or spread across the block.')}
            </p>
          </div>

          <button
            onClick={() => navigate('/map')}
            className="w-full flex items-center justify-center gap-1 rounded-xl bg-orange-700 py-2 text-xs font-bold text-white hover:bg-orange-800 transition-all shadow-xs cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>{t('View on Map')}</span>
          </button>
        </div>

        {/* 3. Missing Telemetry */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-4.5 shadow-subtle space-y-3">
          <div>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
              {t('Data Quality')}
            </span>
            <h4 className="mt-2 text-sm font-extrabold text-stone-900">
              {t('Verify Latest Observations')}
            </h4>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              {t('Check station telemetry status and wait for verification before planning critical irrigation changes.')}
            </p>
          </div>

          <button
            onClick={() => navigate('/map')}
            className="w-full flex items-center justify-center gap-1 rounded-xl bg-amber-700 py-2 text-xs font-bold text-white hover:bg-amber-800 transition-all shadow-xs cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>{t('Check Station Status')}</span>
          </button>
        </div>

        {/* 4. Sudden Recharge */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-white p-4.5 shadow-subtle space-y-3">
          <div>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
              {t('Recharge Surge')}
            </span>
            <h4 className="mt-2 text-sm font-extrabold text-stone-900">
              {t('Optimize Crop Planning')}
            </h4>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              {t('Assess soil moisture and explore suitable crop rotation options to take advantage of improved water availability.')}
            </p>
          </div>

          <button
            onClick={() => navigate('/crops')}
            className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-800 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-all shadow-xs cursor-pointer"
          >
            <Sprout className="h-3.5 w-3.5" />
            <span>{t('Crop Advisor')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
