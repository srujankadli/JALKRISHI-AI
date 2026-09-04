import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { proactiveService } from '../../services/proactiveService';
import type { 
  ProactiveAlert, 
  ProactiveOverview, 
  ProactiveRiskState, 
  ProactiveLifecycleStatus,
  TargetAudience 
} from '../../services/proactiveService';

export const ProactiveIntelligenceSection: React.FC = () => {
  const { t } = useLanguage();
  const [overview, setOverview] = useState<ProactiveOverview | null>(null);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedRiskState, setSelectedRiskState] = useState<string>('all');
  const [selectedLifecycle] = useState<string>('all');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, 'farmer' | 'official' | 'hydrologist'>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, alertsRes] = await Promise.all([
        proactiveService.getOverview(),
        proactiveService.getAlerts({
          risk_state: selectedRiskState !== 'all' ? (selectedRiskState as ProactiveRiskState) : undefined,
          lifecycle_status: selectedLifecycle !== 'all' ? (selectedLifecycle as ProactiveLifecycleStatus) : undefined,
          audience: selectedAudience !== 'all' ? (selectedAudience as TargetAudience) : undefined,
          search: searchQuery || undefined,
          limit: 100,
        }),
      ]);
      setOverview(ovRes);
      setAlerts(alertsRes);
    } catch (err) {
      console.warn('Failed loading proactive intelligence section data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRiskState, selectedLifecycle, selectedAudience]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRiskBadge = (risk: ProactiveRiskState) => {
    switch (risk) {
      case 'CRITICAL_RISK':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
          dot: 'bg-red-500',
          label: t('proactive_risk_critical', 'Critical Risk'),
        };
      case 'ESCALATING_RISK':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
          dot: 'bg-orange-500',
          label: t('proactive_risk_escalating', 'Escalating Risk'),
        };
      case 'EMERGING_RISK':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          dot: 'bg-amber-500',
          label: t('proactive_risk_emerging', 'Emerging Risk'),
        };
      case 'RECOVERY_SIGNAL':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          dot: 'bg-emerald-500',
          label: t('proactive_risk_recovery', 'Recovery Signal'),
        };
      case 'DATA_QUALITY_WARNING':
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400',
          dot: 'bg-slate-500',
          label: t('proactive_risk_data_quality', 'Data Quality Warning'),
        };
      case 'STABLE':
      default:
        return {
          bg: 'bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400',
          dot: 'bg-teal-500',
          label: t('proactive_risk_stable', 'Stable'),
        };
    }
  };

  const getLifecycleBadge = (status: ProactiveLifecycleStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'ACTIVE':
        return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'ESCALATING':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'RECOVERING':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'RESOLVED':
        return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
    }
  };

  const totalMonitored = overview?.total_monitored_stations || 5260;
  const criticalCount = overview?.risk_state_distribution?.CRITICAL_RISK || 0;
  const escalatingCount = overview?.risk_state_distribution?.ESCALATING_RISK || 0;
  const emergingCount = overview?.risk_state_distribution?.EMERGING_RISK || 0;
  const recoveryCount = overview?.risk_state_distribution?.RECOVERY_SIGNAL || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold">
                {t('proactive_engine_title', 'Proactive Groundwater Intelligence & Early Warning Engine')}
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-3xl">
              {t('proactive_engine_desc', 'Autonomous multi-signal fusion across DWLR trends, 30–90 day forecasts, statistical anomalies, and thermal remote sensing. Triages risks before severe depletion occurs.')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t('refresh_intelligence', 'Refresh Network')}</span>
            </button>
          </div>
        </div>

        {/* Provenance note */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            {t('proactive_provenance_disclaimer', 'Operating in Reference Simulation Mode: Multi-signal models synthesized from CGWB DWLR reference topologies & satellite indicators.')}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('kpi_monitored_stations', 'Monitored Wells')}</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {totalMonitored.toLocaleString()}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
            100% Pan-India Active
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-red-200 dark:border-red-900/40 shadow-sm">
          <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 mb-1">
            <span>{t('kpi_critical_risks', 'Critical Alerts')}</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {criticalCount}
          </div>
          <div className="text-[11px] text-red-500 mt-1 font-medium">
            Immediate Attention
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-orange-200 dark:border-orange-900/40 shadow-sm">
          <div className="flex items-center justify-between text-xs text-orange-600 dark:text-orange-400 mb-1">
            <span>{t('kpi_escalating_risks', 'Escalating Risks')}</span>
            <TrendingDown className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {escalatingCount}
          </div>
          <div className="text-[11px] text-orange-500 mt-1 font-medium">
            Accelerating Depletion
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/40 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1">
            <span>{t('kpi_emerging_signals', 'Emerging Signals')}</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {emergingCount}
          </div>
          <div className="text-[11px] text-amber-500 mt-1 font-medium">
            Early Stage Monitoring
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-1">
            <span>{t('kpi_recovery_signals', 'Recharge Signals')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {recoveryCount}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Recharge Active
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('proactive_filters_heading', 'Risk State & Action Tiers')}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                placeholder={t('search_stations_placeholder', 'Search station, district, state...')}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mr-2">
            <span>{t('filter_risk_state', 'Risk State:')}</span>
          </div>
          {[
            { id: 'all', label: t('all_label', 'All States') },
            { id: 'CRITICAL_RISK', label: t('critical_label', 'Critical Risk') },
            { id: 'ESCALATING_RISK', label: t('escalating_label', 'Escalating') },
            { id: 'EMERGING_RISK', label: t('emerging_label', 'Emerging') },
            { id: 'RECOVERY_SIGNAL', label: t('recovery_label', 'Recovery') },
            { id: 'DATA_QUALITY_WARNING', label: t('data_quality_label', 'Data Quality') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedRiskState(item.id)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedRiskState === item.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mr-2">
            <span>{t('filter_audience', 'Audience:')}</span>
          </div>
          {[
            { id: 'all', label: t('all_audiences', 'All') },
            { id: 'FARMER', label: t('farmer_audience', 'Farmer') },
            { id: 'OFFICIAL', label: t('official_audience', 'Official') },
            { id: 'HYDROLOGIST', label: t('hydrologist_audience', 'Hydrologist') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedAudience(item.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedAudience === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('evaluating_proactive_intelligence', 'Evaluating multi-signal proactive intelligence across DWLR network...')}
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t('no_proactive_alerts_found', 'No Active Proactive Alerts Match Filter')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t('no_proactive_alerts_desc', 'All monitored observation stations within the selected criteria are currently in stable equilibrium or outside the risk filter threshold.')}
            </p>
          </div>
        ) : (
          alerts.map((al) => {
            const riskBadge = getRiskBadge(al.risk_state);
            const isExpanded = expandedAlertId === al.alert_id;
            const currentTab = activeTabMap[al.alert_id] || 'official';

            const farmerAction = al.audience_actions.find((a) => a.audience === 'FARMER');
            const officialAction = al.audience_actions.find((a) => a.audience === 'OFFICIAL');
            const hydrologistAction = al.audience_actions.find((a) => a.audience === 'HYDROLOGIST');

            return (
              <div
                key={al.alert_id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden transition-all hover:border-teal-500/40"
              >
                {/* Alert Top Bar */}
                <div
                  onClick={() => setExpandedAlertId(isExpanded ? null : al.alert_id)}
                  className="p-4 cursor-pointer flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${riskBadge.dot} shrink-0 animate-pulse`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {al.station_name} ({al.station_id})
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBadge.bg}`}>
                          {riskBadge.label}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getLifecycleBadge(al.lifecycle_status)}`}>
                          {al.lifecycle_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {al.district}, {al.state} {al.block ? `• Block: ${al.block}` : ''} • Priority Score: <strong className="text-slate-700 dark:text-slate-200">{al.priority_score.toFixed(1)}/100</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {al.signals_count} Contributory Signals
                      </div>
                      <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                        Confidence: {al.confidence}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Primary Summary Snippet */}
                <div className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50 flex items-start gap-2">
                    <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200 mr-1">
                        {al.explainability.what_changed}
                      </strong>
                      <span className="text-slate-600 dark:text-slate-400">
                        {al.explainability.why_it_matters}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                    {/* Signals Grid */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-teal-500" />
                        <span>Contributory Multi-Signal Evidence ({al.explainability.signals.length} Signals)</span>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {al.explainability.signals.map((sig, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {sig.label}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                sig.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-600' :
                                sig.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-600' :
                                'bg-amber-500/10 text-amber-600'
                              }`}>
                                {sig.severity}
                              </span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 font-medium">
                              {sig.value}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800">
                              <span>{sig.evidence_source}</span>
                              <span>{sig.direction}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Targeted Audience Recommendations */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Targeted Decision Support & Prescribed Actions</span>
                        </h5>

                        {/* Audience Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs">
                          {farmerAction && (
                            <button
                              onClick={() => setActiveTabMap({ ...activeTabMap, [al.alert_id]: 'farmer' })}
                              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                currentTab === 'farmer'
                                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Farmer Action
                            </button>
                          )}
                          {officialAction && (
                            <button
                              onClick={() => setActiveTabMap({ ...activeTabMap, [al.alert_id]: 'official' })}
                              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                currentTab === 'official'
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Official Notice
                            </button>
                          )}
                          {hydrologistAction && (
                            <button
                              onClick={() => setActiveTabMap({ ...activeTabMap, [al.alert_id]: 'hydrologist' })}
                              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                currentTab === 'hydrologist'
                                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Hydrologist Protocol
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Active Action Display */}
                      {currentTab === 'farmer' && farmerAction && (
                        <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-teal-900 dark:text-teal-200 text-sm">
                              {farmerAction.action_title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-200/50 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                              Timeframe: {farmerAction.recommended_timeframe}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">
                            {farmerAction.action_summary}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pt-1">
                            {farmerAction.steps.map((st, sIdx) => (
                              <li key={sIdx}>{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentTab === 'official' && officialAction && (
                        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                              {officialAction.action_title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-200/50 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                              Priority: {officialAction.priority} • {officialAction.recommended_timeframe}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">
                            {officialAction.action_summary}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pt-1">
                            {officialAction.steps.map((st, sIdx) => (
                              <li key={sIdx}>{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentTab === 'hydrologist' && hydrologistAction && (
                        <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-900 dark:text-purple-200 text-sm">
                              {hydrologistAction.action_title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-200/50 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                              Timeframe: {hydrologistAction.recommended_timeframe}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">
                            {hydrologistAction.action_summary}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pt-1">
                            {hydrologistAction.steps.map((st, sIdx) => (
                              <li key={sIdx}>{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
