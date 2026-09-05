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
import { CloudRain, Sprout, ArrowRight } from 'lucide-react';
import { ChartCard } from '../common/ChartCard';
import { forecastService } from '../../services/forecastService';
import { useLanguage } from '../../context/LanguageContext';

export const RainfallOutlookCard: React.FC = () => {
  const { t } = useLanguage();
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const data = await forecastService.getRainfallForecastSeries();
      setSeries(data);
    }
    load();
  }, []);

  return (
    <ChartCard
      title={t('Historical Rainfall Context & Infiltration Dynamics')}
      subtitle={t('Historical precipitation context (mm) vs normal baseline and calculated infiltration recharge potential')}
      badge={
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
          <CloudRain className="h-3.5 w-3.5" />
          {t('Monsoon Infiltration Model')}
        </span>
      }
    >
      {/* Hydrological Progression Flow Diagram */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-stone-700 text-center">
          <div className="flex-1 min-w-[100px] rounded-lg bg-sky-100/70 p-1.5 text-sky-900 border border-sky-200">
            🌧️ {t('Historical Rainfall Context')}
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <div className="flex-1 min-w-[100px] rounded-lg bg-amber-100/70 p-1.5 text-amber-900 border border-amber-200">
            🌱 {t('Soil Infiltration')}
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <div className="flex-1 min-w-[100px] rounded-lg bg-water-100/70 p-1.5 text-water-900 border border-water-200">
            💧 {t('Aquifer Rebound')}
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <div className="flex-1 min-w-[100px] rounded-lg bg-agri-100/70 p-1.5 text-agri-900 border border-agri-200">
            🌾 {t('Farming Sowing Decision')}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#78716c' }} />
          <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[220px]">
                    <p className="font-bold text-stone-900">{t(item.period)}</p>
                    <div className="border-t border-stone-100 pt-1 space-y-0.5">
                      <p className="text-sky-700 font-bold">
                        {t('Historical Rainfall')}: {item.expectedRainfall} mm
                      </p>
                      <p className="text-stone-500">
                        {t('Historical Avg')}: {item.historicalAvg} mm
                      </p>
                      <p className="text-agri-700 font-bold">
                        {t('Recharge Potential Index')}: {item.potentialRechargeIndex}
                      </p>
                      <p className="text-stone-600 text-[11px] pt-1 leading-snug">
                        {t(item.groundwaterResponse)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          <Bar dataKey="expectedRainfall" name={t('Reference Rainfall (mm)')} fill="#0284c7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="historicalAvg" name={t('Historical Normal (mm)')} fill="#a8a29e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="potentialRechargeIndex" name={t('Potential Recharge Index')} fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Cautious Hydrological Interpretation */}
      <div className="mt-3 rounded-xl border border-agri-200 bg-agri-50/60 p-3 text-xs text-agri-950">
        <div className="flex items-start gap-2">
          <Sprout className="h-4 w-4 text-agri-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-bold text-agri-950">{t('Rainfall Interpretation')}: </strong>
            {t('Rainfall can increase recharge potential, but groundwater response also depends on infiltration, aquifer characteristics, seasonal conditions and water use. Farmers in deep sandstone zones should not rely on immediate water table rise.')}
          </p>
        </div>
      </div>
    </ChartCard>
  );
};
