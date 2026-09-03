import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  RotateCcw,
  Clock,
} from 'lucide-react';
import type { DWLRStation, DashboardSummary } from '../types';
import { metricService } from '../services/metricService';
import { stationService } from '../services/stationService';

// Dashboard Components
import { HeroSection } from '../components/dashboard/HeroSection';
import { WaterSituationCard } from '../components/dashboard/WaterSituationCard';
import { StatCardsGrid } from '../components/dashboard/StatCardsGrid';
import { GroundwaterTrendCard } from '../components/dashboard/GroundwaterTrendCard';
import { RainfallRechargeCard } from '../components/dashboard/RainfallRechargeCard';
import { FarmerActionCenter } from '../components/dashboard/FarmerActionCenter';
import { GroundwaterAlertsFeed } from '../components/dashboard/GroundwaterAlertsFeed';
import { AreasToWatchTable } from '../components/dashboard/AreasToWatchTable';
import { MiniMapPreview } from '../components/dashboard/MiniMapPreview';
import { QuickActionsGrid } from '../components/dashboard/QuickActionsGrid';

// Executive Water Brief
import { ExecutiveWaterBrief } from '../components/intelligence/ExecutiveWaterBrief';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
}

export const Dashboard: React.FC = () => {
  const { onSelectStation } = useOutletContext<OutletContextType>();

  const [metrics, setMetrics] = useState<DashboardSummary | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const summary = await metricService.getDashboardSummary();
      setMetrics(summary);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => {
      setLastUpdatedText('Just now (Refreshed)');
      setIsRefreshing(false);
    }, 400);
  };

  const handleOpenStationById = async (stationId: string) => {
    const st = await stationService.getStationById(stationId);
    if (st) {
      onSelectStation(st);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* 0. Top Telemetry & Real-Time Sync Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-stone-900">DWLR Network Active</span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">5,260 Observation Wells (Simulated Telemetry)</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-stone-500">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            Last updated: <strong className="text-stone-800 font-semibold">{lastUpdatedText}</strong>
          </span>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-semibold text-stone-700 hover:bg-stone-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh simulation telemetry data"
          >
            <RotateCcw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-agri-700' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Executive Water Situation Brief */}
      <ExecutiveWaterBrief />

      {/* 3. Your Water Situation Card */}
      <WaterSituationCard metrics={metrics} />

      {/* 4. Four Simplified Stat Cards */}
      <StatCardsGrid metrics={metrics} />

      {/* 5. Farmer Action Center (Recommended Actions) */}
      <FarmerActionCenter />

      {/* 6. Charts Section: Groundwater Trend & Rainfall Correlation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GroundwaterTrendCard />
        <RainfallRechargeCard />
      </div>

      {/* 7. Decision Support: Groundwater Alerts & Areas to Watch */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <GroundwaterAlertsFeed onSelectStation={handleOpenStationById} />
        </div>
        <div className="lg:col-span-6">
          <AreasToWatchTable onSelectStation={handleOpenStationById} />
        </div>
      </div>

      {/* 8. Mini Map Preview */}
      <MiniMapPreview onSelectStation={onSelectStation} />

      {/* 9. Quick Actions Launchpad */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Quick Tools & Services</h3>
            <p className="text-xs text-stone-500">Fast access to key groundwater and agricultural tools</p>
          </div>
        </div>
        <QuickActionsGrid />
      </div>
    </div>
  );
};
