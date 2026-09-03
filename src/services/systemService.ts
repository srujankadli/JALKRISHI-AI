import { apiClient } from './apiClient';

export interface SystemStatusData {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  data_mode: string;
  active_source: string;
  station_count: number;
  telemetry_record_count: number;
  data_quality_score: number;
  uptime_seconds: number;
  engines: {
    dwlr_station_repository: string;
    analytics: string;
    forecasting: string;
    anomaly_detection: string;
    crop_recommender: string;
    whatsapp: string;
    data_pipeline: string;
  };
  available_data_sources: string[];
  future_adapters: {
    india_wris: string;
    cgwb: string;
    imd: string;
  };
  disclaimer: string;
  timestamp: string;
}

export const systemService = {
  /**
   * Fetches comprehensive system diagnostics, readiness, engine health, and active data mode.
   */
  async getSystemStatus(): Promise<SystemStatusData> {
    try {
      const res = await apiClient.get<SystemStatusData>('/system/status', {
        timeoutMs: 3000,
      });
      if (res && res.status) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    return this.getLocalFallbackStatus();
  },

  /**
   * Local fallback system status when FastAPI is unreachable.
   */
  getLocalFallbackStatus(): SystemStatusData {
    return {
      status: 'healthy (offline mode)',
      app_name: 'JalKrishi AI — Groundwater Intelligence Platform',
      version: '2.6.0',
      environment: 'development',
      data_mode: 'DEMO_FALLBACK',
      active_source: 'DEMO_SIMULATION',
      station_count: 5260,
      telemetry_record_count: 36820,
      data_quality_score: 100.0,
      uptime_seconds: 0,
      engines: {
        dwlr_station_repository: 'available (local fallback)',
        analytics: 'available (local fallback)',
        forecasting: 'available (local fallback)',
        anomaly_detection: 'available (local fallback)',
        crop_recommender: 'available (local fallback)',
        whatsapp: 'available (local fallback)',
        data_pipeline: 'available (local fallback)',
      },
      available_data_sources: ['DEMO_SIMULATION', 'CSV_IMPORT'],
      future_adapters: {
        india_wris: 'NOT_CONFIGURED',
        cgwb: 'NOT_CONFIGURED',
        imd: 'NOT_CONFIGURED',
      },
      disclaimer: 'Reference Simulation Mode: Offline local fallback active.',
      timestamp: new Date().toISOString(),
    };
  },
};
