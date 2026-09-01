import React, { useState } from 'react';
import { Layers, ArrowUpDown, ArrowRight } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { StateComparisonRow } from '../../utils/exportUtils';

interface StateComparisonTableProps {
  stateData: StateComparisonRow[];
  onSelectState: (state: string) => void;
  selectedState: string;
}

type SortField = 'risk' | 'critical' | 'depth' | 'stations';

export const StateComparisonTable: React.FC<StateComparisonTableProps> = ({
  stateData,
  onSelectState,
  selectedState,
}) => {
  const [sortField, setSortField] = useState<SortField>('risk');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedData = [...stateData].sort((a, b) => {
    let diff = 0;
    if (sortField === 'risk') diff = b.avgRisk - a.avgRisk;
    else if (sortField === 'critical') diff = b.criticalPct - a.criticalPct;
    else if (sortField === 'depth') diff = b.avgDepth - a.avgDepth;
    else if (sortField === 'stations') diff = b.totalStations - a.totalStations;
    return sortAsc ? -diff : diff;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionHeader
          title="State-wise Groundwater Comparison"
          subtitle="Comparative telemetry analysis across all monitored agricultural states and UTs"
          icon={<Layers className="h-5 w-5 text-agri-700" />}
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
            Critical %
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
                <th className="px-4 py-3">State / Basin</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('stations')}
                >
                  <span className="flex items-center gap-1">
                    DWLR Wells <ArrowUpDown className="h-3 w-3" />
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
                <th className="px-4 py-3">Healthy %</th>
                <th className="px-4 py-3">Warning %</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('critical')}
                >
                  <span className="flex items-center gap-1">
                    Critical % <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-stone-900"
                  onClick={() => handleSort('risk')}
                >
                  <span className="flex items-center gap-1">
                    Risk Index <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3 text-right">Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {sortedData.map((row) => {
                const isSelected = selectedState === row.state;
                return (
                  <tr
                    key={row.state}
                    onClick={() => onSelectState(row.state)}
                    className={`hover:bg-stone-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-agri-50/70 font-bold' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-stone-900">{row.state}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-stone-600">
                      {row.totalStations.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-stone-900">
                      {row.avgDepth} m
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        {row.healthyPct}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-bold text-orange-800">
                        {row.warningPct}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-800">
                        {row.criticalPct}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-black text-stone-900">
                      <span
                        className={
                          row.avgRisk > 0.65
                            ? 'text-rose-700'
                            : row.avgRisk > 0.45
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }
                      >
                        {Math.round(row.avgRisk * 100)}/100
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

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectState(row.state);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100 shadow-xs cursor-pointer"
                      >
                        <span>Focus</span>
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
