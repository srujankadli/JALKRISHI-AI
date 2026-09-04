import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { StateAnomalySummary } from '../../services/anomalyService';

interface StateAnomalyTableProps {
  stateSummaries: StateAnomalySummary[];
  onSelectState: (state: string) => void;
}

export const StateAnomalyTable: React.FC<StateAnomalyTableProps> = ({
  stateSummaries,
  onSelectState,
}) => {
  const { t } = useLanguage();

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Sudden Drop':
        return t('Sudden Groundwater Drop');
      case 'Possible Extraction':
        return t('Possible Abnormal Extraction');
      case 'Missing Data':
        return t('Missing / Delayed Data');
      case 'Sensor Issue':
        return t('Possible Sensor Data Issue');
      case 'Sudden Rise':
        return t('Sudden Groundwater Rise');
      default:
        return t(cat);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Where are Signals Concentrated? (Regional Breakdown)')}
        subtitle={t('Ranked states by detected signals and primary anomaly category')}
        icon={<MapPin className="h-5 w-5 text-agri-700" />}
      />

      <div className="rounded-2xl border border-stone-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[11px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">{t('State')}</th>
                <th className="px-4 py-3">{t('Total Signals')}</th>
                <th className="px-4 py-3">{t('Critical')}</th>
                <th className="px-4 py-3">{t('High Attention')}</th>
                <th className="px-4 py-3">{t('Moderate / Low')}</th>
                <th className="px-4 py-3">{t('Primary Anomaly Category')}</th>
                <th className="px-4 py-3 text-right">{t('Filter Feed')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {stateSummaries.map((item) => (
                <tr
                  key={item.state}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectState(item.state)}
                >
                  <td className="px-4 py-3 font-extrabold text-stone-900">
                    {item.state}
                  </td>

                  <td className="px-4 py-3 font-mono font-black text-stone-900">
                    {item.total}
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-rose-700">
                    {item.critical > 0 ? `${item.critical} ${t('Critical')}` : '0'}
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-orange-700">
                    {item.high > 0 ? `${item.high} ${t('High')}` : '0'}
                  </td>

                  <td className="px-4 py-3 font-mono text-stone-600">
                    {item.warning}
                  </td>

                  <td className="px-4 py-3 text-xs font-bold text-agri-900">
                    <span className="rounded-md bg-stone-100 px-2 py-0.5">
                      {getCategoryLabel(item.mostCommonCategory)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectState(item.state);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
                    >
                      <span>{t('Filter')}</span>
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
