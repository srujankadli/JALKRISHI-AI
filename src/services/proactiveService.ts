import { apiClient } from './apiClient';

export type ProactiveRiskState =
  | 'STABLE'
  | 'EMERGING_RISK'
  | 'ESCALATING_RISK'
  | 'CRITICAL_RISK'
  | 'RECOVERY_SIGNAL'
  | 'DATA_QUALITY_WARNING';

export type ProactiveLifecycleStatus =
  | 'NEW'
  | 'ACTIVE'
  | 'ESCALATING'
  | 'RECOVERING'
  | 'RESOLVED';

export type TargetAudience = 'FARMER' | 'OFFICIAL' | 'HYDROLOGIST' | 'PUBLIC';

export interface EvidenceSignal {
  signal_type: string;
  label: string;
  value: string;
  direction: 'RISING' | 'STABLE' | 'DECLINING' | 'NEUTRAL';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  evidence_source: string;
  provenance: string;
  evaluation_period: string;
  timestamp: string;
}

export interface AudienceAction {
  audience: TargetAudience;
  action_title: string;
  action_summary: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'MODERATE' | 'ADVISORY';
  recommended_timeframe: string;
  steps: string[];
}

export interface Explainability {
  what_changed: string;
  why_it_matters: string;
  evidence_summary: string;
  confidence_rating: 'LOW' | 'MODERATE' | 'HIGH';
  confidence_rationale: string;
  what_to_do: string;
  technical_evidence: Record<string, any>;
  signals: EvidenceSignal[];
}

export interface ProactiveAlert {
  alert_id: string;
  station_id: string;
  station_name: string;
  state: string;
  district: string;
  block?: string;
  latitude: number;
  longitude: number;
  risk_state: ProactiveRiskState;
  lifecycle_status: ProactiveLifecycleStatus;
  priority_score: number;
  detected_at: string;
  last_updated_at: string;
  signals_count: number;
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  provenance: string;
  explainability: Explainability;
  target_audiences: TargetAudience[];
  audience_actions: AudienceAction[];
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface ProactiveOverview {
  total_monitored_stations: number;
  active_alerts_count: number;
  risk_state_distribution: Record<string, number>;
  lifecycle_distribution: Record<string, number>;
  top_critical_alerts: ProactiveAlert[];
  state_summaries: Array<{
    state: string;
    total_monitored: number;
    active_alerts: number;
    critical_alerts: number;
    escalating_alerts: number;
    emerging_alerts: number;
    recovery_alerts: number;
    dominant_risk_state: ProactiveRiskState;
    avg_priority_score: number;
  }>;
  data_mode: string;
  provenance_disclosure: string;
  evaluated_at: string;
}

export interface ProactiveRegionSummary {
  region_name: string;
  region_type: 'district' | 'state';
  parent_state?: string;
  total_stations: number;
  active_alerts: number;
  dominant_risk_state: ProactiveRiskState;
  critical_count: number;
  escalating_count: number;
  emerging_count: number;
  recovery_count: number;
  data_quality_warnings: number;
  average_priority_score: number;
  priority_tier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  recommended_administrative_action: string;
}

export interface ProactiveFilterParams {
  state?: string;
  district?: string;
  risk_state?: ProactiveRiskState;
  lifecycle_status?: ProactiveLifecycleStatus;
  audience?: TargetAudience;
  min_priority?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FarmerProactiveStatus {
  location: string;
  status: ProactiveRiskState | 'UNRESOLVED' | 'LOCATION_REQUIRED' | 'UNSUPPORTED';
  has_warning: boolean;
  risk_state: ProactiveRiskState | 'UNRESOLVED' | 'LOCATION_REQUIRED' | 'UNSUPPORTED';
  station_id?: string;
  station_name?: string;
  summary: string;
  what_changed: string;
  why_it_matters?: string;
  recommended_action: string;
  what_to_do: string;
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  provenance: string;
}

class ProactiveService {
  public async getOverview(): Promise<ProactiveOverview> {
    try {
      return await apiClient.get<ProactiveOverview>('/proactive/overview', {
        useCache: true,
        cacheTtlMs: 30000,
      });
    } catch (err) {
      console.warn('Falling back to simulated proactive overview:', err);
      return this.getFallbackOverview();
    }
  }

