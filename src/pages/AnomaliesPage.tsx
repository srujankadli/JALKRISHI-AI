import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ShieldAlert, Radio } from 'lucide-react';
import type { DWLRStation, GroundwaterAnomaly } from '../types';
import { anomalyService } from '../services/anomalyService';
import type { StateAnomalySummary } from '../services/anomalyService';
import { stationService } from '../services/stationService';

// Anomaly UI Components
import { PageHeader } from '../components/common/PageHeader';
import { AnomalyOverviewCards } from '../components/anomalies/AnomalyOverviewCards';
import { AnomalyCategoryGrid } from '../components/anomalies/AnomalyCategoryGrid';
import { AnomalyFilterBar } from '../components/anomalies/AnomalyFilterBar';
import { AnomalyFeedList } from '../components/anomalies/AnomalyFeedList';
import { AnomalyDetailModal } from '../components/anomalies/AnomalyDetailModal';
import { AnomalyDistributionCharts } from '../components/anomalies/AnomalyDistributionCharts';
import { StateAnomalyTable } from '../components/anomalies/StateAnomalyTable';
import { AnomalyMeaningKnowledgeCards } from '../components/anomalies/AnomalyMeaningKnowledgeCards';
import { FarmerAnomalyActionCenter } from '../components/anomalies/FarmerAnomalyActionCenter';
import { useLanguage } from '../context/LanguageContext';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
}

