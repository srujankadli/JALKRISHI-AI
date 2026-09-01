import { apiClient } from './apiClient';
import type {
  ApiAnalyticsSummaryResponse,
  ApiStateAnalyticsRow,
  ApiDistrictAnalyticsRow,
} from '../types/api';

export const analyticsService = {
  /**
   * Returns national analytics summary counters from FastAPI.
   */
  async getSummary(): Promise<ApiAnalyticsSummaryResponse | null> {
    try {
      return await apiClient.get<ApiAnalyticsSummaryResponse>(
        '/analytics/summary',
        undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
    } catch {
      return null;
    }
  },

  /**
   * Returns state-wise aggregated metrics.
   */
  async getStateAnalytics(state?: string): Promise<ApiStateAnalyticsRow[]> {
    try {
      const res = await apiClient.get<{ states: ApiStateAnalyticsRow[] }>(
        '/analytics/states',
        state && state !== 'All States' && state !== 'All India' ? { state } : undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
      return res?.states || [];
    } catch {
      return [];
    }
  },

  /**
   * Returns state risk ranking.
   */
  async getStateRiskRanking() {
    try {
      const res = await apiClient.get<{ rankings: any[] }>(
        '/analytics/states/risk-ranking',
        undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
      return res?.rankings || [];
    } catch {
      return [];
    }
  },

  /**
   * Returns district-level aggregated metrics.
   */
  async getDistrictAnalytics(state?: string, district?: string): Promise<ApiDistrictAnalyticsRow[]> {
    try {
      const params: Record<string, any> = {};
      if (state && state !== 'All States' && state !== 'All India') params.state = state;
      if (district && district !== 'All Districts') params.district = district;

      const res = await apiClient.get<{ districts: ApiDistrictAnalyticsRow[] }>(
        '/analytics/districts',
        params,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
      return res?.districts || [];
    } catch {
      return [];
    }
  },

  /**
   * Returns observed groundwater trend trajectories.
   */
  async getTrendSummary(days: 7 | 30 | 90 = 30, state?: string, district?: string) {
    try {
      const params: Record<string, any> = { days };
      if (state && state !== 'All States' && state !== 'All India') params.state = state;
      if (district && district !== 'All Districts') params.district = district;

      return await apiClient.get(
        '/analytics/trend',
        params,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
    } catch {
      return null;
    }
  },
};
