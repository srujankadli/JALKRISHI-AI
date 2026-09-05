import React, { useState, useEffect } from 'react';
import {
  Radio,
  Layers,
  Clock,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import type { DWLRStation } from '../../types';
import { forecastService } from '../../services/forecastService';
import type { RegionalForecastOutlook, DaysToCriticalBreakdown } from '../../data/mockForecasts';
import { PageHeader } from '../common/PageHeader';
import { DaysToCriticalCard } from './DaysToCriticalCard';
import { RegionalForecastTable } from './RegionalForecastTable';
import { TopRiskStationsTable } from './TopRiskStationsTable';
import { TopStableStationsTable } from './TopStableStationsTable';
import { RainfallOutlookCard } from './RainfallOutlookCard';
import { ForecastMethodologyNote } from './ForecastMethodologyNote';
import { useLanguage } from '../../context/LanguageContext';
import { LoadingState } from '../common/States';

interface OfficialForecastViewProps {
  onSelectStation?: (station: DWLRStation) => void;
}

export const OfficialForecastView: React.FC<OfficialForecastViewProps> = ({ onSelectStation }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [outlooks, setOutlooks] = useState<RegionalForecastOutlook[]>([]);
  const [brackets, setBrackets] = useState<DaysToCriticalBreakdown[]>([]);
  const [topRiskStations, setTopRiskStations] = useState<DWLRStation[]>([]);
  const [topStableStations, setTopStableStations] = useState<DWLRStation[]>([]);

  useEffect(() => {
    async function loadOfficialForecastData() {
      setLoading(true);
      try {
        const [reg, brk, riskSt, stableSt] = await Promise.all([
          forecastService.getRegionalOutlooks(),
          forecastService.getDaysToCriticalBrackets(),
          forecastService.getTop10HighRiskStations(),
          forecastService.getTop10LowerRiskStations(),
        ]);
        setOutlooks(reg);
        setBrackets(brk);
        setTopRiskStations(riskSt);
        setTopStableStations(stableSt);
      } catch {
        // Fallback handled in service
      } finally {
        setLoading(false);
      }
    }
    loadOfficialForecastData();
  }, []);

  if (loading) {
    return <LoadingState message={t('Loading nationwide multi-horizon groundwater forecasts...')} />;
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* 0. Official Telemetry Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            {t('Official Command Intelligence')}
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-600 font-medium">
            {t('Nationwide Multi-Horizon Predictive Ground Water Models')}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-blue-600" />
          {t('JalKrishi Reference Simulation Dataset')}
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title={t('Nationwide Groundwater Forecast & Multi-Horizon Risk Outlook')}
        subtitle={t('Simulated 7-to-90 day predictive groundwater trajectories across 5,260 reference stations and 13 states.')}
        badge={
          <span className="rounded-full bg-blue-100 border border-blue-300 px-3 py-1 text-xs font-bold text-blue-800 flex items-center gap-1.5 shadow-xs">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            5,260 {t('Stations Monitored')}
          </span>
        }
      />

      {/* 2. Official Forecast Overview Hero Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
            <span>{t('Monitored Network')}</span>
            <Radio className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-stone-900 font-mono">5,260</p>
          <p className="text-xs text-stone-500 mt-1">{t('Simulated DWLR Telemetry Nodes')}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
            <span>{t('Critical Urgency (0–7d)')}</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-rose-600 font-mono">
            {brackets.find((b) => b.range.includes('0–7'))?.count || 68}
          </p>
          <p className="text-xs text-rose-700 font-semibold mt-1">{t('Immediate intervention priority')}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
            <span>{t('High Attention (8–30d)')}</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 font-mono">
            {brackets.find((b) => b.range.includes('8–30'))?.count || 376}
          </p>
          <p className="text-xs text-amber-700 font-semibold mt-1">{t('Current crop cycle depletion')}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
            <span>{t('Safe Aquifer Reserves')}</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 font-mono">
            {brackets.find((b) => b.range.includes('60+'))?.count || 4036}
          </p>
          <p className="text-xs text-emerald-700 font-semibold mt-1">{t('Positive hydrostatic equilibrium')}</p>
        </div>
      </div>

      {/* 3. Days to Critical National Breakdown */}
      <DaysToCriticalCard brackets={brackets} />

      {/* 4. Regional Forecast Table (State Outlooks) */}
      <RegionalForecastTable outlooks={outlooks} />

      {/* 5. Top 10 High-Risk & Stable Stations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopRiskStationsTable
          stations={topRiskStations}
          onSelectStation={onSelectStation || (() => {})}
        />
        <TopStableStationsTable
          stations={topStableStations}
          onSelectStation={onSelectStation || (() => {})}
        />
      </div>

      {/* 6. Historical Rainfall Context & Infiltration Response */}
      <RainfallOutlookCard />

      {/* 7. Technical Methodology & Simulation Transparency Note */}
      <ForecastMethodologyNote />
    </div>
  );
};
