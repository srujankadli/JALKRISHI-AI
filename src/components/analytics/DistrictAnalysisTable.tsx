import React, { useState } from 'react';
import { MapPin, ArrowUpDown, ArrowRight } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { DistrictAnalysisRow } from '../../utils/exportUtils';

interface DistrictAnalysisTableProps {
  districtData: DistrictAnalysisRow[];
  onSelectDistrict: (district: DistrictAnalysisRow) => void;
  selectedDistrictName?: string;
}

type SortField = 'risk' | 'critical' | 'depth' | 'stations';

export const DistrictAnalysisTable: React.FC<DistrictAnalysisTableProps> = ({
  districtData,
  onSelectDistrict,
  selectedDistrictName,
}) => {
  const [sortField, setSortField] = useState<SortField>('risk');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedData = [...districtData].sort((a, b) => {
    let diff = 0;
    if (sortField === 'risk') diff = b.riskScore - a.riskScore;
    else if (sortField === 'critical') diff = b.criticalCount - a.criticalCount;
    else if (sortField === 'depth') diff = b.avgDepth - a.avgDepth;
    else if (sortField === 'stations') diff = b.totalStations - a.totalStations;
    return sortAsc ? -diff : diff;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionHeader
          title="District-Level Groundwater Intelligence"
          subtitle="Granular evaluation across administrative districts and local block watersheds"
          icon={<MapPin className="h-5 w-5 text-water-700" />}
        />

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-stone-400 font-bold">Sort By:</span>
          <button
            onClick={() => handleSort('risk')}
            className={`rounded-lg px-2.5 py-1 font-bold border transition-all cursor-pointer ${
              sortField === 'risk'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Risk Score
          </button>
          <button
            onClick={() => handleSort('critical')}
            className={`rounded-lg px-2.5 py-1 font-bold border transition-all cursor-pointer ${
              sortField === 'critical'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Critical Wells
          </button>
          <button
            onClick={() => handleSort('depth')}
            className={`rounded-lg px-2.5 py-1 font-bold border transition-all cursor-pointer ${
              sortField === 'depth'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            Depth
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[11px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">State</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('stations')}
                >
                  <span className="flex items-center gap-1">
                    Wells <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('depth')}
                >
                  <span className="flex items-center gap-1">
                    Avg Depth (mbgl) <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('risk')}
                >
                  <span className="flex items-center gap-1">
                    Risk Score <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('critical')}
                >
                  <span className="flex items-center gap-1">
                    Critical Wells <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3">Days to Critical</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {sortedData.slice(0, 30).map((row) => {
                const isSelected = selectedDistrictName === row.district;
                return (
                  <tr
                    key={`${row.state}-${row.district}`}
                    onClick={() => onSelectDistrict(row)}
                    className={`hover:bg-stone-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-agri-50/70 font-bold' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-stone-900">{row.district}</div>
                    </td>

                    <td className="px-4 py-3.5 text-stone-600 font-semibold">
                      {row.state}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-stone-600">
                      {row.totalStations}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-stone-900">
                      {row.avgDepth} m
                    </td>

                    <td className="px-4 py-3.5 font-mono font-black">
                      <span
                        className={
                          row.riskScore > 0.65
                            ? 'text-rose-700'
                            : row.riskScore > 0.45
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }
                      >
                        {Math.round(row.riskScore * 100)}/100
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          row.criticalCount > 0
                            ? 'bg-rose-50 border border-rose-200 text-rose-800'
                            : 'bg-stone-50 text-stone-600'
                        }`}
                      >
                        {row.criticalCount} wells
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs font-bold ${
                          row.trend === 'falling'
                            ? 'text-rose-700'
                            : row.trend === 'rising'
                            ? 'text-emerald-700'
                            : 'text-stone-600'
                        }`}
                      >
                        {row.trend === 'falling'
                          ? '↓ Falling'
                          : row.trend === 'rising'
                          ? '↑ Rising'
                          : '→ Stable'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-stone-700">
                      {typeof row.avgDaysToCritical === 'number'
                        ? `~${row.avgDaysToCritical} days`
                        : row.avgDaysToCritical}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDistrict(row);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100 shadow-xs cursor-pointer"
                      >
                        <span>Drill-Down</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
