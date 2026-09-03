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
import { GroundwaterCoverageCard } from '../components/dashboard/GroundwaterCoverageCard';

// Executive Water Brief
import { ExecutiveWaterBrief } from '../components/intelligence/ExecutiveWaterBrief';

import { FarmerVoiceAssistant } from '../components/voice/FarmerVoiceAssistant';
import { useLanguage } from '../context/LanguageContext';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
  selectedStation?: DWLRStation | null;
}

export const Dashboard: React.FC = () => {
  const { onSelectStation, selectedStation } = useOutletContext<OutletContextType>();
  const { currentLanguage } = useLanguage();

  const [metrics, setMetrics] = useState<DashboardSummary | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      setIsRefreshing(true);
      const data = await metricService.getDashboardSummary();
      setMetrics(data);
      setLastUpdatedText('Just now');
    } catch {
      // Fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleOpenStationById = async (stationId: string) => {
    try {
      const station = await stationService.getStationById(stationId);
      if (station) {
        onSelectStation(station);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-stone-200">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-agri-500 animate-pulse" />
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
            System Operational &bull; 5,260 Telemetry Nodes Synchronized
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-stone-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated: {lastUpdatedText}
          </span>
          <button
            onClick={fetchSummary}
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

      {/* 2.5 Phase P Multilingual Farmer Voice Assistant */}
      <FarmerVoiceAssistant currentLanguage={currentLanguage} selectedStation={selectedStation} />

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

      {/* 7.5 Spatial Groundwater Intelligence Coverage (Phase N) */}
      <GroundwaterCoverageCard />

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
