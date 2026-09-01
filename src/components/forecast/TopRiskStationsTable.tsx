import React from 'react';
import { ShieldAlert, TrendingDown, ArrowRight, Clock } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { formatDepth } from '../../utils/formatters';
import type { DWLRStation } from '../../types';

interface TopRiskStationsTableProps {
  stations: DWLRStation[];
  onSelectStation: (station: DWLRStation) => void;
}

export const TopRiskStationsTable: React.FC<TopRiskStationsTableProps> = ({
  stations,
  onSelectStation,
}) => {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Top 10 High-Risk Stations"
        subtitle="Ranked observation wells facing rapid depletion and imminent critical threshold arrival"
        icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
      />

      <div className="rounded-2xl border border-stone-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[11px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Station & Location</th>
                <th className="px-4 py-3">Current Depth</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Days to Critical</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {stations.map((st, idx) => (
                <tr
                  key={st.id}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectStation(st)}
                >
                  <td className="px-4 py-3 font-mono font-black text-rose-700">
                    #{String(idx + 1).padStart(2, '0')}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-bold text-stone-900 line-clamp-1">{st.stationName}</div>
                    <div className="text-xs text-stone-500">
                      {st.block} &bull; {st.district}, {st.state} &bull;{' '}
                      <span className="font-mono text-stone-600">{st.stationCode}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-stone-900">
                    {formatDepth(st.waterLevel)}
                  </td>

                  <td className="px-4 py-3 text-rose-700 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {st.trendRateMetersPerMonth ? `${st.trendRateMetersPerMonth} m/mo` : 'Falling'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={st.status} size="sm" />
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 font-mono font-black text-rose-800 text-xs">
                      <Clock className="h-3 w-3 text-rose-600" />
                      {st.daysToCritical ? `${st.daysToCritical} days` : 'Imminent'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStation(st);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100 shadow-xs cursor-pointer"
                    >
                      <span>View</span>
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
