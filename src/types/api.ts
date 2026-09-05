export interface ApiHealthResponse {
  status: string;
  app_name: string;
  version: string;
  data_mode: string;
  timestamp: string;
  disclaimer: string;
}

export interface ApiStationSummaryResponse {
  totalStations: number;
  healthyCount: number;
  moderateCount: number;
  warningCount: number;
  criticalCount: number;
  avgDepthMbgl: number;
  avgRiskScore: number;
  statesCount: number;
  telemetryHealth: {
    online: number;
    delayed: number;
    offline: number;
    onlinePercentage: number;
  };
  data_mode: string;
  disclaimer: string;
}

export interface ApiStationListResponse {
  stations: any[];
  total: number;
  limit: number;
  offset: number;
  filters_applied: Record<string, any>;
  data_mode: string;
  disclaimer: string;
}

export interface ApiAnalyticsSummaryResponse {
  total_stations: number;
  healthy_stations: number;
  moderate_stations: number;
  warning_stations: number;
  critical_stations: number;
  healthy_percentage: number;
  moderate_percentage: number;
  warning_percentage: number;
  critical_percentage: number;
  average_groundwater_depth: number;
  average_risk_score: number;
  falling_trend_count: number;
  stable_trend_count: number;
  rising_trend_count: number;
  telemetry_health: Record<string, any>;
  data_mode: string;
  disclaimer: string;
}

export interface ApiStateAnalyticsRow {
  state: string;
  station_count: number;
  average_depth: number;
  average_risk_score: number;
  healthy_count: number;
  moderate_count: number;
  warning_count: number;
  critical_count: number;
  healthy_percentage: number;
  warning_percentage: number;
  critical_percentage: number;
  rising_count: number;
  stable_count: number;
  falling_count: number;
  dominant_trend: string;
  risk_category: string;
  priority: string;
}

export interface ApiDistrictAnalyticsRow {
  state: string;
  district: string;
  station_count: number;
  average_depth: number;
  average_risk_score: number;
  healthy_count: number;
  moderate_count: number;
  warning_count: number;
  critical_count: number;
  critical_percentage: number;
  warning_percentage: number;
  dominant_trend: string;
  falling_percentage: number;
  risk_category: string;
  days_to_critical_summary: Record<string, any>;
}

export interface ApiForecastPoint {
  date: string;
  predicted_depth: number;
  baseline_depth: number;
  lower_bound: number;
  upper_bound: number;
  day_offset: number;
  expected_rainfall_mm: number;
  change_label?: string;
}

export interface ApiStationForecastResponse {
  station_id: string;
  station_name: string;
  station_code?: string;
  state: string;
  district: string;
  block?: string;
  latitude?: number;
  longitude?: number;
  soil_type?: string;
  aquifer_type?: string;
  current_depth: number;
  critical_threshold: number;
  current_status: string;
  current_trend: string;
  risk_score: number;
  horizon_days: number;
  historical_points_used: number;
  daily_change_m: number;
  monthly_change_m: number;
  forecast_points: ApiForecastPoint[];
  confidence: number;
  days_to_critical: number | null;
  days_to_critical_status: string;
  days_to_critical_urgency: string;
  forecast_risk: string;
  farmer_guidance: string;
  projected_depth_30d?: number;
  projected_depth_60d?: number;
  projected_depth_90d?: number;
  projected_depth_end?: number;
  methodology: string;
  data_mode: string;
  disclaimer: string;
}

export interface ApiLocationForecastResponse {
  location_name: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  evidence_mode: 'DIRECT_DWLR' | 'REGIONAL_NEARBY_EVIDENCE' | 'SATELLITE_ASSISTED' | 'LOCATION_REQUIRED' | 'UNRESOLVED';
  nearest_station_id?: string;
  nearest_station_name?: string;
  nearest_station_distance_km?: number;
  current_depth?: number;
  critical_threshold: number;
  projected_depth_30d?: number;
  projected_depth_end?: number;
  days_to_critical: number | null;
  days_to_critical_status: string;
  days_to_critical_urgency: string;
  forecast_risk: string;
  horizon_days: number;
  daily_change_m: number;
  forecast_points: ApiForecastPoint[];
  confidence: number;
  farmer_guidance: string;
  personalized_profile_notes?: string[];
  provenance_label: string;
  methodology: string;
  data_mode: string;
  disclaimer: string;
}

export interface ApiForecastSummaryResponse {
  total_stations: number;
  stations_with_forecast: number;
  stations_missing_history: number;
  stations_projected_worsening: number;
  stations_projected_improving: number;
  stations_projected_stable: number;
  stations_reaching_critical_30d: number;
  stations_reaching_critical_60d: number;
  stations_reaching_critical_90d: number;
  average_days_to_critical: number | null;
  days_to_critical_breakdown: Record<string, number>;
  data_mode: string;
  disclaimer: string;
}

export interface ApiRegionalForecastRow {
  state: string;
  station_count: number;
  average_current_depth: number;
  average_daily_change: number;
  projected_change: number;
  forecast_direction: string;
  critical_within_horizon: number;
  risk_category: string;
  expected_rainfall_mm: number;
  priority_action: string;
}

export interface ApiAnomalyResponse {
  anomaly_id: string;
  station_id: string;
  station_name: string;
  state: string;
  district: string;
  block?: string;
  category: string;
  severity: string;
  detected_at: string;
  observed_value: number;
  expected_value: number;
  deviation: string;
  deviation_unit: string;
  description: string;
  why_it_matters: string;
  recommended_action: string;
  verification_status: string;
  evidence: Record<string, any>;
  timeline?: {
    timestamp: string;
    observed: number;
    expected: number;
    deviation: number;
    is_anomaly: boolean;
  }[];
  data_mode: string;
}

export interface ApiAnomalySummaryResponse {
  total_anomalies: number;
  critical_count: number;
  high_count: number;
  warning_count: number;
  info_count: number;
  sudden_drop_count: number;
  sudden_rise_count: number;
  possible_extraction_count: number;
  missing_data_count: number;
  sensor_error_count: number;
  stations_affected: number;
  data_mode: string;
  disclaimer: string;
}

export interface ApiCropRecommendationResponse {
  farm_profile: Record<string, any>;
  groundwater_context: {
    station_count_used: number;
    station_id?: string;
    station_name?: string;
    average_depth_mbgl: number;
    average_risk_score: number;
    dominant_trend: string;
    critical_station_percentage: number;
    forecast_context: string;
  };
  top_recommendations: {
    rank: number;
    crop_id: string;
    crop_name: string;
    local_name?: string;
    overall_score: number;
    tier: string;
    water_requirement_mm: number;
    maturity_days: string;
    scores: {
      soil_score: number;
      water_score: number;
      season_score: number;
      rainfall_score: number;
      groundwater_score: number;
      overall_score: number;
    };
    aquifer_impact: string;
    reasons: string[];
    farmer_advice: string;
    estimated_water_demand_m3?: number;
  }[];
  not_recommended: {
    crop_id: string;
    crop_name: string;
    local_name?: string;
    overall_score: number;
    water_requirement_mm: number;
    aquifer_impact: string;
    reason: string;
    farmer_warning: string;
  }[];
  scoring_weights: Record<string, number>;
  methodology: string;
  data_mode: string;
  disclaimer: string;
}
