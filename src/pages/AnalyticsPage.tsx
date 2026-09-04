import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BarChart3, Radio } from 'lucide-react';
import type {
  DWLRStation,
  StationStatus,
  TrendDirection,
  GroundwaterAnomaly,
} from '../types';
import { stationService } from '../services/stationService';
import { anomalyService } from '../services/anomalyService';

// Analytics UI Components
import { PageHeader } from '../components/common/PageHeader';
import { AnalyticsFilterBar } from '../components/analytics/AnalyticsFilterBar';
import { AnalyticsSummaryCards } from '../components/analytics/AnalyticsSummaryCards';
import { StatusDistributionChart } from '../components/analytics/StatusDistributionChart';
import { GroundwaterTrendAnalytics } from '../components/analytics/GroundwaterTrendAnalytics';
import { StateRiskRanking } from '../components/analytics/StateRiskRanking';
import { StateComparisonTable } from '../components/analytics/StateComparisonTable';
import { DistrictAnalysisTable } from '../components/analytics/DistrictAnalysisTable';
import { DistrictDetailPanel } from '../components/analytics/DistrictDetailPanel';
import { AgriculturalWaterOutlook } from '../components/analytics/AgriculturalWaterOutlook';
import { ReportExportPanel } from '../components/analytics/ReportExportPanel';
import { DataQualityCard } from '../components/analytics/DataQualityCard';
import { DataPipelineStatusCard } from '../components/data/DataPipelineStatusCard';
import { CSVValidatorPanel } from '../components/data/CSVValidatorPanel';
import { useLanguage } from '../context/LanguageContext';
import type {
  StateComparisonRow,
  DistrictAnalysisRow,
  AnalyticsExportData,
} from '../utils/exportUtils';

interface OutletContextType {
  onSelectStation: (station: DWLRStation) => void;
}

