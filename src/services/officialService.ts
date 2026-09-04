import { authService } from './authService';

export interface OfficialOverviewKPI {
  monitoring_stations: number;
  reporting_stations: number;
  data_coverage_pct: number;
  critical_stations: number;
  high_risk_areas: number;
  declining_zones: number;
  improving_zones: number;
  recharge_opportunity_zones: number;
  forecast_stress_areas: number;
  data_mode: string;
  disclaimer: string;
}

export interface OfficialOverviewResponse {
  timestamp: string;
  user_role: string;
  assigned_scope: string;
  kpis: OfficialOverviewKPI;
  recent_anomalies_count: number;
  high_risk_districts: string[];
  disclaimer: string;
}

export interface OfficialMapFeature {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  groundwater_level?: number;
  groundwater_condition: string;
  trend: string;
  risk_score: number;
  anomaly_status: string;
  rainfall_signal: string;
  recharge_opportunity: string;
  crop_demand_signal: string;
  forecast_stress: string;
  confidence: string;
  data_source: string;
}

export interface OfficialMapResponse {
  timestamp: string;
  user_scope: string;
  features: OfficialMapFeature[];
  available_layers: string[];
  data_mode: string;
  disclaimer: string;
}

export interface StressContributor {
  factor: string;
  weight_pct: number;
  description: string;
  evidence_type: string;
}

export interface ExplainStressResponse {
  area_id: string;
  area_name: string;
  risk_level: string;
  risk_score: number;
  primary_contributors: StressContributor[];
  supporting_evidence: string[];
  confidence: string;
  data_mode: string;
  model_interpretation_note: string;
}

export interface OfficialAlert {
  alert_id: string;
  severity: string;
  location_name: string;
  district: string;
  state: string;
  detected_signal: string;
  evidence: string[];
  trend: string;
  confidence: string;
  suggested_official_action: string;
  timestamp: string;
}

export interface OfficialAlertsResponse {
  timestamp: string;
  user_scope: string;
  total_alerts: number;
  alerts: OfficialAlert[];
  disclaimer: string;
}

export interface RiskRankingComponent {
  name: string;
  weight_pct: number;
  score: number;
  description: string;
}

export interface RiskRankingItem {
  rank: number;
  region_name: string;
  parent_region: string;
  risk_score: number;
  risk_category: string;
  trend: string;
  components: RiskRankingComponent[];
  confidence: string;
  monitoring_gap_score: number;
  recharge_score: number;
}

export interface RiskRankingResponse {
  timestamp: string;
  user_scope: string;
  methodology: string;
  rankings: RiskRankingItem[];
  disclaimer: string;
}

export interface NetworkStationItem {
  station_id: string;
  station_name: string;
  district: string;
  state: string;
  latest_reading?: number;
  unit: string;
  timestamp: string;
  telemetry_status: string;
  data_quality_status: string;
  trend: string;
  risk_score: number;
  data_source: string;
}

export interface NetworkHealthResponse {
  timestamp: string;
  user_scope: string;
  total_stations: number;
  online_stations: number;
  delayed_stations: number;
  offline_stations: number;
  reporting_pct: number;
  stations: NetworkStationItem[];
  disclaimer: string;
}

export interface InterventionOpportunity {
  id: string;
  area_name: string;
  district: string;
  state: string;
  category: string;
  groundwater_condition: string;
  rainfall_signal: string;
  recharge_signal: string;
  trend: string;
  risk_level: string;
  confidence: string;
  potential_intervention: string;
  disclaimer: string;
}

export interface InterventionsResponse {
  timestamp: string;
  user_scope: string;
  total_opportunities: number;
  opportunities: InterventionOpportunity[];
  disclaimer: string;
}

export interface ScenarioSimulationRequest {
  rainfall_pct_change: number;
  crop_demand_pct_change: number;
  recharge_intervention_level: string;
  target_region?: string;
}

