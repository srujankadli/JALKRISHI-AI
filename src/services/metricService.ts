import type { DashboardSummary } from '../types';
import {
  mockDashboardSummary,
  mockMonthlyTrends,
  mockTrendTimeframes,
  mockAreasToWatch,
} from '../data/mockMetrics';
import { apiClient } from './apiClient';
import type { ApiStationSummaryResponse } from '../types/api';

export const metricService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const summary = await apiClient.get<ApiStationSummaryResponse>(
        '/stations/summary',
        undefined,
        { useCache: true, cacheTtlMs: 20000, timeoutMs: 2500 }
      );

      if (summary && summary.totalStations > 0) {
        return {
          totalStationsMonitored: summary.totalStations,
          activeInScope: summary.totalStations,
          healthyCount: summary.healthyCount,
          moderateCount: summary.moderateCount,
          warningCount: summary.warningCount,
          criticalCount: summary.criticalCount,
          avgDepthMbgl: summary.avgDepthMbgl,
          waterLevelChangePercentage: -4.2,
          criticalAlertsCount: 4,
          telemetryOnlineRate: summary.telemetryHealth?.onlinePercentage || 98.2,
          averageRainfallMm: 62.4,
          rainfallDeviationPct: 8.5,
          stateSummaries: mockDashboardSummary.stateSummaries,
        };
      }
    } catch {
      // Fallback
    }

    return { ...mockDashboardSummary };
  },

  async getMonthlyTrends(): Promise<typeof mockMonthlyTrends> {
    return [...mockMonthlyTrends];
  },

  async getTrendTimeframe(timeframe: '7d' | '30d' | '90d') {
    return [...mockTrendTimeframes[timeframe]];
  },

  async getAreasToWatch(): Promise<typeof mockAreasToWatch> {
    return [...mockAreasToWatch];
  },
};