export const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();
  const { onSelectStation } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  // All Stations Data
  const [allStations, setAllStations] = useState<DWLRStation[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<GroundwaterAnomaly[]>([]);
  const [statesList, setStatesList] = useState<string[]>(['All States']);
  const [districtsList, setDistrictsList] = useState<string[]>(['All Districts']);

  // Filter States
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [selectedStatus, setSelectedStatus] = useState<StationStatus | 'all'>('all');
  const [selectedRisk, setSelectedRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [selectedTrend, setSelectedTrend] = useState<TrendDirection | 'all'>('all');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewMode, setViewMode] = useState<'analyst' | 'simple'>('analyst');

  // Drill-down district state
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState<DistrictAnalysisRow | null>(null);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      const [stations, anomalies, states] = await Promise.all([
        stationService.getAllStations(),
        anomalyService.getAnomalies(),
        stationService.getDistinctStates(),
      ]);
      setAllStations(stations);
      setAllAnomalies(anomalies);
      setStatesList(states);
    }
    loadData();
  }, []);

  // Update Districts List when selectedState changes
  useEffect(() => {
    async function updateDistricts() {
      if (selectedState && selectedState !== 'All States') {
        const dists = await stationService.getDistinctDistricts(selectedState);
        setDistrictsList(dists);
        setSelectedDistrict('All Districts');
      } else {
        setDistrictsList(['All Districts']);
        setSelectedDistrict('All Districts');
      }
    }
    updateDistricts();
  }, [selectedState]);

  // Filtered Stations Set
  const filteredStations = useMemo(() => {
    return allStations.filter((st) => {
      if (selectedState !== 'All States' && st.state.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }
      if (selectedDistrict !== 'All Districts' && st.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'all' && st.status !== selectedStatus) {
        return false;
      }
      if (selectedTrend !== 'all' && st.trend !== selectedTrend) {
        return false;
      }
      if (selectedRisk !== 'all') {
        if (selectedRisk === 'low' && st.riskScore >= 0.35) return false;
        if (selectedRisk === 'medium' && (st.riskScore < 0.35 || st.riskScore >= 0.6)) return false;
        if (selectedRisk === 'high' && (st.riskScore < 0.6 || st.riskScore >= 0.8)) return false;
        if (selectedRisk === 'critical' && st.riskScore < 0.8) return false;
      }
      return true;
    });
  }, [allStations, selectedState, selectedDistrict, selectedStatus, selectedRisk, selectedTrend]);

  // Derived Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredStations.length;
    let healthy = 0;
    let moderate = 0;
    let warning = 0;
    let critical = 0;
    let sumDepth = 0;
    let sumRisk = 0;

    for (const st of filteredStations) {
      if (st.status === 'healthy') healthy++;
      else if (st.status === 'moderate') moderate++;
      else if (st.status === 'warning') warning++;
      else if (st.status === 'critical') critical++;

      sumDepth += st.waterLevel;
      sumRisk += st.riskScore;
    }

    const avgDepth = total > 0 ? +(sumDepth / total).toFixed(1) : 16.8;
    const avgRiskScore = total > 0 ? +(sumRisk / total).toFixed(2) : 0.48;

    return {
      total,
      healthy,
      moderate,
      warning,
      critical,
      avgDepth,
      avgRiskScore,
    };
  }, [filteredStations]);

  // Derived State Comparison Table Data
  const stateComparisonData: StateComparisonRow[] = useMemo(() => {
    const stateMap = new Map<
      string,
      { total: number; healthy: number; warning: number; critical: number; sumDepth: number; sumRisk: number; trendCounts: { falling: number; rising: number; stable: number } }
    >();

    for (const st of allStations) {
      if (!stateMap.has(st.state)) {
        stateMap.set(st.state, {
          total: 0,
          healthy: 0,
          warning: 0,
          critical: 0,
          sumDepth: 0,
          sumRisk: 0,
          trendCounts: { falling: 0, rising: 0, stable: 0 },
        });
      }
      const item = stateMap.get(st.state)!;
      item.total++;
      if (st.status === 'healthy') item.healthy++;
      else if (st.status === 'warning') item.warning++;
      else if (st.status === 'critical') item.critical++;

      item.sumDepth += st.waterLevel;
      item.sumRisk += st.riskScore;
      item.trendCounts[st.trend]++;
    }

    const rows: StateComparisonRow[] = [];
    stateMap.forEach((val, state) => {
      const dominantTrend =
        val.trendCounts.falling >= val.trendCounts.rising && val.trendCounts.falling >= val.trendCounts.stable
          ? 'falling'
          : val.trendCounts.rising >= val.trendCounts.stable
          ? 'rising'
          : 'stable';

      rows.push({
        state,
        totalStations: val.total,
        avgDepth: +(val.sumDepth / val.total).toFixed(1),
        healthyPct: Math.round((val.healthy / val.total) * 100),
        warningPct: Math.round((val.warning / val.total) * 100),
        criticalPct: Math.round((val.critical / val.total) * 100),
        avgRisk: +(val.sumRisk / val.total).toFixed(2),
        trend: dominantTrend,
      });
    });

    return rows;
  }, [allStations]);

  // Derived District Analysis Table Data
  const districtAnalysisData: DistrictAnalysisRow[] = useMemo(() => {
    const distMap = new Map<
      string,
      { state: string; total: number; critical: number; warning: number; sumDepth: number; sumRisk: number; sumDays: number; daysCount: number; trendCounts: { falling: number; rising: number; stable: number } }
    >();

    const targetScope = selectedState !== 'All States'
      ? allStations.filter((s) => s.state.toLowerCase() === selectedState.toLowerCase())
      : allStations;

    for (const st of targetScope) {
      const key = `${st.state}__${st.district}`;
      if (!distMap.has(key)) {
        distMap.set(key, {
          state: st.state,
          total: 0,
          critical: 0,
          warning: 0,
          sumDepth: 0,
          sumRisk: 0,
          sumDays: 0,
          daysCount: 0,
          trendCounts: { falling: 0, rising: 0, stable: 0 },
        });
      }
      const item = distMap.get(key)!;
      item.total++;
      if (st.status === 'critical') item.critical++;
      if (st.status === 'warning') item.warning++;
      item.sumDepth += st.waterLevel;
      item.sumRisk += st.riskScore;
      item.trendCounts[st.trend]++;
      if (st.daysToCritical) {
        item.sumDays += st.daysToCritical;
        item.daysCount++;
      }
    }

    const rows: DistrictAnalysisRow[] = [];
    distMap.forEach((val, key) => {
      const district = key.split('__')[1];
      const dominantTrend =
        val.trendCounts.falling >= val.trendCounts.rising && val.trendCounts.falling >= val.trendCounts.stable
          ? 'falling'
          : val.trendCounts.rising >= val.trendCounts.stable
          ? 'rising'
          : 'stable';

      const avgDays = val.daysCount > 0 ? Math.round(val.sumDays / val.daysCount) : 'Safe';

      rows.push({
        district,
        state: val.state,
        totalStations: val.total,
        avgDepth: +(val.sumDepth / val.total).toFixed(1),
        riskScore: +(val.sumRisk / val.total).toFixed(2),
        criticalCount: val.critical,
        warningCount: val.warning,
        trend: dominantTrend,
        avgDaysToCritical: avgDays,
      });
    });

    return rows;
  }, [allStations, selectedState]);

  // Export Data Payload
  const exportPayload: AnalyticsExportData = useMemo(() => {
    return {
      filters: {
        state: selectedState,
        district: selectedDistrict,
        status: selectedStatus,
        risk: selectedRisk,
        trend: selectedTrend,
        timeframe,
      },
      summary: {
        totalStations: summaryMetrics.total,
        healthyCount: summaryMetrics.healthy,
        moderateCount: summaryMetrics.moderate,
        warningCount: summaryMetrics.warning,
        criticalCount: summaryMetrics.critical,
        avgDepth: summaryMetrics.avgDepth,
        avgRiskScore: summaryMetrics.avgRiskScore,
        reportingRatePct: 98.4,
      },
      stateData: stateComparisonData,
      districtData: districtAnalysisData,
      stationData: filteredStations,
      anomaliesData: allAnomalies,
      generatedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };
  }, [
    selectedState,
    selectedDistrict,
    selectedStatus,
    selectedRisk,
    selectedTrend,
    timeframe,
    summaryMetrics,
    stateComparisonData,
    districtAnalysisData,
    filteredStations,
    allAnomalies,
  ]);

  const handleResetFilters = () => {
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setSelectedStatus('all');
    setSelectedRisk('all');
    setSelectedTrend('all');
  };

  const selectedRegionLabel =
    selectedDistrict !== 'All Districts'
      ? `${selectedDistrict}, ${selectedState}`
      : selectedState !== 'All States'
      ? selectedState
      : 'National Baseline (All India)';

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* Top Demo Simulation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-agri-600 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            {t('JalKrishi Policy & Hydrology Decision Engine')}
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">{t('5,260 Simulated DWLR Telemetry Observation Wells')}</span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-agri-600" />
          {t('Reference Simulation')}
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title={t('Groundwater Analytics & Decision Support')}
        subtitle={t('Compare groundwater conditions across states and districts, identify critical drawdown zones, and evaluate agricultural water security.')}
        farmerNote={t('By aggregating thousands of telemetry nodes, policy planners and farmer cooperatives can proactively roster irrigation schedules and grant allocations.')}
        badge={
          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs">
            <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
            {t('Decision Intelligence v2.6')}
          </span>
        }
      />

      {/* 2. Global Multi-Filter Toolbar */}
      <AnalyticsFilterBar
        states={statesList}
        districts={districtsList}
        selectedState={selectedState}
        onStateChange={setSelectedState}
        selectedDistrict={selectedDistrict}
        onDistrictChange={setSelectedDistrict}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedRisk={selectedRisk}
        onRiskChange={setSelectedRisk}
        selectedTrend={selectedTrend}
        onTrendChange={setSelectedTrend}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalFiltered={summaryMetrics.total}
        totalStations={allStations.length}
        onReset={handleResetFilters}
      />

      {/* 3. National / Filtered Summary Cards */}
      <AnalyticsSummaryCards
        totalStations={summaryMetrics.total}
        healthyCount={summaryMetrics.healthy}
        warningCount={summaryMetrics.warning}
        criticalCount={summaryMetrics.critical}
        avgDepth={summaryMetrics.avgDepth}
        avgRiskScore={summaryMetrics.avgRiskScore}
        onFilterCritical={() => setSelectedStatus('critical')}
        onFilterWarning={() => setSelectedStatus('warning')}
        onFilterHealthy={() => setSelectedStatus('healthy')}
      />

      {/* 4. Distribution Donut & Trend Trajectory Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <StatusDistributionChart
            healthyCount={summaryMetrics.healthy}
            moderateCount={summaryMetrics.moderate}
            warningCount={summaryMetrics.warning}
            criticalCount={summaryMetrics.critical}
            totalStations={summaryMetrics.total}
          />
        </div>

        <div className="lg:col-span-7">
          <GroundwaterTrendAnalytics
            timeframe={timeframe}
            selectedRegionLabel={selectedRegionLabel}
            avgDepth={summaryMetrics.avgDepth}
          />
        </div>
      </div>

      {/* 5. Top 10 States Requiring Attention */}
      <StateRiskRanking
        stateData={stateComparisonData}
        onSelectState={(st) => setSelectedState(st)}
      />

      {/* 6. State-wise Comparison Table */}
      <StateComparisonTable
        stateData={stateComparisonData}
        selectedState={selectedState}
        onSelectState={(st) => setSelectedState(st)}
      />

      {/* 7. District Drill-Down Panel (when clicked) */}
      {selectedDistrictDetail && (
        <DistrictDetailPanel
          district={selectedDistrictDetail}
          onClose={() => setSelectedDistrictDetail(null)}
          onNavigateToMap={() => {
            const firstSt = allStations.find(
              (s) => s.district.toLowerCase() === selectedDistrictDetail.district.toLowerCase()
            );
            if (firstSt) onSelectStation(firstSt);
            navigate('/map');
          }}
          onNavigateToForecast={() => {
            const firstSt = allStations.find(
              (s) => s.district.toLowerCase() === selectedDistrictDetail.district.toLowerCase()
            );
            if (firstSt) onSelectStation(firstSt);
            navigate('/forecast');
          }}
          onNavigateToAnomalies={() => navigate('/anomalies')}
          onNavigateToCrops={() => navigate('/crops')}
        />
      )}

      {/* 8. District-Level Analysis Table */}
      <DistrictAnalysisTable
        districtData={districtAnalysisData}
        selectedDistrictName={selectedDistrictDetail?.district}
        onSelectDistrict={(d) => setSelectedDistrictDetail(d)}
      />

      {/* 9. Agricultural Water Outlook */}
      <AgriculturalWaterOutlook
        criticalPct={Math.round((summaryMetrics.critical / (summaryMetrics.total || 1)) * 100)}
        avgDepth={summaryMetrics.avgDepth}
        regionLabel={selectedRegionLabel}
        onNavigateToCrops={() => navigate('/crops')}
      />

      {/* 10. Real Client-Side Report Export (XLSX & PDF) */}
      <ReportExportPanel exportData={exportPayload} />

      {/* 11. Data Quality & Telemetry Health */}
      <DataQualityCard
        totalStations={allStations.length}
        reportingRatePct={98.4}
        anomalyCount={allAnomalies.length}
      />

      {/* 12. Data Pipeline & Future Ingestion Layer (Phase I) */}
      <DataPipelineStatusCard />

      {/* 13. CSV Telemetry Ingestion & Quality Sandbox */}
      <CSVValidatorPanel />
    </div>
  );
};