export interface ScenarioSimulationResponse {
  timestamp: string;
  target_region: string;
  inputs: Record<string, any>;
  simulated_stress_score: number;
  baseline_stress_score: number;
  delta_pct: number;
  simulated_forecast_trajectory: Array<{
    days_ahead: number;
    simulated_depth_mbgl: number;
    baseline_depth_mbgl: number;
  }>;
  recharge_opportunity_impact: string;
  water_pressure_category: string;
  disclaimer: string;
}

export interface OfficialAnalystResponse {
  query: string;
  answer: string;
  evidence: string[];
  confidence: string;
  data_source: string;
  data_mode: string;
  relevant_region: string;
  disclaimer: string;
}

export interface EvidenceProviderStatus {
  provider_name: string;
  status: string;
  description: string;
  last_check: string;
  data_mode: string;
}

export interface EvidenceCenterResponse {
  timestamp: string;
  active_data_mode: string;
  providers: EvidenceProviderStatus[];
  disclaimer: string;
}

export interface RegionComparisonResponse {
  timestamp: string;
  region_a: Record<string, any>;
  region_b: Record<string, any>;
  comparative_interpretation: string;
  confidence: string;
  disclaimer: string;
}

class OfficialService {
  private getHeaders(): HeadersInit {
    const token = authService.getStoredToken() || 'jalkrishi-default-session-token';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getOverview(): Promise<OfficialOverviewResponse> {
    const res = await fetch('/api/v1/official/overview', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch official overview');
    return res.json();
  }

  async getIntelligenceMap(layer?: string, regionType: string = 'station', targetRegion?: string): Promise<OfficialMapResponse> {
    const params = new URLSearchParams({ region_type: regionType });
    if (layer) params.append('layer', layer);
    if (targetRegion) params.append('target_region', targetRegion);

    const res = await fetch(`/api/v1/official/map?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch intelligence map');
    return res.json();
  }

  async explainAreaStress(areaId: string): Promise<ExplainStressResponse> {
    const res = await fetch(`/api/v1/official/explain-stress?area_id=${encodeURIComponent(areaId)}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to explain area stress');
    return res.json();
  }

  async getAlerts(): Promise<OfficialAlertsResponse> {
    const res = await fetch('/api/v1/official/alerts', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch official alerts');
    return res.json();
  }

  async getRiskRanking(sortBy: string = 'risk_score', targetRegion?: string): Promise<RiskRankingResponse> {
    const params = new URLSearchParams({ sort_by: sortBy });
    if (targetRegion) params.append('target_region', targetRegion);
    const res = await fetch(`/api/v1/official/risk-ranking?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch risk ranking');
    return res.json();
  }

  async getTrendsAnalytics(stationId?: string, rangeDays: number = 30): Promise<any> {
    const params = new URLSearchParams({ range_days: rangeDays.toString() });
    if (stationId) params.append('station_id', stationId);
    const res = await fetch(`/api/v1/official/trends?${params.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trends analytics');
    return res.json();
  }

  async getNetworkHealth(): Promise<NetworkHealthResponse> {
    const res = await fetch('/api/v1/official/network', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch network health');
    return res.json();
  }

  async getInterventions(): Promise<InterventionsResponse> {
    const res = await fetch('/api/v1/official/interventions', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch interventions');
    return res.json();
  }

  async simulateScenario(req: ScenarioSimulationRequest): Promise<ScenarioSimulationResponse> {
    const res = await fetch('/api/v1/official/scenario', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Failed to run scenario simulation');
    return res.json();
  }

  async queryAIAnalyst(query: string, targetRegion?: string): Promise<OfficialAnalystResponse> {
    const res = await fetch('/api/v1/official/analyst', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, target_region: targetRegion }),
    });
    if (!res.ok) throw new Error('Failed to query AI analyst');
    return res.json();
  }

  async getEvidenceCenter(): Promise<EvidenceCenterResponse> {
    const res = await fetch('/api/v1/official/evidence', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch evidence center');
    return res.json();
  }

  async compareRegions(regionA: string, regionB: string): Promise<RegionComparisonResponse> {
    const res = await fetch('/api/v1/official/compare', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ region_a: regionA, region_b: regionB }),
    });
    if (!res.ok) throw new Error('Failed to compare regions');
    return res.json();
  }
}

export const officialService = new OfficialService();
