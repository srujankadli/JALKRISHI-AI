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
  page?: number;
  page_size?: number;
  total_pages?: number;
  total_items?: number;
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
  battery_level?: number;
  sensor_status?: string;
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
  missing_pings_count: number;
  reporting_pct: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  total_items?: number;
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

import { apiClient } from './apiClient';

class OfficialService {
  private getHeaders(): HeadersInit {
    const token = authService.getStoredToken() || 'jalkrishi-default-session-token';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const base = apiClient.getBaseUrl();
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${base}${clean}`;
    if (params) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          search.append(k, v);
        }
      });
      const q = search.toString();
      if (q) url += `?${q}`;
    }
    return url;
  }

  async getOverview(): Promise<OfficialOverviewResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/overview'), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      user_role: 'ADMIN',
      assigned_scope: 'Pan-India National Network (5,260 DWLR Stations)',
      kpis: {
        monitoring_stations: 5260,
        reporting_stations: 4628,
        data_coverage_pct: 88.0,
        critical_stations: 842,
        high_risk_areas: 5,
        declining_zones: 1840,
        improving_zones: 680,
        recharge_opportunity_zones: 1840,
        forecast_stress_areas: 420,
        data_mode: 'DEMO_SIMULATION_FALLBACK',
        disclaimer: 'Local Reference Fallback — Backend Unavailable. JalKrishi Reference Simulation Dataset & Hydrogeological Model Output.',
      },
      recent_anomalies_count: 14,
      high_risk_districts: ['Sangrur', 'Kolar', 'Jodhpur', 'Mehsana', 'Bathinda'],
      disclaimer: 'Local Reference Fallback — Backend Unavailable. JalKrishi Reference Simulation Dataset & Hydrogeological Model Output.',
    };
  }

  async getIntelligenceMap(layer?: string, regionType: string = 'station', targetRegion?: string): Promise<OfficialMapResponse> {
    try {
      const params: Record<string, string> = { region_type: regionType };
      if (layer) params.layer = layer;
      if (targetRegion) params.target_region = targetRegion;

      const res = await fetch(this.buildUrl('/official/map', params), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      user_scope: 'Pan-India National Network (5,260 DWLR Stations)',
      features: [
        {
          id: 'DWLR-PB-001',
          name: 'Sangrur Central Agricultural Zone',
          type: 'station',
          latitude: 30.2450,
          longitude: 75.8420,
          groundwater_level: 28.4,
          groundwater_condition: 'CRITICAL',
          trend: 'FALLING',
          risk_score: 88.0,
          anomaly_status: 'Detected',
          rainfall_signal: 'Normal Rainfall Signal',
          recharge_opportunity: 'High Potential',
          crop_demand_signal: 'High Irrigation Pressure',
          forecast_stress: 'Critical 30-Day Risk',
          confidence: 'HIGH',
          data_source: 'Reference Simulation Telemetry Observation',
        },
        {
          id: 'DWLR-KA-004',
          name: 'Kolar Semi-Arid Zone Monitor',
          type: 'station',
          latitude: 13.1367,
          longitude: 78.1291,
          groundwater_level: 32.5,
          groundwater_condition: 'CRITICAL',
          trend: 'FALLING',
          risk_score: 79.0,
          anomaly_status: 'Detected',
          rainfall_signal: 'Deficit Infiltration Signal',
          recharge_opportunity: 'High Potential',
          crop_demand_signal: 'High Irrigation Pressure',
          forecast_stress: 'Critical 30-Day Risk',
          confidence: 'HIGH',
          data_source: 'Reference Simulation Telemetry Observation',
        },
      ],
      available_layers: [
        'Groundwater Level',
        'Groundwater Stress',
        'Groundwater Trend',
        'Groundwater Anomaly',
        'DWLR Stations',
        'Satellite-Assisted Coverage',
        'Rainfall Signal',
        'Recharge Opportunity',
        'Crop Water Demand',
        'Forecast Stress',
        'Confidence',
        'Data Source / Provenance',
      ],
      data_mode: 'DEMO_SIMULATION',
      disclaimer: 'JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.',
    };
  }

  async explainAreaStress(areaId: string): Promise<ExplainStressResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/explain-stress', { area_id: areaId }), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      area_id: areaId,
      area_name: `${areaId} Monitoring Zone`,
      risk_level: 'CRITICAL',
      risk_score: 85.0,
      primary_contributors: [
        {
          factor: 'Persistent Groundwater Decline & Drawdown',
          weight_pct: 35,
          description: 'Water table depth is 28.4 m bgl with an observed drawdown rate of 0.28 m/month.',
          evidence_type: 'DWLR Telemetry Time-Series',
        },
        {
          factor: 'Aquifer Formation (Deep Unconfined Sand/Gravel)',
          weight_pct: 25,
          description: 'Hydrogeological storage characteristics in local agricultural block.',
          evidence_type: 'CGWB Aquifer Mapping hydro-geological layer',
        },
        {
          factor: 'Soil Infiltration Profile (Alluvial Loam)',
          weight_pct: 25,
          description: 'Local soil permeability profile influences surface percolation dynamics.',
          evidence_type: 'Soil Survey Infiltration Analysis',
        },
      ],
      supporting_evidence: [
        `DWLR Station recorded deep water table level.`,
        'Precipitation signal indicates seasonal moisture accumulation deficit.',
        'Satellite-assisted vegetation moisture deficit models reflect sustained evapotranspiration demand.',
      ],
      confidence: 'HIGH',
      data_mode: 'DEMO_SIMULATION',
      model_interpretation_note: 'Contributing signals and hydro-agronomic evidence interpretation based on available JalKrishi dataset.',
    };
  }

  async getAlerts(): Promise<OfficialAlertsResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/alerts'), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      user_scope: 'Pan-India National Network (5,260 DWLR Stations)',
      total_alerts: 4,
      alerts: [
        {
          alert_id: 'ALT-DWLR-PB-001-100',
          severity: 'CRITICAL',
          location_name: 'Sangrur Central Agricultural Zone',
          district: 'Sangrur',
          state: 'Punjab',
          detected_signal: 'Rapid Groundwater Drawdown',
          evidence: [
            'Groundwater depth reached 28.4 m bgl.',
            'Trend direction is FALLING.',
            'Local precipitation signal indicates deficit moisture accumulation.',
          ],
          trend: 'FALLING',
          confidence: 'HIGH',
          suggested_official_action: 'Review local DWLR monitoring frequency and evaluate artificial recharge pits or crop-diversification advisories.',
          timestamp: new Date().toISOString(),
        },
      ],
      disclaimer: 'JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.',
    };
  }

  async getRiskRanking(
    sortBy: string = 'risk_score',
    level: string = 'district',
    targetRegion?: string,
    page: number = 1,
    pageSize: number = 25,
  ): Promise<RiskRankingResponse> {
    try {
      const params: Record<string, string> = {
        sort_by: sortBy,
        level,
        page: page.toString(),
        page_size: pageSize.toString(),
      };
      if (targetRegion) params.target_region = targetRegion;
      const res = await fetch(this.buildUrl('/official/risk-ranking', params), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      user_scope: 'Pan-India National Network (5,260 DWLR Stations)',
      methodology: 'Composite Risk Index = Groundwater Stress (30%) + Trend (25%) + Infiltration Signal (20%) + Forecast Risk (15%) + Telemetry Anomaly (10%). Transparent methodology based on reference simulation telemetry and model estimates.',
      page,
      page_size: pageSize,
      total_pages: 1,
      total_items: 1,
      rankings: [
        {
          rank: 1,
          region_name: 'Sangrur',
          parent_region: 'Punjab',
          risk_score: 88.5,
          risk_category: 'CRITICAL',
          trend: 'FAST DECLINE',
          components: [
            { name: 'Groundwater Stress', weight_pct: 30, score: 94.0, description: 'Average water table depth ratio' },
            { name: 'Declining Trend', weight_pct: 25, score: 90.0, description: 'Proportion of wells showing falling trajectory' },
            { name: 'Rainfall Signal', weight_pct: 20, score: 85.0, description: 'Seasonal precipitation deficit signal' },
            { name: 'Forecast Risk', weight_pct: 15, score: 88.0, description: '30-day projected drawdown probability' },
            { name: 'Anomaly Frequency', weight_pct: 10, score: 70.0, description: 'Recent telemetry spike or drop occurrences' },
          ],
          confidence: 'HIGH',
          monitoring_gap_score: 20.0,
          recharge_score: 31.5,
        },
      ],
      disclaimer: 'Local Reference Fallback — Backend Unavailable. JalKrishi Reference Simulation Dataset & Hydrogeological Model Output.',
    };
  }

  async getTrendsAnalytics(stationId?: string, rangeDays: number = 30): Promise<any> {
    try {
      const params: Record<string, string> = { range_days: rangeDays.toString() };
      if (stationId) params.station_id = stationId;
      const res = await fetch(this.buildUrl('/official/trends', params), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      station_id: stationId || 'DWLR-PB-001',
      station_name: 'Sangrur Central Agricultural Zone',
      district: 'Sangrur',
      state: 'Punjab',
      current_level: 28.4,
      trend: 'FALLING',
      range_days: rangeDays,
      observed_series: [
        { day: '-30d', value: 26.9, type: 'Reference DWLR Telemetry' },
        { day: '-15d', value: 27.6, type: 'Reference DWLR Telemetry' },
        { day: 'Today', value: 28.4, type: 'Reference DWLR Telemetry' },
      ],
      forecast_series: [
        { day: '+10d', value: 28.7, type: 'Model Forecast' },
        { day: '+20d', value: 29.0, type: 'Model Forecast' },
        { day: '+30d', value: 29.3, type: 'Model Forecast' },
      ],
      demarcation_note: 'Reference simulation telemetry vs Model Forecast trajectory are visually separated.',
      data_mode: 'DEMO_SIMULATION',
      disclaimer: 'Local Reference Fallback — Backend Unavailable. JalKrishi Reference Simulation Dataset & Hydrogeological Model Output.',
    };
  }

  async getNetworkHealth(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    state?: string;
    district?: string;
    block?: string;
    risk?: string;
    telemetry_status?: string;
    sensor_status?: string;
  }): Promise<NetworkHealthResponse> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.page) queryParams.page = params.page.toString();
      if (params?.page_size) queryParams.page_size = params.page_size.toString();
      if (params?.search) queryParams.search = params.search;
      if (params?.state) queryParams.state = params.state;
      if (params?.district) queryParams.district = params.district;
      if (params?.block) queryParams.block = params.block;
      if (params?.risk) queryParams.risk = params.risk;
      if (params?.telemetry_status) queryParams.telemetry_status = params.telemetry_status;
      if (params?.sensor_status) queryParams.sensor_status = params.sensor_status;

      const res = await fetch(this.buildUrl('/official/network', queryParams), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      user_scope: 'Local Offline Reference Mode (1 Sample Station)',
      total_stations: 1,
      online_stations: 1,
      delayed_stations: 0,
      offline_stations: 0,
      missing_pings_count: 0,
      reporting_pct: 100.0,
      page: params?.page || 1,
      page_size: params?.page_size || 25,
      total_pages: 1,
      total_items: 1,
      stations: [
        {
          station_id: 'DWLR-PB-001',
          station_name: 'Sangrur Central Agricultural Zone',
          district: 'Sangrur',
          state: 'Punjab',
          latest_reading: 28.4,
          unit: 'm bgl',
          timestamp: new Date().toISOString(),
          telemetry_status: 'online',
          data_quality_status: 'critical',
          battery_level: 94,
          sensor_status: 'CALIBRATED',
          trend: 'FALLING',
          risk_score: 88.0,
          data_source: 'DWLR Reference Simulation Telemetry',
        },
      ],
      disclaimer: 'Local Reference Fallback — Complete station network unavailable (Backend connection offline).',
    };
  }

  async getInterventions(): Promise<InterventionsResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/interventions'), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      user_scope: 'Pan-India National Network (5,260 DWLR Stations)',
      total_opportunities: 1,
      opportunities: [
        {
          id: 'INT-DWLR-PB-001',
          area_name: 'Sangrur Central Agricultural Zone',
          district: 'Sangrur',
          state: 'Punjab',
          category: 'Recharge Opportunity',
          groundwater_condition: 'CRITICAL',
          rainfall_signal: 'Normal Rainfall Signal',
          recharge_signal: 'Moderate Infiltration',
          trend: 'FALLING',
          risk_level: 'CRITICAL',
          confidence: 'HIGH',
          potential_intervention: 'Evaluate suitability for rooftop rainwater injection pit or check dam structure.',
          disclaimer: 'Decision-support recommendation; local hydrogeological feasibility assessment recommended.',
        },
      ],
      disclaimer: 'JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.',
    };
  }

  async simulateScenario(req: ScenarioSimulationRequest): Promise<ScenarioSimulationResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/scenario'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(req),
      });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      target_region: req.target_region || 'Pan-India Scope',
      inputs: {
        rainfall_pct_change: req.rainfall_pct_change,
        crop_demand_pct_change: req.crop_demand_pct_change,
        recharge_intervention_level: req.recharge_intervention_level,
      },
      simulated_stress_score: 72.5,
      baseline_stress_score: 68.0,
      delta_pct: 4.5,
      simulated_forecast_trajectory: [
        { days_ahead: 30, simulated_depth_mbgl: 22.5, baseline_depth_mbgl: 21.0 },
        { days_ahead: 60, simulated_depth_mbgl: 23.2, baseline_depth_mbgl: 21.5 },
        { days_ahead: 90, simulated_depth_mbgl: 24.0, baseline_depth_mbgl: 22.0 },
      ],
      recharge_opportunity_impact: 'Baseline Opportunity',
      water_pressure_category: 'Elevated Depletion Risk',
      disclaimer: 'Scenario Simulation — Illustrative model output; not an operational forecast or government guarantee.',
    };
  }

  async queryAIAnalyst(query: string, targetRegion?: string): Promise<OfficialAnalystResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/analyst'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query, target_region: targetRegion }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      query: query,
      answer: `Based on active JalKrishi telemetry dataset (5,260 DWLR wells), groundwater risk is highest in Sangrur, Kolar, and Jodhpur due to persistent depletion rates.`,
      evidence: [
        'Groundwater table depth in Kolar averages > 22.5 m bgl.',
        'Telemetry time-series confirms falling trend over consecutive observation cycles.',
      ],
      confidence: 'HIGH',
      data_source: 'JalKrishi Official Intelligence Infrastructure',
      data_mode: 'DEMO_SIMULATION',
      relevant_region: targetRegion || 'Pan-India Scope',
      disclaimer: 'JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.',
    };
  }

  async getEvidenceCenter(): Promise<EvidenceCenterResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/evidence'), { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      active_data_mode: 'DEMO_SIMULATION',
      providers: [
        {
          provider_name: 'JalKrishi Reference Simulation Dataset',
          status: 'ACTIVE_SIMULATION',
          description: 'Primary hydrogeological simulation network (5,260 DWLR wells, 30-day AI forecasts, anomaly detection).',
          last_check: new Date().toISOString(),
          data_mode: 'DEMO_SIMULATION',
        },
        {
          provider_name: 'Government Central Ground Water Board (CGWB) API',
          status: 'NOT_CONFIGURED',
          description: 'Direct live integration with official CGWB DWLR telemetry API.',
          last_check: new Date().toISOString(),
          data_mode: 'GOVERNMENT_API',
        },
        {
          provider_name: 'India Meteorological Department (IMD) Weather Feed',
          status: 'NOT_CONFIGURED',
          description: 'Live gridded rainfall and meteorological observation feed.',
          last_check: new Date().toISOString(),
          data_mode: 'GOVERNMENT_API',
        },
        {
          provider_name: 'NASA GRACE Gravity Recovery Satellite Feed',
          status: 'NOT_CONFIGURED',
          description: 'Remote-sensing terrestrial water storage anomaly satellite telemetry.',
          last_check: new Date().toISOString(),
          data_mode: 'SATELLITE_REMOTE_SENSING',
        },
        {
          provider_name: 'Copernicus Sentinel-1 / InSAR Subsidence Feed',
          status: 'NOT_CONFIGURED',
          description: 'Synthetic Aperture Radar aquifer deformation and land subsidence tracking.',
          last_check: new Date().toISOString(),
          data_mode: 'SATELLITE_REMOTE_SENSING',
        },
      ],
      disclaimer: 'JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.',
    };
  }

  async compareRegions(regionA: string, regionB: string): Promise<RegionComparisonResponse> {
    try {
      const res = await fetch(this.buildUrl('/official/compare'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ region_a: regionA, region_b: regionB }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Network fallback
    }

    return {
      timestamp: new Date().toISOString(),
      region_a: { name: regionA, station_count: 42, avg_groundwater_depth_mbgl: 28.4, risk_score: 88.5 },
      region_b: { name: regionB, station_count: 38, avg_groundwater_depth_mbgl: 32.5, risk_score: 79.0 },
      comparative_interpretation: `${regionA} currently exhibits higher overall groundwater stress than ${regionB}, driven primarily by deeper average water tables.`,
      confidence: 'HIGH',
      disclaimer: 'JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.',
    };
  }
}

export const officialService = new OfficialService();
