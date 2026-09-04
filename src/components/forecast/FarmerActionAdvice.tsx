import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, MapPin, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { useLanguage } from '../../context/LanguageContext';

export const FarmerActionAdvice: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Recommended Farmer Actions: What Should You Do?')}
        subtitle={t('Practical agronomic strategies matched to your local water trajectory')}
        icon={<CheckCircle2 className="h-5 w-5 text-agri-700" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* High Risk / Critical Zones */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50/50 via-white to-white p-5 shadow-subtle space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-800 uppercase">
                {t('High Risk / Critical')}
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>

            <h4 className="mt-3 text-base font-bold text-stone-900">
              {t('Aquifers Depleting < 30 Days')}
            </h4>

            <ul className="mt-2.5 space-y-2 text-xs text-stone-700">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">&bull;</span>
                <span><strong>{t('Crop Switch')}:</strong> {t('Transition from paddy/sugarcane to short-duration pulses (Chickpea, Moong) or Bajra.')}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">&bull;</span>
                <span><strong>{t('Irrigation Shifts')}:</strong> {t('Strict deficit irrigation. Run tube-wells only at night to reduce evaporation loss.')}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">&bull;</span>
                <span><strong>{t('Micro-Irrigation')}:</strong> {t('Implement drip lines to achieve 40% water savings.')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-stone-100">
            <button
              onClick={() => navigate('/crops')}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 py-2 px-3 text-xs font-bold text-white hover:bg-rose-800 transition-all shadow-xs cursor-pointer"
            >
              <Sprout className="h-3.5 w-3.5" />
              <span>{t('Explore Water-Smart Crops')}</span>
            </button>
          </div>
        </div>

        {/* Moderate / Watch Zones */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-white p-5 shadow-subtle space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 uppercase">
                {t('Moderate / Watch')}
              </span>
              <span className="text-amber-600 font-bold text-xs">{t('30–60 Days')}</span>
            </div>

            <h4 className="mt-3 text-base font-bold text-stone-900">
              {t('Manageable Drawdown Zones')}
            </h4>

            <ul className="mt-2.5 space-y-2 text-xs text-stone-700">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">&bull;</span>
                <span><strong>{t('Moisture Monitoring')}:</strong> {t('Test soil moisture before turning on pumps; avoid over-saturation.')}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">&bull;</span>
                <span><strong>{t('Crop Rotation')}:</strong> {t('Adopt mixed cropping (Maize + Pulses) to balance root-zone moisture draw.')}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">&bull;</span>
                <span><strong>{t('Field Bunding')}:</strong> {t('Maintain 30cm contour bunds to capture monsoon surface runoff.')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-stone-100">
            <button
              onClick={() => navigate('/map')}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-700 py-2 px-3 text-xs font-bold text-white hover:bg-amber-800 transition-all shadow-xs cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>{t('Track Station on Map')}</span>
            </button>
          </div>
        </div>

        {/* Resilient / Lower Risk Zones */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-subtle space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 uppercase">
                {t('Lower Risk / Stable')}
              </span>
              <span className="text-emerald-600 font-bold text-xs">{t('60+ Days')}</span>
            </div>

            <h4 className="mt-3 text-base font-bold text-stone-900">
              {t('Healthy & Recharging Aquifers')}
            </h4>

            <ul className="mt-2.5 space-y-2 text-xs text-stone-700">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">&bull;</span>
                <span><strong>{t('Full Sowing Cycle')}:</strong> {t('Favorable soil moisture for diversified commercial rotations.')}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">&bull;</span>
                <span><strong>{t('Recharge Maintenance')}:</strong> {t('Clear silt from percolation tanks and farm recharge shafts.')}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">&bull;</span>
                <span><strong>{t('Telemetry Tracking')}:</strong> {t('Stay alert for sudden pumping anomalies during peak flowering.')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-stone-100">
            <button
              onClick={() => navigate('/anomalies')}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2 px-3 text-xs font-bold text-white hover:bg-emerald-900 transition-all shadow-xs cursor-pointer"
            >
              <span>{t('View Active Alerts')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