  public async getAlerts(params: ProactiveFilterParams = {}): Promise<ProactiveAlert[]> {
    try {
      const query = new URLSearchParams();
      if (params.state) query.set('state', params.state);
      if (params.district) query.set('district', params.district);
      if (params.risk_state) query.set('risk_state', params.risk_state);
      if (params.lifecycle_status) query.set('lifecycle_status', params.lifecycle_status);
      if (params.audience) query.set('audience', params.audience);
      if (params.min_priority !== undefined) query.set('min_priority', String(params.min_priority));
      if (params.search) query.set('search', params.search);
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      if (params.offset !== undefined) query.set('offset', String(params.offset));

      const qs = query.toString();
      const path = `/proactive/alerts${qs ? `?${qs}` : ''}`;
      return await apiClient.get<ProactiveAlert[]>(path, {
        useCache: true,
        cacheTtlMs: 20000,
      });
    } catch (err) {
      console.warn('Falling back to empty proactive alerts list:', err);
      return [];
    }
  }

  public async getRegions(regionType: 'district' | 'state' = 'district', state?: string): Promise<ProactiveRegionSummary[]> {
    try {
      const query = new URLSearchParams();
      query.set('region_type', regionType);
      if (state) query.set('state', state);

      const res = await apiClient.get<{ summaries: ProactiveRegionSummary[] }>(`/proactive/regions?${query.toString()}`, {
        useCache: true,
        cacheTtlMs: 30000,
      });
      return res.summaries || [];
    } catch (err) {
      console.warn('Falling back to local regional summaries:', err);
      return [];
    }
  }

  public async evaluateStation(stationId: string): Promise<ProactiveAlert | null> {
    try {
      return await apiClient.get<ProactiveAlert>(`/proactive/stations/${stationId}`, {
        useCache: false,
      });
    } catch (err) {
      console.warn(`Failed evaluating proactive station ${stationId}:`, err);
      return null;
    }
  }

  public async getLocationStatus(
    location?: string,
    lat?: number,
    lon?: number,
    stationId?: string
  ): Promise<FarmerProactiveStatus | null> {
    try {
      const params: Record<string, any> = {};
      if (location && location.trim()) params.location = location.trim();
      if (lat !== undefined && lat !== null) params.latitude = lat;
      if (lon !== undefined && lon !== null) params.longitude = lon;
      if (stationId && stationId.trim()) params.station_id = stationId.trim();

      return await apiClient.get<FarmerProactiveStatus>('/proactive/overview', params, {
        useCache: true,
        cacheTtlMs: 15000,
        timeoutMs: 6000,
      });
    } catch (err) {
      console.warn('Failed getting location proactive status:', err);
      return null;
    }
  }

  private getFallbackOverview(): ProactiveOverview {
    return {
      total_monitored_stations: 5260,
      active_alerts_count: 342,
      risk_state_distribution: {
        STABLE: 4210,
        EMERGING_RISK: 412,
        ESCALATING_RISK: 395,
        CRITICAL_RISK: 158,
        RECOVERY_SIGNAL: 62,
        DATA_QUALITY_WARNING: 23,
      },
      lifecycle_distribution: {
        NEW: 85,
        ACTIVE: 610,
        ESCALATING: 215,
        RECOVERING: 58,
        RESOLVED: 82,
      },
      top_critical_alerts: [],
      state_summaries: [],
      data_mode: 'DEMO_SIMULATION',
      provenance_disclosure: 'JalKrishi Reference Simulation Dataset',
      evaluated_at: new Date().toISOString(),
    };
  }
}

export const proactiveService = new ProactiveService();
