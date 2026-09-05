import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  RotateCcw,
  Clock,
  Landmark,
} from 'lucide-react';
import type { DWLRStation, DashboardSummary } from '../types';
import { metricService } from '../services/metricService';
import { stationService } from '../services/stationService';

// Farm Context & Personalized Components
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import { MyFarmOverviewCard } from '../components/dashboard/MyFarmOverviewCard';
import { FarmerOnboardingCard } from '../components/dashboard/FarmerOnboardingCard';

// Dashboard Components
import { HeroSection } from '../components/dashboard/HeroSection';
import { StatCardsGrid } from '../components/dashboard/StatCardsGrid';
import { GroundwaterTrendCard } from '../components/dashboard/GroundwaterTrendCard';
import { RainfallRechargeCard } from '../components/dashboard/RainfallRechargeCard';
import { FarmerActionCenter } from '../components/dashboard/FarmerActionCenter';
import { GroundwaterAlertsFeed } from '../components/dashboard/GroundwaterAlertsFeed';
import { AreasToWatchTable } from '../components/dashboard/AreasToWatchTable';
import { MiniMapPreview } from '../components/dashboard/MiniMapPreview';
import { QuickActionsGrid } from '../components/dashboard/QuickActionsGrid';
import { GroundwaterCoverageCard } from '../components/dashboard/GroundwaterCoverageCard';
import { JalKrishiWaterWatchCard } from '../components/dashboard/JalKrishiWaterWatchCard';

// Executive Water Brief
import { ExecutiveWaterBrief } from '../components/intelligence/ExecutiveWaterBrief';

// Farmer Water Advisor
import { FarmerWaterAdvisor } from '../components/farmer/FarmerWaterAdvisor';
import { useLanguage } from '../context/LanguageContext';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
  selectedStation?: DWLRStation | null;
}

export const Dashboard: React.FC = () => {
  const { onSelectStation, selectedStation } = useOutletContext<OutletContextType>();
  const { t } = useLanguage();
  const { location: farmLocation } = useFarm();
  const { isOfficial } = useAuth();

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
          <div className={`h-3 w-3 rounded-full ${isOfficial ? 'bg-blue-600 animate-pulse' : 'bg-agri-500 animate-pulse'}`} />
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
            {isOfficial
              ? t('Official Command Center • 5,260 Observation Points Monitored (Reference Simulation Dataset)')
              : `${t('Farmer Water Intelligence Active • Localized Farm Workspace')} (${farmLocation || t('Set Your Location')})`}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-stone-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t('Updated:')} {t(lastUpdatedText)}
          </span>
          <button
            onClick={fetchSummary}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-semibold text-stone-700 hover:bg-stone-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            title={t('Refresh simulation telemetry data')}
          >
            <RotateCcw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-agri-700' : ''}`} />
            <span>{t('Refresh')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BRANCH A: OFFICIAL NATIONWIDE DASHBOARD                                  */}
      {/* ========================================================================= */}
      {isOfficial ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Overview & Action Header */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-bold text-blue-300">
                <Landmark className="h-3.5 w-3.5" />
                <span>{t('Nationwide Administrative Groundwater Console')}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {t('National Groundwater Telemetry & Risk Overview')}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {t('Aggregated hydrogeological intelligence across 5,260 observation stations in 13 key Indian states.')}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                to="/official"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
              >
                <span>{t('Open Full Command Center')}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

          {/* National Executive Brief */}
          <ExecutiveWaterBrief />

          {/* Network-wide Stat Cards */}
          <StatCardsGrid metrics={metrics} />

          {/* National Groundwater Trends & Rainfall Recharge */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GroundwaterTrendCard />
            <RainfallRechargeCard />
          </div>

          {/* National Alerts & Areas to Watch Tables */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <GroundwaterAlertsFeed onSelectStation={handleOpenStationById} />
            </div>
            <div className="lg:col-span-6">
              <AreasToWatchTable onSelectStation={handleOpenStationById} />
            </div>
          </div>

          {/* National Groundwater Coverage Card */}
          <GroundwaterCoverageCard />
        </div>
      ) : (
        /* ========================================================================= */
        /* BRANCH B: FARMER LOCALIZED PERSONALIZED DASHBOARD                         */
        /* ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          {farmLocation ? (
            <>
              {/* Personalized "My Farm" Overview Card */}
              <MyFarmOverviewCard onOpenStation={onSelectStation} />

              {/* Localized Farmer Water Advisor with Adaptive Questions */}
              <FarmerWaterAdvisor initialLocation={farmLocation} />

              {/* Localized Proactive Water Watch Card */}
              <JalKrishiWaterWatchCard location={farmLocation} selectedStation={selectedStation} />

              {/* Recommended Farmer Actions */}
              <FarmerActionCenter />
            </>
          ) : (
            <>
              {/* First-Time Onboarding Card */}
              <FarmerOnboardingCard />

              {/* Simple Farmer Water Advisor (with clean location prompt) */}
              <FarmerWaterAdvisor />

              {/* Overview Hero Section */}
              <HeroSection />
            </>
          )}

          {/* Farmer Nearby Monitoring Map Preview */}
          <MiniMapPreview onSelectStation={onSelectStation} />

          {/* Farmer Quick Tools & Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-lg">{t('Quick Tools & Services')}</h3>
                <p className="text-xs text-stone-500">{t('Fast access to local farm groundwater and agricultural tools')}</p>
              </div>
            </div>
            <QuickActionsGrid />
          </div>

          {/* Official Login Notice */}
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Landmark className="h-4 w-4 text-stone-500" />
                <div>
                  <h4 className="text-xs font-bold text-stone-700">
                    {t('Official & Hydrologist Command Center')}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    {t('Pan-India 5,260 telemetry node analytics and policy tools are restricted to authorized water officials.')}
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                <span>{t('Official Login')}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
