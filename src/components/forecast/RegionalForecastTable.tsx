import React from 'react';
import { MapPin, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { RegionalForecastOutlook } from '../../data/mockForecasts';
import { useLanguage } from '../../context/LanguageContext';

interface RegionalForecastTableProps {
  outlooks: RegionalForecastOutlook[];
  onSelectState?: (state: string) => void;
}

export const RegionalForecastTable: React.FC<RegionalForecastTableProps> = ({
  outlooks,
  onSelectState,
}) => {
  const { t } = useLanguage();
  const getRiskBadge = (risk: RegionalForecastOutlook['riskLevel']) => {
    switch (risk) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Lower':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Regional Groundwater Outlook (90-Day Projections)')}
        subtitle={t('Comparative state-level forecast trajectory, rainfall expectation, and agronomic priority actions')}
        icon={<MapPin className="h-5 w-5 text-water-700" />}
      />

      <div className="rounded-2xl border border-stone-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[11px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">{t('State')}</th>
                <th className="px-4 py-3">{t('Observation Wells')}</th>
                <th className="px-4 py-3">{t('Current Avg Depth')}</th>
                <th className="px-4 py-3">{t('Current Trend')}</th>
                <th className="px-4 py-3">{t('Risk Level')}</th>
                <th className="px-4 py-3">{t('90-Day Forecast Direction')}</th>
                <th className="px-4 py-3">{t('Priority Agronomic Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {outlooks.map((item) => (
                <tr
                  key={item.state}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectState?.(item.state)}
                >
                  <td className="px-4 py-3">
                    <span className="font-extrabold text-stone-900">{t(item.state)}</span>
                  </td>

                  <td className="px-4 py-3 font-mono text-stone-600">
                    {item.totalStations} DWLR
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-stone-900">
                    {item.currentAvgDepth} mbgl
                  </td>

                  <td className="px-4 py-3 font-bold">
                    {item.trend === 'falling' ? (
                      <span className="text-rose-700 inline-flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {t('Falling')}
                      </span>
                    ) : item.trend === 'rising' ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {t('Rising')}
                      </span>
                    ) : (
                      <span className="text-stone-600 inline-flex items-center gap-1">
                        <Minus className="h-3.5 w-3.5" />
                        {t('Stable')}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getRiskBadge(
                        item.riskLevel
                      )}`}
                    >
                      {t(item.riskLevel)}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-stone-900">
                    {t(item.forecast90d)}
                  </td>

                  <td className="px-4 py-3 text-xs text-stone-600 max-w-xs">
                    {t(item.priorityAction)}
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
