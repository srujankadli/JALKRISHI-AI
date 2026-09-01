import { apiClient } from './apiClient';

export interface TopPriorityRegion {
  state: string;
  district: string;
  risk_score: number;
  status: string;
  action: string;
}

export interface CrossSystemLink {
  module: string;
  path: string;
  label: string;
  icon: string;
}

export interface ExecutiveInsightSummaryData {
  headline: string;
  current_situation: string;
  top_priority_region: string;
  why_it_matters: string;
  forecast_outlook: string;
  recommended_farmer_action: string;
  confidence_level: string;
  confidence_explanation: string;
  network_metrics: {
    total_stations: number;
    critical_count: number;
    warning_count: number;
    average_depth_mbgl: number;
    average_risk_score: number;
    anomalies_detected: number;
  };
  top_priority_regions: TopPriorityRegion[];
  cross_system_links: CrossSystemLink[];
  data_mode: string;
  disclaimer: string;
}

export interface StationInsightData {
  station_id: string;
  station_name: string;
  district: string;
  state: string;
  current_depth: number;
  status: string;
  trend: string;
  risk_score: number;
  headline: string;
  why_it_matters: string;
  forecast_summary: string;
  days_to_critical?: number;
  anomaly_notes?: string;
  recommended_crops: string[];
  action_plan: string;
  confidence_level: string;
  data_mode: string;
  disclaimer: string;
}

export const insightService = {
  /**
   * Fetches the executive AI intelligence summary synthesizing all backend microservices.
   */
  async getExecutiveSummary(): Promise<ExecutiveInsightSummaryData> {
    try {
      const res = await apiClient.get<ExecutiveInsightSummaryData>('/insights/summary', {
        timeoutMs: 3500,
      });
      if (res && res.headline) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    return this.getLocalFallbackSummary();
  },

  /**
   * Fetches specific DWLR station AI intelligence brief.
   */
  async getStationInsight(stationId: string): Promise<StationInsightData> {
    try {
      const res = await apiClient.get<StationInsightData>(`/insights/station/${stationId}`, {
        timeoutMs: 3500,
      });
      if (res && res.station_id) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    return {
      station_id: stationId,
      station_name: `Observation Well ${stationId}`,
      district: 'Kolar',
      state: 'Karnataka',
      current_depth: 28.4,
      status: 'critical',
      trend: 'falling',
      risk_score: 0.88,
      headline: `Station ${stationId} is in CRITICAL groundwater drawdown zone.`,
      why_it_matters: 'Groundwater table is 28.4m mbgl and declining at ~0.28m/month.',
      forecast_summary: '30-day forecast projects level at 28.9m mbgl with 115 days to critical threshold.',
      days_to_critical: 115,
      recommended_crops: ['Chickpea / Chana', 'Mustard / Sarson', 'Bajra / Pearl Millet'],
      action_plan: 'Switch upcoming sowing to low-water pulses and restrict flood irrigation.',
      confidence_level: 'HIGH',
      data_mode: 'DEMO_FALLBACK',
      disclaimer: 'Offline Fallback: Local deterministic simulation response.',
    };
  },

  /**
   * Deterministic local fallback summary when backend is offline.
   */
  getLocalFallbackSummary(): ExecutiveInsightSummaryData {
    return {
      headline: 'Groundwater pressure elevated across 842 DWLR observation nodes (16.0% Critical).',
      current_situation: 'Network telemetry across 5,260 DWLR stations indicates 842 Critical wells, 1,280 Warning wells, and an average groundwater depth of 18.4m mbgl. 3,061 stations (58.2%) report declining water tables.',
      top_priority_region: 'Punjab (Sangrur) & Rajasthan (Jaipur)',
      why_it_matters: 'Continuous multi-season depletion in intensive agricultural zones reduces borewell recovery rates and increases risk of well dry-up during Rabi sowing.',
      forecast_outlook: '30-day hydrodynamic projection indicates 1,120 stations reaching critical depth. Average network countdown is 84 Days-to-Critical.',
      recommended_farmer_action: 'Prioritize water-smart pulse crops (Chickpea/Chana, Mustard, Bajra) over water-intensive paddy/sugarcane. Adopt drip irrigation and schedule pumping during non-peak hours.',
      confidence_level: 'HIGH',
      confidence_explanation: 'Synthesized from 5,260 active DWLR piezometers with 100% data quality validation score.',
      network_metrics: {
        total_stations: 5260,
        critical_count: 842,
        warning_count: 1280,
        average_depth_mbgl: 18.4,
        average_risk_score: 0.48,
        anomalies_detected: 819,
      },
      top_priority_regions: [
        { state: 'Punjab', district: 'Sangrur', risk_score: 0.88, status: 'Critical Zone', action: 'Restrict intensive tube-well extraction & adopt micro-irrigation' },
        { state: 'Rajasthan', district: 'Jaipur', risk_score: 0.85, status: 'Critical Zone', action: 'Switch sowing to short-duration mustard or pulses' },
        { state: 'Karnataka', district: 'Kolar', risk_score: 0.82, status: 'Warning Zone', action: 'Enforce aquifer recharge and community water sharing' },
        { state: 'Haryana', district: 'Karnal', risk_score: 0.79, status: 'Warning Zone', action: 'Monitor drawdown velocity during crop germination' },
        { state: 'Tamil Nadu', district: 'Dharmapuri', risk_score: 0.74, status: 'Warning Zone', action: 'Promote drought-tolerant millets and pulses' },
      ],
      cross_system_links: [
        { module: 'Map', path: '/map', label: 'Inspect 5,260 Stations', icon: 'MapPin' },
        { module: 'Forecast', path: '/forecast', label: '30d Depletion Trajectory', icon: 'TrendingUp' },
        { module: 'Anomalies', path: '/anomalies', label: '819 Active Telemetry Alerts', icon: 'AlertTriangle' },
        { module: 'Crop Advisor', path: '/crops', label: 'Water-Smart Sowing Recommendations', icon: 'Sprout' },
        { module: 'WhatsApp', path: '/whatsapp', label: 'Conversational Farmer Chatbot', icon: 'MessageSquare' },
      ],
      data_mode: 'DEMO_FALLBACK',
      disclaimer: 'Offline Fallback: Local deterministic simulation response.',
    };
  },
};
