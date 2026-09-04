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
      const [ov, mp, al, rk, tr, nw, it, ev] = await Promise.all([
        officialService.getOverview(),
        officialService.getIntelligenceMap(selectedLayer),
        officialService.getAlerts(),
        officialService.getRiskRanking(rankingSort),
        officialService.getTrendsAnalytics(selectedStationId, 30),
        officialService.getNetworkHealth(),
        officialService.getInterventions(),
        officialService.getEvidenceCenter(),
      ]);

      setOverview(ov);
      setMapData(mp);
      setAlertsData(al);
      setRankingData(rk);
      setTrendsData(tr);
      setNetworkData(nw);
      setInterventionsData(it);
      setEvidenceData(ev);

      // Default explain stress for first feature
      if (mp.features.length > 0) {
        const exp = await officialService.explainAreaStress(mp.features[0].id);
        setExplainStress(exp);
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

  const handleRankingSortChange = async (newSort: string) => {
    setRankingSort(newSort);
    try {
      const res = await officialService.getRiskRanking(newSort);
      setRankingData(res);
    } catch (e) {
      console.error('Ranking sort error', e);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans p-4 lg:p-6 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-stone-700 bg-stone-850 p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-agri-900/80 text-agri-300 text-xs font-bold border border-agri-700 uppercase tracking-wide">
              Official Decision Support
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-xs font-mono font-semibold border border-stone-700">
              {overview?.user_role || user?.system_role || 'ADMIN'}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-agri-400" />
            {t('JalKrishi Groundwater Command & Decision Center')}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5 flex items-center gap-2">
            <span>{t('Authorized Scope')}:</span>
            <span className="font-semibold text-stone-200">{overview?.assigned_scope || 'Pan-India Network'}</span>
          </p>
        </div>

        {/* Data Honesty Disclosures */}
        <div className="rounded-xl border border-stone-700 bg-stone-950/80 p-3 text-xs space-y-1 max-w-md">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Info className="h-4 w-4 shrink-0" />
            <span>{t('Data Mode & Provenance Disclosure')}</span>
          </div>
          <p className="text-stone-300 text-[11px] leading-relaxed">
            {t('JalKrishi Reference Simulation Dataset & Hydrogeological Model Output. Unconfigured external feeds are reported as NOT_CONFIGURED.')}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto select-none">
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
                  <h2 className="text-lg font-bold text-white">{t('Transparent Groundwater Risk Index Leaderboard')}</h2>
                  <p className="text-xs text-stone-400 mt-0.5">{rankingData.methodology}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{t('Sort By')}:</span>
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
              </div>

              <div className="overflow-x-auto rounded-2xl border border-stone-750 bg-stone-850">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 text-stone-400 font-bold border-b border-stone-750 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">{t('District')}</th>
                      <th className="p-3.5">{t('State')}</th>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-stone-400">{t('Total Telemetry Nodes')}</span>
                  <span className="text-2xl font-extrabold text-white block font-mono">{networkData.total_stations}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-emerald-400">{t('Online Nodes')}</span>
                  <span className="text-2xl font-extrabold text-emerald-400 block font-mono">{networkData.online_stations}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-amber-400">{t('Delayed Telemetry')}</span>
                  <span className="text-2xl font-extrabold text-amber-400 block font-mono">{networkData.delayed_stations}</span>
                </div>
                <div className="p-4 rounded-xl border border-stone-750 bg-stone-850">
                  <span className="text-xs text-rose-400">{t('Offline Nodes')}</span>
                  <span className="text-2xl font-extrabold text-rose-400 block font-mono">{networkData.offline_stations}</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-stone-750 bg-stone-850">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 text-stone-400 font-bold border-b border-stone-750">
                    <tr>
                      <th className="p-3.5">{t('Station ID')}</th>
                      <th className="p-3.5">{t('Station Name')}</th>
                      <th className="p-3.5">{t('District')}</th>
                      <th className="p-3.5">{t('Latest Reading')}</th>
                      <th className="p-3.5">{t('Telemetry Status')}</th>
                      <th className="p-3.5">{t('Quality Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {networkData.stations.slice(0, 15).map((st) => (
                      <tr key={st.station_id} className="hover:bg-stone-800/50">
                        <td className="p-3.5 font-mono font-bold text-agri-400">{st.station_id}</td>
                        <td className="p-3.5 font-semibold text-white">{st.station_name}</td>
                        <td className="p-3.5 text-stone-400">{st.district}</td>
                        <td className="p-3.5 font-mono font-bold">{st.latest_reading} m bgl</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            st.telemetry_status === 'online' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}>
                            {st.telemetry_status}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold uppercase">{st.data_quality_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <option value="None">None</option>
                      <option value="Low">Low (+3% Recharge)</option>
                      <option value="Medium">Medium (+7% Recharge)</option>
                      <option value="High">High (+12% Recharge)</option>
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
                  placeholder="Region A"
                />
                <span className="font-bold text-stone-500">VS</span>
                <input
                  type="text" value={regionB} onChange={(e) => setRegionB(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-100 p-2.5 rounded-xl flex-1"
                  placeholder="Region B"
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
