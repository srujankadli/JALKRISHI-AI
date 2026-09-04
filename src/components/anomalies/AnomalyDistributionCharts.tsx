import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { ChartCard } from '../common/ChartCard';
import type { AnomalyCategory } from '../../types';

interface AnomalyDistributionChartsProps {
  categoryData: {
    category: AnomalyCategory;
    name: string;
    count: number;
    color: string;
  }[];
  severityData: {
    name: string;
    count: number;
    color: string;
  }[];
  onSelectCategory?: (cat: AnomalyCategory) => void;
}

export const AnomalyDistributionCharts: React.FC<AnomalyDistributionChartsProps> = ({
  categoryData,
  severityData,
  onSelectCategory,
}) => {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* 1. Anomalies by Category */}
      <div className="lg:col-span-7">
        <ChartCard
          title={t('Anomalies by Failure & Drawdown Category')}
          subtitle={t('Distribution of detected events across physical drawdowns vs sensor/telemetry issues')}
          badge={
            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
              5 Core Categories
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#78716c' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716c' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-stone-200 bg-white p-2.5 shadow-md text-xs">
                        <p className="font-bold text-stone-900">{item.name}</p>
                        <p className="text-stone-700 font-semibold mt-1">
                          Count: <strong>{item.count}</strong> stations
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                name="Stations"
                radius={[6, 6, 0, 0]}
                onClick={(entry: any) => {
                  if (entry && entry.category) {
                    onSelectCategory?.(entry.category);
                  }
                }}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="mt-2 text-xs text-stone-500 text-center">
            Click any bar to filter the anomaly feed by category.
          </p>
        </ChartCard>
      </div>

      {/* 2. Severity Breakdown Donut */}
      <div className="lg:col-span-5">
        <ChartCard
          title={t('Severity Priority Breakdown')}
          subtitle={t('Triage breakdown for agricultural extension and maintenance dispatch')}
        >
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-sev-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-stone-200 bg-white p-2 shadow-md text-xs">
                          <p className="font-bold text-stone-900">{item.name}</p>
                          <p className="text-stone-700">Count: {item.count} alerts</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-100">
            {severityData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-stone-600 font-medium">{s.name}:</span>
                <strong className="text-stone-900 ml-auto">{s.count}</strong>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
