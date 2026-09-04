import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, ArrowRight, ShieldAlert } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { metricService } from '../../services/metricService';
import { formatDepth } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface AreasToWatchTableProps {
  onSelectStation: (stationId: string) => void;
}

export const AreasToWatchTable: React.FC<AreasToWatchTableProps> = ({ onSelectStation }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const data = await metricService.getAreasToWatch();
      setAreas(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Areas to Watch"
        subtitle="Ranked high-risk districts exhibiting rapid depletion and lowest days-to-critical margins"
        icon={<ShieldAlert className="h-5 w-5 text-orange-600" />}
        action={
          <button
            onClick={() => navigate('/forecast')}
            className="text-xs font-bold text-agri-700 hover:text-agri-900 inline-flex items-center gap-1"
          >
            {t('View all risk areas')} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="rounded-2xl border border-stone-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[11px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">{t('Rank')}</th>
                <th className="px-4 py-3">{t('District & State')}</th>
                <th className="px-4 py-3">{t('Current Depth')}</th>
                <th className="px-4 py-3">{t('Risk Level')}</th>
                <th className="px-4 py-3">{t('Trend')}</th>
                <th className="px-4 py-3">{t('Days to Critical')}</th>
                <th className="px-4 py-3 text-right">{t('Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {areas.map((item) => (
                <tr
                  key={item.rank}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectStation(item.stationId)}
                >
                  <td className="px-4 py-3 font-mono font-bold text-stone-500">
                    #{item.rank}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-bold text-stone-900">{item.district}</div>
                    <div className="text-xs text-stone-500">{item.state} &bull; {item.block}</div>
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-stone-900">
                    {formatDepth(item.depth)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        item.risk === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${item.risk === 'Critical' ? 'bg-rose-600' : 'bg-amber-600'}`} />
                      {t(item.risk)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-rose-700 font-bold">
                    <span className="inline-flex items-center gap-0.5">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {item.trendRate}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-extrabold text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-2 py-0.5 font-mono">
                      {item.daysToCritical} {t('days')}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStation(item.stationId);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100"
                    >
                      {t('Details')}
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
