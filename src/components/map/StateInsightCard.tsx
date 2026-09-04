import React from 'react';
import { Info, MapPin } from 'lucide-react';
import type { StateStationSummary } from '../../services/stationService';
import { useLanguage } from '../../context/LanguageContext';

interface StateInsightCardProps {
  summary: StateStationSummary | null;
  onClearState: () => void;
}

export const StateInsightCard: React.FC<StateInsightCardProps> = ({
  summary,
}) => {
  const { t } = useLanguage();
  if (!summary) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4.5 shadow-subtle animate-fadeIn space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-agri-100 p-1.5 text-agri-800">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-stone-900 leading-tight">
              {summary.state} {t('Hydrogeological Profile')}
            </h3>
            <p className="text-xs text-stone-500">
              {summary.total} {t('DWLR Monitored Observation Wells')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-700">
            {t('Avg Depth')}: <strong>{summary.avgDepth} mbgl</strong>
          </span>
        </div>
      </div>

      {/* State status distribution mini-bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
          <span className="text-[10px] text-emerald-800 font-bold block uppercase">{t('Healthy')}</span>
          <span className="font-extrabold text-emerald-950 text-sm">{summary.healthy}</span>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
          <span className="text-[10px] text-amber-800 font-bold block uppercase">{t('Moderate')}</span>
          <span className="font-extrabold text-amber-950 text-sm">{summary.moderate}</span>
        </div>
        <div className="rounded-lg bg-orange-50 p-2 border border-orange-200">
          <span className="text-[10px] text-orange-800 font-bold block uppercase">{t('Warning')}</span>
          <span className="font-extrabold text-orange-950 text-sm">{summary.warning}</span>
        </div>
        <div className="rounded-lg bg-rose-50 p-2 border border-rose-200">
          <span className="text-[10px] text-rose-800 font-bold block uppercase">{t('Critical')}</span>
          <span className="font-extrabold text-rose-950 text-sm">{summary.critical}</span>
        </div>
      </div>

      {/* Stress Insight Note */}
      <div className="rounded-xl border border-agri-200 bg-agri-50/60 p-3 text-xs text-agri-950">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-agri-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-bold text-agri-950">{t('Regional Analysis')}: </strong>
            {summary.stressInsight}
          </p>
        </div>
      </div>
    </div>
  );
};
