import React from 'react';
import { ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

interface RiskComparisonCardProps {
  totalStations?: number;
  criticalCount?: number;
  warningCount?: number;
  moderateCount?: number;
  healthyCount?: number;
}

export const RiskComparisonCard: React.FC<RiskComparisonCardProps> = ({
  totalStations = 5260,
  criticalCount = 444,
  warningCount = 780,
  moderateCount = 1624,
  healthyCount = 2412,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const highRiskTotal = criticalCount + warningCount;
  const highRiskPct = Math.round((highRiskTotal / totalStations) * 100);
  const stableTotal = moderateCount + healthyCount;
  const stablePct = Math.round((stableTotal / totalStations) * 100);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-subtle space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-base font-extrabold text-stone-900">
            {t('Network Risk Balance: Stressed vs Resilient Aquifers')}
          </h3>
          <p className="text-xs text-stone-500">
            {t('Proportional distribution across the 5,260 national observation wells')}
          </p>
        </div>
        <button
          onClick={() => navigate('/map')}
          className="inline-flex items-center gap-1 text-xs font-bold text-agri-700 hover:text-agri-900 cursor-pointer"
        >
          <span>{t('Map Distribution')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Comparison Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-rose-700 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t('High Risk & Stressed')}: {highRiskTotal.toLocaleString('en-IN')} ({highRiskPct}%)
          </span>
          <span className="text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('Moderate & Resilient')}: {stableTotal.toLocaleString('en-IN')} ({stablePct}%)
          </span>
        </div>

        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-stone-100 p-0.5 border border-stone-200">
          <div
            style={{ width: `${highRiskPct}%` }}
            className="h-full rounded-l-full bg-gradient-to-r from-rose-600 to-orange-500 transition-all duration-500"
          />
          <div
            style={{ width: `${stablePct}%` }}
            className="h-full rounded-r-full bg-gradient-to-r from-amber-400 to-emerald-600 transition-all duration-500"
          />
        </div>
      </div>

      {/* Grid Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <strong className="text-rose-900 font-extrabold uppercase text-[11px]">
              {t('Vulnerable Zones')} (23.2%)
            </strong>
            <span className="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-800 text-[10px]">
              {t('Active Deficit')}
            </span>
          </div>
          <p className="text-stone-700 text-[11px] leading-relaxed pt-1">
            {t('Concentrated in North-Western alluvial plains (Punjab, Haryana, Rajasthan) and hard-rock peninsular pockets (Kolar, Anantapur). Requires immediate crop substitution and night pumping schedules.')}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <strong className="text-emerald-900 font-extrabold uppercase text-[11px]">
              {t('Recharging & Stable Zones')} (76.8%)
            </strong>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800 text-[10px]">
              {t('Positive Buffer')}
            </span>
          </div>
          <p className="text-stone-700 text-[11px] leading-relaxed pt-1">
            {t('Active in Middle Gangetic Basin (UP, Bihar, West Bengal) and Narmada Valley (MP). Shallow aquifers exhibit +0.3m to +0.5m post-monsoon water table recovery.')}
          </p>
        </div>
      </div>
    </div>
  );
};
