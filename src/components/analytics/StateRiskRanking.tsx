import React from 'react';
import { AlertOctagon, TrendingDown, ArrowRight } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { StateComparisonRow } from '../../utils/exportUtils';

interface StateRiskRankingProps {
  stateData: StateComparisonRow[];
  onSelectState: (state: string) => void;
}

export const StateRiskRanking: React.FC<StateRiskRankingProps> = ({
  stateData,
  onSelectState,
}) => {
  // Sort states by composite risk descending
  const rankedStates = [...stateData]
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 10);

  const getPriorityBadge = (index: number, risk: number) => {
    if (index < 3 || risk > 0.65) {
      return {
        label: 'Immediate Review',
        className: 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold',
      };
    } else if (index < 6 || risk > 0.45) {
      return {
        label: 'High Vigilance',
        className: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      };
    } else {
      return {
        label: 'Seasonal Watch',
        className: 'bg-stone-100 text-stone-700 border-stone-300 font-semibold',
      };
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Top 10 States Requiring Hydrological Intervention"
        subtitle="Priority ranking based on critical drawdown percentage, depletion velocity, and aquifer vulnerability"
        icon={<AlertOctagon className="h-5 w-5 text-rose-600" />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rankedStates.map((st, idx) => {
          const priority = getPriorityBadge(idx, st.avgRisk);
          return (
            <div
              key={st.state}
              onClick={() => onSelectState(st.state)}
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle hover:border-rose-400 hover:shadow-elevated transition-all cursor-pointer space-y-3"
            >
              <div>
                {/* Header: Rank + Priority */}
                <div className="flex items-center justify-between gap-1.5 border-b border-stone-100 pb-2">
                  <span className="font-mono text-xs font-black text-stone-500">
                    #{idx + 1}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] uppercase ${priority.className}`}
                  >
                    {priority.label}
                  </span>
                </div>

                {/* State Title */}
                <h4 className="mt-2.5 text-base font-black text-stone-900 leading-snug">
                  {st.state}
                </h4>

                {/* Metrics */}
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Critical Wells:</span>
                    <strong className="text-rose-700 font-mono">
                      {Math.round((st.criticalPct / 100) * st.totalStations)} ({st.criticalPct}%)
                    </strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Avg Depth:</span>
                    <strong className="text-stone-900 font-mono">{st.avgDepth} m</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Risk Index:</span>
                    <strong className="text-rose-700 font-mono">
                      {Math.round(st.avgRisk * 100)}/100
                    </strong>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-rose-700">
                  <TrendingDown className="h-3 w-3" />
                  <span>{st.trend}</span>
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectState(st.state);
                  }}
                  className="inline-flex items-center gap-1 font-bold text-stone-900 hover:text-agri-700 cursor-pointer text-[11px]"
                >
                  <span>Filter</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
