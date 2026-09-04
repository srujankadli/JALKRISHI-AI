import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  TrendingDown,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
  Bot,
  Database,
  GitCompare,
  Activity,
  Layers,
  Info,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  officialService,
  type OfficialOverviewResponse,
  type OfficialMapResponse,
  type ExplainStressResponse,
  type OfficialAlertsResponse,
  type RiskRankingResponse,
  type NetworkHealthResponse,
  type InterventionsResponse,
  type ScenarioSimulationResponse,
  type OfficialAnalystResponse,
  type EvidenceCenterResponse,
  type RegionComparisonResponse,
} from '../../services/officialService';

export const OfficialCommandCenter: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'map' | 'alerts' | 'ranking' | 'trends' | 'network' | 'interventions' | 'simulator' | 'analyst' | 'evidence' | 'compare'
  >('overview');

  // Loading & Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<OfficialOverviewResponse | null>(null);
  const [mapData, setMapData] = useState<OfficialMapResponse | null>(null);
  const [alertsData, setAlertsData] = useState<OfficialAlertsResponse | null>(null);
  const [rankingData, setRankingData] = useState<RiskRankingResponse | null>(null);
  const [trendsData, setTrendsData] = useState<any | null>(null);
  const [networkData, setNetworkData] = useState<NetworkHealthResponse | null>(null);
  const [interventionsData, setInterventionsData] = useState<InterventionsResponse | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceCenterResponse | null>(null);

  // Detail & Selection States
  const [selectedStationId, setSelectedStationId] = useState<string>('DWLR-PB-001');
  const [explainStress, setExplainStress] = useState<ExplainStressResponse | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('Groundwater Stress');
  const [rankingSort, setRankingSort] = useState<string>('risk_score');

  // Scenario Simulator Inputs
  const [simRainfall, setSimRainfall] = useState<number>(0);
  const [simDemand, setSimDemand] = useState<number>(0);
  const [simRechargeLevel, setSimRechargeLevel] = useState<string>('Medium');
  const [scenarioResult, setScenarioResult] = useState<ScenarioSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // AI Analyst State
  const [analystQuery, setAnalystQuery] = useState<string>('Which districts have the highest groundwater risk?');
  const [analystResult, setAnalystResult] = useState<OfficialAnalystResponse | null>(null);
  const [analystSearching, setAnalystSearching] = useState<boolean>(false);

  // Region Comparison Inputs
  const [regionA, setRegionA] = useState<string>('Sangrur');
  const [regionB, setRegionB] = useState<string>('Kolar');
  const [comparisonResult, setComparisonResult] = useState<RegionComparisonResponse | null>(null);
  const [comparing, setComparing] = useState<boolean>(false);

  // Load Initial Overview Data
  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        officialService.getOverview(),
        officialService.getIntelligenceMap(selectedLayer),
        officialService.getAlerts(),
        officialService.getRiskRanking(rankingSort),
        officialService.getTrendsAnalytics(selectedStationId, 30),
        officialService.getNetworkHealth(),
        officialService.getInterventions(),
        officialService.getEvidenceCenter(),
      ]);

      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') setMapData(results[1].value);
      if (results[2].status === 'fulfilled') setAlertsData(results[2].value);
      if (results[3].status === 'fulfilled') setRankingData(results[3].value);
      if (results[4].status === 'fulfilled') setTrendsData(results[4].value);
      if (results[5].status === 'fulfilled') setNetworkData(results[5].value);
      if (results[6].status === 'fulfilled') setInterventionsData(results[6].value);
      if (results[7].status === 'fulfilled') setEvidenceData(results[7].value);

      const mp = results[1].status === 'fulfilled' ? results[1].value : null;
      if (mp && mp.features && mp.features.length > 0) {
        try {
          const exp = await officialService.explainAreaStress(mp.features[0].id);
          setExplainStress(exp);
        } catch (e) {
          console.warn('Explain stress load warning', e);
        }
      }
    } catch (e) {
      console.error('Error loading official intelligence data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFeature = async (id: string) => {
    setSelectedStationId(id);
    try {
      const [exp, tr] = await Promise.all([
        officialService.explainAreaStress(id),
        officialService.getTrendsAnalytics(id, 30),
      ]);
      setExplainStress(exp);
      setTrendsData(tr);
    } catch (e) {
      console.error('Error fetching area details', e);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await officialService.simulateScenario({
        rainfall_pct_change: simRainfall,
        crop_demand_pct_change: simDemand,
        recharge_intervention_level: simRechargeLevel,
      });
      setScenarioResult(res);
    } catch (e) {
      console.error('Scenario simulation error', e);
    } finally {
      setSimulating(false);
    }
  };

  const handleRunAnalyst = async (q?: string) => {
    const queryToUse = q || analystQuery;
    setAnalystSearching(true);
    try {
      const res = await officialService.queryAIAnalyst(queryToUse);
      setAnalystResult(res);
    } catch (e) {
      console.error('AI analyst query error', e);
    } finally {
      setAnalystSearching(false);
    }
  };

  const handleRunComparison = async () => {
    setComparing(true);
    try {
      const res = await officialService.compareRegions(regionA, regionB);
      setComparisonResult(res);
    } catch (e) {
      console.error('Region comparison error', e);
    } finally {
      setComparing(false);
    }
  };

  // Network Pagination & Filtering State
  const [networkPage, setNetworkPage] = useState<number>(1);
  const [networkPageSize, setNetworkPageSize] = useState<number>(25);
  const [networkSearch, setNetworkSearch] = useState<string>('');
  const [networkStateFilter, setNetworkStateFilter] = useState<string>('');
  const [networkDistrictFilter, setNetworkDistrictFilter] = useState<string>('');
  const [networkRiskFilter, setNetworkRiskFilter] = useState<string>('');
  const [networkTelemetryFilter, setNetworkTelemetryFilter] = useState<string>('');
  const [networkSensorFilter, setNetworkSensorFilter] = useState<string>('');

  // Risk Leaderboard Pagination State
  const [rankingPage, setRankingPage] = useState<number>(1);
  const [rankingPageSize, setRankingPageSize] = useState<number>(25);
  const [rankingLevel, setRankingLevel] = useState<string>('district');

  const fetchNetworkWithParams = async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    state?: string;
    district?: string;
    risk?: string;
    telemetry?: string;
    sensor?: string;
  }) => {
    const nextPage = params.page ?? networkPage;
    const nextPageSize = params.pageSize ?? networkPageSize;
    const nextSearch = params.search ?? networkSearch;
    const nextState = params.state ?? networkStateFilter;
    const nextDistrict = params.district ?? networkDistrictFilter;
    const nextRisk = params.risk ?? networkRiskFilter;
    const nextTelemetry = params.telemetry ?? networkTelemetryFilter;
    const nextSensor = params.sensor ?? networkSensorFilter;

    try {
      const res = await officialService.getNetworkHealth({
        page: nextPage,
        page_size: nextPageSize,
        search: nextSearch,
        state: nextState,
        district: nextDistrict,
        risk: nextRisk,
        telemetry_status: nextTelemetry,
        sensor_status: nextSensor,
      });
      setNetworkData(res);
      setNetworkPage(nextPage);
      setNetworkPageSize(nextPageSize);
    } catch (e) {
      console.error('Error loading network health', e);
    }
  };

  const fetchRankingWithParams = async (params: {
    sort?: string;
    level?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const nextSort = params.sort ?? rankingSort;
    const nextLevel = params.level ?? rankingLevel;
    const nextPage = params.page ?? rankingPage;
    const nextPageSize = params.pageSize ?? rankingPageSize;

    try {
      const res = await officialService.getRiskRanking(nextSort, nextLevel, undefined, nextPage, nextPageSize);
      setRankingData(res);
      setRankingSort(nextSort);
      setRankingLevel(nextLevel);
      setRankingPage(nextPage);
      setRankingPageSize(nextPageSize);
    } catch (e) {
      console.error('Error loading risk ranking', e);
    }
  };

  const handleRankingSortChange = async (newSort: string) => {
    await fetchRankingWithParams({ sort: newSort, page: 1 });
  };

  const activeRoleDisplay = (
    user?.system_role
      ? user.system_role.replace(/_/g, ' ').toUpperCase()
      : (overview?.user_role || user?.role || 'OFFICIAL')
  ).toUpperCase();

  const activeScopeDisplay = overview?.assigned_scope || user?.assigned_state || 'Authorized Network Scope';

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans p-4 lg:p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="rounded-2xl border border-stone-700 bg-stone-850 p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-agri-900/80 text-agri-300 text-xs font-bold border border-agri-700 uppercase tracking-wide">
              Official Decision Support
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-xs font-mono font-semibold border border-stone-700">
              {activeRoleDisplay}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-agri-400" />
            {t('JalKrishi Groundwater Command & Decision Center')}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5 flex items-center gap-2">
            <span>{t('Authorized Scope')}:</span>
            <span className="font-semibold text-stone-200">{activeScopeDisplay}</span>
          </p>
        </div>

        {/* Data Honesty Disclosures */}
        <div className="rounded-xl border border-stone-700 bg-stone-950/80 p-3 text-xs space-y-1 max-w-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Info className="h-4 w-4 shrink-0" />
              <span>{t('Data Mode & Provenance Disclosure')}</span>
            </div>
            {overview?.kpis.data_mode?.includes('FALLBACK') ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 font-mono">
                {t('Local Reference Fallback — Backend Unavailable')}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                {t('Reference Simulation Dataset — Active Backend')}
              </span>
            )}
          </div>
          <p className="text-stone-300 text-[11px] leading-relaxed">
            {overview?.disclaimer || t('JalKrishi Reference Simulation Dataset & Hydrogeological Model Output. Unconfigured external feeds are reported as NOT_CONFIGURED.')}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto whitespace-nowrap max-w-full select-none shrink-0 scrollbar-thin">
        {[
          { id: 'overview', label: t('Overview'), icon: Activity },
          { id: 'map', label: t('Intelligence Map'), icon: MapPin },
          { id: 'alerts', label: t('Early Warning'), icon: AlertTriangle, badge: alertsData?.total_alerts },
          { id: 'ranking', label: t('Risk Leaderboard'), icon: TrendingDown },
          { id: 'trends', label: t('Trends Analytics'), icon: Activity },
          { id: 'network', label: t('DWLR Network'), icon: Radio },
          { id: 'interventions', label: t('Interventions'), icon: Zap },
          { id: 'simulator', label: t('Scenario Simulator'), icon: SlidersHorizontal },
          { id: 'analyst', label: t('AI Analyst'), icon: Bot },
          { id: 'evidence', label: t('Evidence Center'), icon: Database },
          { id: 'compare', label: t('Region Compare'), icon: GitCompare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-agri-600 text-white shadow-md font-bold'
                  : 'bg-stone-800/80 text-stone-300 hover:bg-stone-750 hover:text-white border border-stone-750'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Command Content Area */}
      {loading ? (
        <div className="p-12 rounded-2xl border border-stone-800 bg-stone-850 flex items-center justify-center gap-3 text-stone-400">
          <RefreshCw className="h-6 w-6 animate-spin text-agri-400" />
          <span className="font-semibold">{t('Initializing Command & Decision Intelligence...')}</span>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              {/* Top KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850 space-y-1">
                  <span className="text-xs text-stone-400 font-medium block">{t('Monitoring Stations')}</span>
                  <span className="text-2xl font-extrabold text-white font-mono">{overview.kpis.monitoring_stations.toLocaleString()}</span>
                  <span className="text-[10px] text-stone-400 block">{t('5,260 Reference Dataset')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850 space-y-1">
                  <span className="text-xs text-stone-400 font-medium block">{t('Reporting Rate')}</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">{overview.kpis.data_coverage_pct}%</span>
                  <span className="text-[10px] text-emerald-300 block">{overview.kpis.reporting_stations} {t('Online Nodes')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850 space-y-1">
                  <span className="text-xs text-stone-400 font-medium block">{t('Critical Depth Wells')}</span>
                  <span className="text-2xl font-extrabold text-rose-400 font-mono">{overview.kpis.critical_stations}</span>
                  <span className="text-[10px] text-rose-300 block">{t('Depletion > 22.0 m bgl')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850 space-y-1">
                  <span className="text-xs text-stone-400 font-medium block">{t('Declining Zones')}</span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">{overview.kpis.declining_zones}</span>
                  <span className="text-[10px] text-amber-300 block">{t('Downward Trajectory')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850 space-y-1">
                  <span className="text-xs text-stone-400 font-medium block">{t('Recharge Opportunities')}</span>
                  <span className="text-2xl font-extrabold text-blue-400 font-mono">{overview.kpis.recharge_opportunity_zones}</span>
                  <span className="text-[10px] text-blue-300 block">{t('High Runoff Potential')}</span>
                </div>
              </div>

              {/* High Risk Highlights & Recent Anomalies */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-rose-400" />
                    {t('High-Risk Groundwater Priority Districts')}
                  </h2>
                  <div className="space-y-2">
                    {overview.high_risk_districts.map((d, idx) => (
                      <div key={d} className="p-3 rounded-xl bg-stone-900 border border-stone-750 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-rose-950 text-rose-300 text-xs font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-stone-200">{d}</span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('map');
                            handleSelectFeature(d);
                          }}
                          className="text-xs font-bold text-agri-400 hover:text-agri-300 flex items-center gap-1"
                        >
                          <span>{t('Inspect Risk Evidence')}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-400" />
                    {t('Telemetry Network Anomalies')}
                  </h2>
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-750 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">{t('Recent Telemetry Spikes & Drops')}</span>
                      <span className="font-mono font-bold text-amber-400">{overview.recent_anomalies_count} {t('Events Detected')}</span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {t('Sub-surface telemetry streams exhibit localized extraction spikes and sensor delay alerts requiring official validation.')}
                    </p>
                    <button
                      onClick={() => setActiveTab('alerts')}
                      className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-750 transition"
                    >
                      {t('View All Early Warning Alerts')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTELLIGENCE MAP */}
          {activeTab === 'map' && mapData && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Map Features & Layer Controls */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-2xl border border-stone-750 bg-stone-850 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-agri-400" />
                    <span className="font-bold text-sm text-white">{t('Active Layer')}:</span>
                    <select
                      value={selectedLayer}
                      onChange={(e) => setSelectedLayer(e.target.value)}
                      className="bg-stone-900 border border-stone-700 text-stone-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none"
                    >
                      {mapData.available_layers.map((lay) => (
                        <option key={lay} value={lay}>
                          {lay}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs text-stone-400">{mapData.features.length} {t('GIS Nodes')}</span>
                </div>

                {/* Simulated GIS Feature List */}
                <div className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('GIS Monitoring Locations')}</h3>
                  <div className="grid sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {mapData.features.map((feat) => {
                      const isSelected = selectedStationId === feat.id;
                      return (
                        <div
                          key={feat.id}
                          onClick={() => handleSelectFeature(feat.id)}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-agri-500 bg-agri-950/40 text-white shadow-lg'
                              : 'border-stone-750 bg-stone-900 text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-stone-100 mb-1">
                            <span>{feat.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              feat.groundwater_condition === 'CRITICAL' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                            }`}>
                              {feat.groundwater_condition}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-400 mt-2">
                            <span>{t('Depth')}: <strong className="text-white">{feat.groundwater_level} m bgl</strong></span>
                            <span>{t('Trend')}: <strong className="text-white">{feat.trend}</strong></span>
                            <span>{t('Risk Score')}: <strong className="text-amber-400">{feat.risk_score}/100</strong></span>
                            <span>{t('Confidence')}: <strong className="text-emerald-400">{feat.confidence}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Explain Stress Panel */}
              <div className="space-y-4">
                {explainStress && (
                  <div className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-4 sticky top-6">
                    <div className="flex items-center justify-between border-b border-stone-750 pb-3">
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">{t('Explainable Intelligence')}</span>
                        <h3 className="text-base font-extrabold text-white">{t('Why is this area stressed?')}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-900/80 text-rose-200 text-xs font-mono font-bold">
                        {explainStress.risk_level}
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 font-semibold">{explainStress.area_name}</p>

                    {/* Primary Contributors */}
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">{t('Primary Contributing Signals')}</span>
                      {explainStress.primary_contributors.map((c) => (
                        <div key={c.factor} className="p-3 rounded-xl bg-stone-900 border border-stone-750 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-stone-200">
                            <span>{c.factor}</span>
                            <span className="text-amber-400 font-mono">{c.weight_pct}%</span>
                          </div>
                          <p className="text-[11px] text-stone-400 leading-relaxed">{c.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Supporting Evidence */}
                    <div className="space-y-2 pt-2 border-t border-stone-750">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">{t('Supporting Evidence')}</span>
                      <ul className="space-y-1 text-xs text-stone-300">
                        {explainStress.supporting_evidence.map((ev, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-agri-400 shrink-0 mt-0.5" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-[10px] text-stone-400 italic pt-2 border-t border-stone-750">
                      {explainStress.model_interpretation_note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EARLY WARNING ALERTS */}
          {activeTab === 'alerts' && alertsData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{t('Groundwater Early Warning System Alerts')}</h2>
                <span className="text-xs text-stone-400">{alertsData.total_alerts} {t('Active Signals')}</span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alertsData.alerts.map((alt) => (
                  <div key={alt.alert_id} className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono ${
                        alt.severity === 'CRITICAL' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                      }`}>
                        {alt.severity}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">{alt.trend}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base">{alt.location_name}</h3>
                      <p className="text-xs text-stone-400">{alt.district}, {alt.state}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-900 border border-stone-750 text-xs space-y-1">
                      <span className="font-bold text-amber-300 block">{alt.detected_signal}</span>
                      <ul className="text-[11px] text-stone-400 space-y-0.5 list-disc list-inside">
                        {alt.evidence.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-stone-750">
                      <span className="text-[11px] font-bold text-agri-400 block">{t('Suggested Action')}:</span>
                      <p className="text-xs text-stone-300 leading-relaxed mt-0.5">{alt.suggested_official_action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RISK LEADERBOARD */}
          {activeTab === 'ranking' && rankingData && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-stone-750 bg-stone-850 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-amber-400" />
                    {t('Transparent Groundwater Risk Index Leaderboard')}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">{rankingData.methodology}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-lg p-1">
                    <button
                      onClick={() => fetchRankingWithParams({ level: 'district', page: 1 })}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                        rankingLevel === 'district' ? 'bg-agri-600 text-white' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {t('District Level')}
                    </button>
                    <button
                      onClick={() => fetchRankingWithParams({ level: 'state', page: 1 })}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                        rankingLevel === 'state' ? 'bg-agri-600 text-white' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {t('State Level')}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 font-semibold">{t('Sort By')}:</span>
                    <select
                      value={rankingSort}
                      onChange={(e) => handleRankingSortChange(e.target.value)}
                      className="bg-stone-900 border border-stone-700 text-stone-200 text-xs font-semibold rounded-lg px-3 py-1.5"
                    >
                      <option value="risk_score">{t('Highest Risk Index')}</option>
                      <option value="fastest_decline">{t('Fastest Decline')}</option>
                      <option value="recharge_opportunity">{t('Recharge Opportunity')}</option>
                      <option value="lowest_confidence">{t('Lowest Confidence')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 font-semibold">{t('Rows')}:</span>
                    <select
                      value={rankingPageSize}
                      onChange={(e) => fetchRankingWithParams({ pageSize: Number(e.target.value), page: 1 })}
                      className="bg-stone-900 border border-stone-700 text-stone-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 font-mono"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-stone-750 bg-stone-850">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 text-stone-400 font-bold border-b border-stone-750 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">{rankingLevel === 'state' ? t('State') : t('District')}</th>
                      <th className="p-3.5">{rankingLevel === 'state' ? t('Region') : t('State')}</th>
                      <th className="p-3.5">{t('Risk Score')}</th>
                      <th className="p-3.5">{t('Category')}</th>
                      <th className="p-3.5">{t('Trend')}</th>
                      <th className="p-3.5">{t('Confidence')}</th>
                      <th className="p-3.5">{t('Recharge Score')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {rankingData.rankings.map((item) => (
                      <tr key={item.region_name} className="hover:bg-stone-800/50 transition">
                        <td className="p-3.5 font-bold font-mono text-stone-400">#{item.rank}</td>
                        <td className="p-3.5 font-semibold text-white">{item.region_name}</td>
                        <td className="p-3.5 text-stone-400">{item.parent_region}</td>
                        <td className="p-3.5 font-bold font-mono text-amber-400">{item.risk_score} / 100</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.risk_category === 'CRITICAL' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                          }`}>
                            {item.risk_category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">{item.trend}</td>
                        <td className="p-3.5 font-semibold text-emerald-400">{item.confidence}</td>
                        <td className="p-3.5 font-mono text-blue-400">{item.recharge_score}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ranking Pagination Controls */}
              <div className="p-4 rounded-2xl border border-stone-750 bg-stone-850 flex flex-wrap items-center justify-between gap-4 text-xs">
                <span className="text-stone-400 font-mono">
                  {t('Showing Page')} <strong className="text-white">{rankingData.page || 1}</strong> {t('of')} <strong className="text-white">{rankingData.total_pages || 1}</strong> ({rankingData.total_items || rankingData.rankings.length} {t('Ranked Regions')})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={(rankingData.page || 1) <= 1}
                    onClick={() => fetchRankingWithParams({ page: (rankingData.page || 1) - 1 })}
                    className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition font-semibold"
                  >
                    {t('Previous')}
                  </button>
                  <span className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-750 font-mono font-bold text-amber-400">
                    {rankingData.page || 1} / {rankingData.total_pages || 1}
                  </span>
                  <button
                    disabled={(rankingData.page || 1) >= (rankingData.total_pages || 1)}
                    onClick={() => fetchRankingWithParams({ page: (rankingData.page || 1) + 1 })}
                    className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition font-semibold"
                  >
                    {t('Next')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TRENDS ANALYTICS */}
          {activeTab === 'trends' && trendsData && (
            <div className="p-6 rounded-2xl border border-stone-750 bg-stone-850 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-750 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{trendsData.station_name}</h2>
                  <p className="text-xs text-stone-400">{trendsData.district}, {trendsData.state}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span> {t('Observed DWLR')}
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span> {t('30-Day Model Forecast')}
                  </span>
                </div>
              </div>

              {/* Observed Points & Forecast Points Breakdown */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-750 space-y-2">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t('Observed Telemetry Series (Past 30 Days)')}</h3>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {trendsData.observed_series.map((pt: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-stone-850">
                        <span className="text-stone-400 font-mono">{pt.day}</span>
                        <span className="font-bold text-white font-mono">{pt.value} m bgl</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-900 border border-stone-750 space-y-2">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">{t('Model Forecast Trajectory (Next 30 Days)')}</h3>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {trendsData.forecast_series.map((pt: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-stone-850">
                        <span className="text-stone-400 font-mono">{pt.day}</span>
                        <span className="font-bold text-amber-400 font-mono">{pt.value} m bgl</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DWLR NETWORK HEALTH */}
          {activeTab === 'network' && networkData && (
            <div className="space-y-4">
              {/* Network-wide Operational KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-stone-400">{t('Total DWLR Network Nodes')}</span>
                  <span className="text-2xl font-extrabold text-white block font-mono">{networkData.total_stations}</span>
                  <span className="text-[10px] text-stone-500 font-sans">{t('Full Authorized Scope')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-emerald-400">{t('Online Telemetry Nodes')}</span>
                  <span className="text-2xl font-extrabold text-emerald-400 block font-mono">{networkData.online_stations}</span>
                  <span className="text-[10px] text-emerald-500 font-mono">{networkData.reporting_pct}% {t('Reporting Rate')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-amber-400">{t('Delayed Telemetry')}</span>
                  <span className="text-2xl font-extrabold text-amber-400 block font-mono">{networkData.delayed_stations}</span>
                  <span className="text-[10px] text-amber-500">{t('Latency > 24 Hours')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-rose-400">{t('Offline Nodes')}</span>
                  <span className="text-2xl font-extrabold text-rose-400 block font-mono">{networkData.offline_stations}</span>
                  <span className="text-[10px] text-rose-500">{t('No Connection Signal')}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-purple-400">{t('Missing Pings Count')}</span>
                  <span className="text-2xl font-extrabold text-purple-400 block font-mono">{networkData.missing_pings_count}</span>
                  <span className="text-[10px] text-purple-500">{t('Delayed + Offline Pings')}</span>
                </div>
              </div>

              {/* Station Search & Multi-Field Filter Controls */}
              <div className="p-4 rounded-2xl border border-stone-750 bg-stone-850 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-750 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="h-4 w-4 text-agri-400" />
                    {t('Station-Level Telemetry Network Inspector')}
                  </h3>
                  <button
                    onClick={() => {
                      setNetworkSearch('');
                      setNetworkStateFilter('');
                      setNetworkDistrictFilter('');
                      setNetworkRiskFilter('');
                      setNetworkTelemetryFilter('');
                      setNetworkSensorFilter('');
                      fetchNetworkWithParams({
                        search: '',
                        state: '',
                        district: '',
                        risk: '',
                        telemetry: '',
                        sensor: '',
                        page: 1,
                      });
                    }}
                    className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-400 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('Reset Filters')}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      type="text"
                      placeholder={t('Search by ID, name, district, state...')}
                      value={networkSearch}
                      onChange={(e) => {
                        setNetworkSearch(e.target.value);
                        fetchNetworkWithParams({ search: e.target.value, page: 1 });
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-agri-500"
                    />
                  </div>

                  {/* State Filter */}
                  <input
                    type="text"
                    placeholder={t('Filter by State (e.g. Punjab, Rajasthan)...')}
                    value={networkStateFilter}
                    onChange={(e) => {
                      setNetworkStateFilter(e.target.value);
                      fetchNetworkWithParams({ state: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-agri-500"
                  />

                  {/* District Filter */}
                  <input
                    type="text"
                    placeholder={t('Filter by District (e.g. Sangrur, Kolar)...')}
                    value={networkDistrictFilter}
                    onChange={(e) => {
                      setNetworkDistrictFilter(e.target.value);
                      fetchNetworkWithParams({ district: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-agri-500"
                  />

                  {/* Risk Level Filter */}
                  <select
                    value={networkRiskFilter}
                    onChange={(e) => {
                      setNetworkRiskFilter(e.target.value);
                      fetchNetworkWithParams({ risk: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-agri-500 font-semibold"
                  >
                    <option value="">{t('All Risk Categories')}</option>
                    <option value="critical">{t('CRITICAL (>24m bgl)')}</option>
                    <option value="warning">{t('WARNING (18-24m bgl)')}</option>
                    <option value="healthy">{t('HEALTHY (<18m bgl)')}</option>
                  </select>

                  {/* Telemetry Status Filter */}
                  <select
                    value={networkTelemetryFilter}
                    onChange={(e) => {
                      setNetworkTelemetryFilter(e.target.value);
                      fetchNetworkWithParams({ telemetry: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-agri-500 font-semibold"
                  >
                    <option value="">{t('All Telemetry Statuses')}</option>
                    <option value="online">{t('ONLINE')}</option>
                    <option value="delayed">{t('DELAYED')}</option>
                    <option value="offline">{t('OFFLINE')}</option>
                  </select>

                  {/* Sensor Status Filter */}
                  <select
                    value={networkSensorFilter}
                    onChange={(e) => {
                      setNetworkSensorFilter(e.target.value);
                      fetchNetworkWithParams({ sensor: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-agri-500 font-semibold"
                  >
                    <option value="">{t('All Sensor Statuses')}</option>
                    <option value="CALIBRATED">{t('CALIBRATED')}</option>
                    <option value="CALIBRATION_DUE">{t('CALIBRATION_DUE')}</option>
                    <option value="NO_PING">{t('NO_PING')}</option>
                  </select>

                  {/* Rows Per Page */}
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 font-semibold">{t('Page Size')}:</span>
                    <select
                      value={networkPageSize}
                      onChange={(e) => {
                        const newSz = Number(e.target.value);
                        fetchNetworkWithParams({ pageSize: newSz, page: 1 });
                      }}
                      className="bg-stone-900 border border-stone-700 text-stone-200 px-3 py-2 rounded-lg font-mono font-semibold"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Station Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-stone-750 bg-stone-850">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 text-stone-400 font-bold border-b border-stone-750">
                    <tr>
                      <th className="p-3.5">{t('Station ID')}</th>
                      <th className="p-3.5">{t('Station Name')}</th>
                      <th className="p-3.5">{t('District')}</th>
                      <th className="p-3.5">{t('State')}</th>
                      <th className="p-3.5">{t('Latest Reading')}</th>
                      <th className="p-3.5">{t('Telemetry Status')}</th>
                      <th className="p-3.5">{t('Battery')}</th>
                      <th className="p-3.5">{t('Sensor Calibration')}</th>
                      <th className="p-3.5">{t('Quality Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {networkData.stations.map((st) => (
                      <tr key={st.station_id} className="hover:bg-stone-800/50">
                        <td className="p-3.5 font-mono font-bold text-agri-400">{st.station_id}</td>
                        <td className="p-3.5 font-semibold text-white">{st.station_name}</td>
                        <td className="p-3.5 text-stone-400">{st.district}</td>
                        <td className="p-3.5 text-stone-400">{st.state}</td>
                        <td className="p-3.5 font-mono font-bold">{st.latest_reading} m bgl</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            st.telemetry_status === 'online' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : (st.telemetry_status === 'delayed' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-rose-950 text-rose-300 border border-rose-800')
                          }`}>
                            {st.telemetry_status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-stone-200">
                          {st.battery_level ? `${st.battery_level}%` : 'N/A'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                            st.sensor_status === 'CALIBRATED' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {st.sensor_status || 'CALIBRATED'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            st.data_quality_status === 'critical' ? 'bg-rose-900 text-rose-200' : (st.data_quality_status === 'warning' ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200')
                          }`}>
                            {st.data_quality_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DWLR Network Pagination Controls */}
              <div className="p-4 rounded-2xl border border-stone-750 bg-stone-850 flex flex-wrap items-center justify-between gap-4 text-xs">
                <span className="text-stone-400 font-mono">
                  {t('Showing Page')} <strong className="text-white">{networkData.page || 1}</strong> {t('of')} <strong className="text-white">{networkData.total_pages || 1}</strong> ({networkData.total_items || networkData.stations.length} {t('Matching DWLR Stations out of')} {networkData.total_stations} {t('Total Authorized Stations')})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={(networkData.page || 1) <= 1}
                    onClick={() => fetchNetworkWithParams({ page: 1 })}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 font-semibold"
                  >
                    {t('First')}
                  </button>
                  <button
                    disabled={(networkData.page || 1) <= 1}
                    onClick={() => fetchNetworkWithParams({ page: (networkData.page || 1) - 1 })}
                    className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition font-semibold"
                  >
                    {t('Previous')}
                  </button>
                  <span className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-750 font-mono font-bold text-emerald-400">
                    {networkData.page || 1} / {networkData.total_pages || 1}
                  </span>
                  <button
                    disabled={(networkData.page || 1) >= (networkData.total_pages || 1)}
                    onClick={() => fetchNetworkWithParams({ page: (networkData.page || 1) + 1 })}
                    className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition font-semibold"
                  >
                    {t('Next')}
                  </button>
                  <button
                    disabled={(networkData.page || 1) >= (networkData.total_pages || 1)}
                    onClick={() => fetchNetworkWithParams({ page: networkData.total_pages || 1 })}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-900 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 font-semibold"
                  >
                    {t('Last')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INTERVENTIONS */}
          {activeTab === 'interventions' && interventionsData && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">{t('Recharge & Intervention Decision Support Candidates')}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interventionsData.opportunities.map((opp) => (
                  <div key={opp.id} className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-900/80 text-blue-200 text-xs font-bold">
                      {opp.category}
                    </span>
                    <h3 className="font-bold text-white text-base">{opp.area_name}</h3>
                    <p className="text-xs text-stone-400">{opp.district}, {opp.state}</p>
                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-900 p-3 rounded-xl border border-stone-750">
                      {opp.potential_intervention}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: SCENARIO SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-stone-750 bg-stone-850 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-agri-400" />
                  {t('What-If Scenario Simulator')}
                </h2>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-stone-300 font-bold block mb-1">
                      {t('Hypothetical Rainfall Shift')} ({simRainfall > 0 ? `+${simRainfall}` : simRainfall}%)
                    </label>
                    <input
                      type="range" min="-20" max="20" step="5"
                      value={simRainfall}
                      onChange={(e) => setSimRainfall(Number(e.target.value))}
                      className="w-full accent-agri-500"
                    />
                  </div>

                  <div>
                    <label className="text-stone-300 font-bold block mb-1">
                      {t('Crop Water Extraction Demand')} ({simDemand > 0 ? `+${simDemand}` : simDemand}%)
                    </label>
                    <input
                      type="range" min="-20" max="20" step="5"
                      value={simDemand}
                      onChange={(e) => setSimDemand(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-stone-300 font-bold block mb-1">{t('Recharge Intervention Level')}</label>
                    <select
                      value={simRechargeLevel}
                      onChange={(e) => setSimRechargeLevel(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 text-stone-200 p-2 rounded-lg"
                    >
                      <option value="None">{t('None')}</option>
                      <option value="Low">{t('Low (+3% Recharge)')}</option>
                      <option value="Medium">{t('Medium (+7% Recharge)')}</option>
                      <option value="High">{t('High (+12% Recharge)')}</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    className="w-full py-2.5 rounded-xl bg-agri-600 hover:bg-agri-500 font-bold text-white transition flex items-center justify-center gap-2"
                  >
                    {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    <span>{t('Execute Scenario Simulation')}</span>
                  </button>
                </div>
              </div>

              {/* Simulation Result Output */}
              <div className="p-6 rounded-2xl border border-stone-750 bg-stone-850 space-y-4">
                <h3 className="text-base font-bold text-white">{t('Simulated Impact Trajectory')}</h3>
                {scenarioResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-xl bg-stone-900 border border-stone-750 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">{t('Simulated Stress Score')}:</span>
                        <span className="text-lg font-bold font-mono text-amber-400">{scenarioResult.simulated_stress_score}/100</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">{t('Stress Delta Shift')}:</span>
                        <span className={`font-mono font-bold ${scenarioResult.delta_pct < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {scenarioResult.delta_pct}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-[11px]">
                      {scenarioResult.disclaimer}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">{t('Adjust sliders and click Execute to view scenario simulation.')}</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: AI ANALYST */}
          {activeTab === 'analyst' && (
            <div className="p-6 rounded-2xl border border-stone-750 bg-stone-850 space-y-6">
              <div className="flex items-center gap-3 border-b border-stone-750 pb-4">
                <Bot className="h-7 w-7 text-agri-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">{t('JalKrishi Official AI Intelligence Analyst')}</h2>
                  <p className="text-xs text-stone-400">{t('Grounded question answering over authorized JalKrishi hydrogeology datasets.')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={analystQuery}
                  onChange={(e) => setAnalystQuery(e.target.value)}
                  className="flex-1 bg-stone-900 border border-stone-700 text-stone-100 text-sm p-3 rounded-xl focus:outline-none"
                  placeholder={t('Ask official questions (e.g. Which districts have highest groundwater risk?)')}
                />
                <button
                  onClick={() => handleRunAnalyst()}
                  disabled={analystSearching}
                  className="px-5 py-3 rounded-xl bg-agri-600 hover:bg-agri-500 text-white font-bold text-sm flex items-center gap-2"
                >
                  {analystSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>{t('Ask')}</span>
                </button>
              </div>

              {analystResult && (
                <div className="p-5 rounded-2xl bg-stone-900 border border-stone-750 space-y-4">
                  <h3 className="font-bold text-white text-base">{analystResult.query}</h3>
                  <p className="text-sm text-stone-200 leading-relaxed bg-stone-850 p-4 rounded-xl border border-stone-750">
                    {analystResult.answer}
                  </p>
                  <div className="space-y-1 text-xs text-stone-300">
                    <span className="font-bold text-stone-400 block uppercase tracking-wider">{t('Grounded Evidence')}:</span>
                    <ul className="list-disc list-inside space-y-1 text-stone-400">
                      {analystResult.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: EVIDENCE CENTER */}
          {activeTab === 'evidence' && evidenceData && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">{t('Data & Evidence Provider Status Center')}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {evidenceData.providers.map((p) => (
                  <div key={p.provider_name} className="p-5 rounded-2xl border border-stone-750 bg-stone-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{p.provider_name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        p.status === 'ACTIVE_SIMULATION' ? 'bg-emerald-950 text-emerald-300' : 'bg-stone-800 text-stone-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: REGION COMPARE */}
          {activeTab === 'compare' && (
            <div className="p-6 rounded-2xl border border-stone-750 bg-stone-850 space-y-5">
              <h2 className="text-lg font-bold text-white">{t('Region Comparison Tool')}</h2>
              <div className="flex items-center gap-3 text-xs">
                <input
                  type="text" value={regionA} onChange={(e) => setRegionA(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-100 p-2.5 rounded-xl flex-1"
                  placeholder={t('Region A')}
                />
                <span className="font-bold text-stone-500">VS</span>
                <input
                  type="text" value={regionB} onChange={(e) => setRegionB(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-100 p-2.5 rounded-xl flex-1"
                  placeholder={t('Region B')}
                />
                <button
                  onClick={handleRunComparison}
                  disabled={comparing}
                  className="px-4 py-2.5 bg-agri-600 text-white font-bold rounded-xl"
                >
                  {t('Compare')}
                </button>
              </div>

              {comparisonResult && (
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-750 text-xs text-stone-200 space-y-2">
                  <p className="font-bold text-agri-300">{comparisonResult.comparative_interpretation}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
