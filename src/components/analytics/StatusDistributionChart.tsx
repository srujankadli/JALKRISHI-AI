import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartCard } from '../common/ChartCard';

interface StatusDistributionChartProps {
  healthyCount: number;
  moderateCount: number;
  warningCount: number;
  criticalCount: number;
  totalStations: number;
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  healthyCount,
  moderateCount,
  warningCount,
  criticalCount,
  totalStations,
}) => {
  const data = [
    { name: 'Healthy (Safe)', count: healthyCount, color: '#16a34a' },
    { name: 'Moderate', count: moderateCount, color: '#eab308' },
    { name: 'Warning', count: warningCount, color: '#f97316' },
    { name: 'Critical Drawdown', count: criticalCount, color: '#dc2626' },
  ];

  return (
    <ChartCard
      title="Groundwater Health & Vulnerability Distribution"
      subtitle="Network proportional split based on current water table depth vs threshold"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Donut Chart */}
        <div className="w-full sm:w-1/2 h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const pct = Math.round((item.count / (totalStations || 1)) * 100);
                    return (
                      <div className="rounded-lg border border-stone-200 bg-white p-2.5 shadow-md text-xs">
                        <p className="font-bold text-stone-900">{item.name}</p>
                        <p className="text-stone-700">
                          {item.count.toLocaleString('en-IN')} wells ({pct}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Badges */}
        <div className="w-full sm:w-1/2 space-y-2 text-xs">
          {data.map((d) => {
            const pct = Math.round((d.count / (totalStations || 1)) * 100);
            return (
              <div
                key={d.name}
                className="flex items-center justify-between rounded-xl bg-stone-50 p-2 border border-stone-200/70"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-bold text-stone-800">{d.name}</span>
                </div>
                <div className="font-mono text-stone-900 font-bold">
                  {d.count.toLocaleString('en-IN')}{' '}
                  <span className="text-stone-400 font-normal text-[11px]">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
};