export const AnomaliesPage: React.FC = () => {
  const { t } = useLanguage();
  const { onSelectStation } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  // Anomaly Data States
  const [anomalies, setAnomalies] = useState<GroundwaterAnomaly[]>([]);
  const [filteredAnomalies, setFilteredAnomalies] = useState<GroundwaterAnomaly[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<GroundwaterAnomaly | null>(null);

  // Summary Metrics & Category Breakdown
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [severityCounts, setSeverityCounts] = useState<{ critical: number; high: number; warning: number; info: number }>({
    critical: 0,
    high: 0,
    warning: 0,
    info: 0,
  });
  const [stateSummaries, setStateSummaries] = useState<StateAnomalySummary[]>([]);
  const [statesList, setStatesList] = useState<string[]>(['All States']);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('All States');

  // Initial Load
  useEffect(() => {
    async function loadData() {
      const [allAnomalies, catCounts, sevCounts, stateBrk, states] = await Promise.all([
        anomalyService.getAnomalies(),
        anomalyService.getCategoryCounts(),
        anomalyService.getSeverityCounts(),
        anomalyService.getStateAnomalyBreakdown(),
        stationService.getDistinctStates(),
      ]);

      setAnomalies(allAnomalies);
      setFilteredAnomalies(allAnomalies);
      setCategoryData(catCounts);
      setSeverityCounts(sevCounts);
      setStateSummaries(stateBrk);
      setStatesList(states);
    }
    loadData();
  }, []);

  // Reactive filtering
  useEffect(() => {
    async function applyFilter() {
      const result = await anomalyService.getAnomalies({
        searchQuery,
        category: selectedCategory as any,
        severity: selectedSeverity as any,
        state: selectedState,
      });
      setFilteredAnomalies(result);
    }
    applyFilter();
  }, [searchQuery, selectedCategory, selectedSeverity, selectedState]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSeverity('all');
    setSelectedState('All States');
  };

  const handleNavigateToMapForAnomaly = async (anomaly: GroundwaterAnomaly) => {
    const station = await stationService.getStationById(anomaly.stationId);
    if (station) {
      onSelectStation(station);
    }
    navigate('/map');
  };

  const handleNavigateToStationForecast = async (stationId: string) => {
    const station = await stationService.getStationById(stationId);
    if (station) {
      onSelectStation(station);
    }
    navigate('/forecast');
  };

  const severityChartData = [
    { name: t('Critical Alert'), count: severityCounts.critical, color: '#dc2626' },
    { name: t('High Attention'), count: severityCounts.high, color: '#ea580c' },
    { name: t('Warning / Monitor'), count: severityCounts.warning, color: '#d97706' },
    { name: t('Info / Low'), count: severityCounts.info, color: '#16a34a' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* 0. Telemetry Quality Engine Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
          <span className="font-extrabold text-stone-900">
            {t('JalKrishi Automated Telemetry Quality & Hydrostatic Anomaly Engine')}
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">{t('Real-Time Drawdown & Sensor Checks')}</span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-rose-600" />
          {t('Reference Simulation Model')}
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title={t('Anomaly Detection & Groundwater Alerts')}
        subtitle={t('Identify sudden localized drawdown spikes, abnormal extraction patterns, and telemetry sensor issues before crop water stress intensifies.')}
        farmerNote={t('Anomalies alert you when water levels drop much faster than expected in your area, giving you advance notice to manage tube-wells and protect pumps.')}
        badge={
          <span className="rounded-full bg-rose-100 border border-rose-300 px-3 py-1 text-xs font-bold text-rose-800 flex items-center gap-1.5 shadow-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            {anomalies.length} {t('Active Telemetry Alerts')}
          </span>
        }
      />

      {/* 2. Anomaly Overview Metric Cards */}
      <AnomalyOverviewCards
        totalAnomalies={anomalies.length}
        criticalCount={severityCounts.critical}
        extractionCount={categoryData.find((c) => c.category === 'Possible Extraction')?.count || 4}
        telemetryIssuesCount={
          (categoryData.find((c) => c.category === 'Missing Data')?.count || 0) +
          (categoryData.find((c) => c.category === 'Sensor Issue')?.count || 0)
        }
        onFilterCritical={() => setSelectedSeverity('critical')}
        onFilterExtraction={() => setSelectedCategory('Possible Extraction')}
        onFilterTelemetry={() => setSelectedCategory('Missing Data')}
      />

      {/* 3. Anomaly Categories Grid (5 Core Categories) */}
      <AnomalyCategoryGrid
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        categoryCounts={categoryData}
      />

      {/* 4. Filter Toolbar */}
      <AnomalyFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={(cat) => setSelectedCategory(cat)}
        selectedSeverity={selectedSeverity}
        onSeverityChange={(sev) => setSelectedSeverity(sev)}
        selectedState={selectedState}
        onStateChange={setSelectedState}
        statesList={statesList}
        totalFiltered={filteredAnomalies.length}
        totalAnomalies={anomalies.length}
        onReset={handleResetFilters}
      />

      {/* 5. Live Chronological Anomaly Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-stone-900">
            {t('Recent Hydrostatic & Telemetry Alerts')} ({filteredAnomalies.length})
          </h3>
          <span className="text-xs text-stone-500">{t('Sorted by detection time')}</span>
        </div>

        <AnomalyFeedList
          anomalies={filteredAnomalies}
          onSelectAnomaly={(a) => setSelectedAnomaly(a)}
          onNavigateToMap={handleNavigateToMapForAnomaly}
        />
      </div>

      {/* 6. Anomaly Distribution Charts (Recharts) */}
      <AnomalyDistributionCharts
        categoryData={categoryData}
        severityData={severityChartData}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />

      {/* 7. State-Level Anomaly Breakdown Matrix */}
      <StateAnomalyTable
        stateSummaries={stateSummaries}
        onSelectState={(st) => setSelectedState(st)}
      />

      {/* 8. Farmer-Friendly "What Does an Anomaly Mean?" Knowledge Cards */}
      <AnomalyMeaningKnowledgeCards />

      {/* 9. Farmer Action Center ("What Should You Do?") */}
      <FarmerAnomalyActionCenter />

      {/* 10. Deep-Dive Anomaly Detail Modal */}
      {selectedAnomaly && (
        <AnomalyDetailModal
          anomaly={selectedAnomaly}
          onClose={() => setSelectedAnomaly(null)}
          onNavigateToMap={() => handleNavigateToMapForAnomaly(selectedAnomaly)}
          onNavigateToForecast={handleNavigateToStationForecast}
          onNavigateToCrops={() => navigate('/crops')}
        />
      )}
    </div>
  );
};
