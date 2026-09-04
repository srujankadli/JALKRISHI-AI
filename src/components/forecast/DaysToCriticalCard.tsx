import React from 'react';
import { Clock, AlertTriangle, AlertCircle, Eye, ShieldCheck, Info } from 'lucide-react';
import type { DaysToCriticalBreakdown } from '../../data/mockForecasts';
import { useLanguage } from '../../context/LanguageContext';

interface DaysToCriticalCardProps {
  brackets: DaysToCriticalBreakdown[];
  onSelectRange?: (range: string) => void;
}

export const DaysToCriticalCard: React.FC<DaysToCriticalCardProps> = ({
  brackets,
  onSelectRange,
}) => {
  const { t } = useLanguage();
  const getSeverityStyle = (severity: DaysToCriticalBreakdown['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          barBg: 'bg-rose-600',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          cardBorder: 'border-rose-300 bg-rose-50/40',
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
        };
      case 'high':
        return {
          barBg: 'bg-orange-500',
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
          cardBorder: 'border-orange-200 bg-orange-50/30',
          icon: AlertCircle,
          iconColor: 'text-orange-600',
        };
      case 'watch':
        return {
          barBg: 'bg-amber-500',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          cardBorder: 'border-amber-200 bg-amber-50/30',
          icon: Eye,
          iconColor: 'text-amber-600',
        };
      case 'safe':
      default:
        return {
          barBg: 'bg-emerald-600',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          cardBorder: 'border-emerald-200 bg-emerald-50/30',
          icon: ShieldCheck,
          iconColor: 'text-emerald-600',
        };
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-subtle sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-rose-600" />
            {t('Vulnerability Time-Horizon')}
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-black text-stone-900">
            {t('Days-to-Critical Projection Indicator')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            {t('Estimated time before groundwater depth reaches critical extraction limits if current depletion rates continue.')}
          </p>
        </div>

        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 self-start sm:self-auto">
          5,260 {t('Observation Wells Evaluated')}
        </span>
      </div>

      {/* Visual Multi-Segment Distribution Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>{t('National Network Breakdown by Days Remaining')}</span>
          <span className="font-mono text-stone-800">4 {t('Severity Brackets')}</span>
        </div>

        <div
          className="flex h-4 w-full overflow-hidden rounded-full bg-stone-100 p-0.5 border border-stone-200"
          role="progressbar"
          aria-label={t('Days to critical distribution')}
        >
          {brackets.map((b) => {
            const style = getSeverityStyle(b.severity);
            return (
              <div
                key={b.range}
                style={{ width: `${b.percentage}%` }}
                className={`h-full transition-all duration-500 ${style.barBg}`}
                title={`${b.range} (${t(b.label)}): ${b.count} ${t('wells')} (${b.percentage}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* 4 Detailed Severity Bracket Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {brackets.map((b) => {
          const style = getSeverityStyle(b.severity);
          const Icon = style.icon;
          return (
            <div
              key={b.range}
              onClick={() => onSelectRange?.(b.range)}
              className={`rounded-xl border p-4 transition-all hover:shadow-subtle ${style.cardBorder} cursor-pointer flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase ${style.badge}`}>
                    {t(b.label)}
                  </span>
                  <Icon className={`h-4 w-4 ${style.iconColor}`} />
                </div>

                <div className="mt-3">
                  <span className="text-xl font-black text-stone-900 font-mono">
                    {b.range}
                  </span>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    <strong className="text-stone-900 font-bold">{b.count}</strong> {t('wells')} ({b.percentage}%)
                  </p>
                </div>

                <p className="mt-2 text-xs text-stone-700 leading-snug">
                  {t(b.farmerDescription)}
                </p>
              </div>

              <div className="mt-3.5 border-t border-stone-200/60 pt-2 text-[11px] font-semibold text-agri-900">
                🌱 {t(b.actionRequired)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transparency Note */}
      <div className="flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 border border-stone-200">
        <Info className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
        <p>
          <strong className="text-stone-800">{t('Forecast Note')}: </strong>
          {t('Days-to-critical estimates are calculated from current hydrostatic drawdown slope and historical monsoon infiltration response. Projections adapt dynamically as seasonal rainfall and pumping patterns change.')}
        </p>
      </div>
    </div>
  );
};
