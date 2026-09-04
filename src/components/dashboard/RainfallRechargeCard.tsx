import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { CloudRain, Sprout } from 'lucide-react';
import { ChartCard } from '../common/ChartCard';
import { metricService } from '../../services/metricService';
import { useLanguage } from '../../context/LanguageContext';

export const RainfallRechargeCard: React.FC = () => {
  const { t } = useLanguage();
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const data = await metricService.getMonthlyTrends();
      setTrends(data);
    }
    loadData();
  }, []);

  return (
    <ChartCard
      title={t("Rainfall & Groundwater Recharge")}
      subtitle={t("Monthly precipitation (mm) against calculated aquifer recharge index")}
      badge={
        <span className="inline-flex items-center gap-1 rounded-full bg-agri-100 px-2.5 py-0.5 text-xs font-bold text-agri-800">
          <CloudRain className="h-3 w-3 text-water-600" />
          {t('Monsoon Active')}
        </span>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
          <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-xs space-y-1">
                    <p className="font-bold text-stone-900">{item.month} 2026</p>
                    <p className="text-water-700 font-semibold">
                      {t('Rainfall:')} {item.rainfall} mm
                    </p>
                    <p className="text-agri-700 font-semibold">
                      {t('Recharge Index:')} {item.rechargeRate}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          <Bar dataKey="rainfall" name={t('Rainfall (mm)')} fill="#0284c7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rechargeRate" name={t('Recharge Index')} fill="#15803d" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Contextual Interpretation Note */}
      <div className="mt-3 rounded-xl border border-agri-200 bg-agri-50/60 p-3 text-xs text-stone-800">
        <div className="flex items-start gap-2">
          <Sprout className="h-4 w-4 text-agri-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-agri-950 font-bold">{t('Hydrological Interpretation:')} </strong>
            Recent monsoon rainfall (180mm avg) is supporting steady groundwater recovery across central and eastern river basins. Water tables in alluvial zones are rebounding +0.3m this cycle.
          </p>
        </div>
      </div>
    </ChartCard>
  );
};
