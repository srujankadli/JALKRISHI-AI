import type { StationForecast, DWLRStation, ForecastPoint } from '../types';
import {
  generateForecastForStation,
  mockRegionalOutlooks,
  mockDaysToCriticalBrackets,
  mockRainfallForecastSeries,
  type RegionalForecastOutlook,
  type DaysToCriticalBreakdown,
} from '../data/mockForecasts';
import { generate5260Stations } from '../data/stationGenerator';
import { apiClient } from './apiClient';
import type {
  ApiStationForecastResponse,
  ApiForecastSummaryResponse,
  ApiRegionalForecastRow,
} from '../types/api';

export const forecastService = {
  /**
   * Returns a 7-to-90 day forecast model for a specific observation well.
   */
  async getForecastForStation(stationId: string, horizonDays: number = 30): Promise<StationForecast> {
    const validHorizon = [7, 30, 60, 90].includes(horizonDays) ? horizonDays : 30;

    try {
      const apiRes = await apiClient.get<ApiStationForecastResponse>(
        `/forecast/${encodeURIComponent(stationId)}`,
        { days: validHorizon },
        { useCache: true, cacheTtlMs: 20000, timeoutMs: 3000 }
      );

      if (apiRes && apiRes.forecast_points && apiRes.forecast_points.length > 0) {
        const mappedPoints: ForecastPoint[] = apiRes.forecast_points.map((p) => ({
          date: p.date,
          predictedLevel: p.predicted_depth,
          upperConfidence: p.upper_bound,
          lowerConfidence: p.lower_bound,
          expectedRainfallMm: p.expected_rainfall_mm,
        }));

        const p30 =
          apiRes.forecast_points.find((p) => p.day_offset === 30)?.predicted_depth ??
          apiRes.forecast_points[apiRes.forecast_points.length - 1].predicted_depth;

        return {
          stationId: apiRes.station_id,
          stationName: apiRes.station_name,
          district: apiRes.district,
          state: apiRes.state,
          currentLevel: apiRes.current_depth,
          projectedLevel30d: p30,
          projectedDaysToCritical: apiRes.days_to_critical,
          confidenceScore: apiRes.confidence,
          farmerGuidance: apiRes.farmer_guidance,
          forecastPoints: mappedPoints,
        };
      }
    } catch {
      // Backend offline -> fallback
    }

    return generateForecastForStation(stationId);
  },

  /**
   * Returns state-by-state 90-day regional groundwater forecast outlooks.
   */
  async getRegionalOutlooks(): Promise<RegionalForecastOutlook[]> {
    try {
      const apiRes = await apiClient.get<{ regions: ApiRegionalForecastRow[] }>(
        '/forecast/regional',
        { days: 90 },
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 3000 }
      );

      if (apiRes && apiRes.regions && apiRes.regions.length > 0) {
        return apiRes.regions.map((r) => ({
          state: r.state,
          totalStations: r.station_count,
          currentAvgDepth: r.average_current_depth,
          trend: r.projected_change > 0.05 ? 'falling' : r.projected_change < -0.05 ? 'rising' : 'stable',
          riskLevel: r.risk_category as any,
          forecast90d: `${r.projected_change > 0 ? 'Decline +' : 'Rebound -'}${Math.abs(r.projected_change).toFixed(2)} mbgl`,
          expectedRainfallMm: r.expected_rainfall_mm,
          priorityAction: r.priority_action,
        }));
      }
    } catch {
      // Fallback
    }

    return [...mockRegionalOutlooks];
  },

  /**
   * Returns national Days-to-Critical brackets and station counts.
   */
  async getDaysToCriticalBrackets(): Promise<DaysToCriticalBreakdown[]> {
    try {
      const apiRes = await apiClient.get<ApiForecastSummaryResponse>(
        '/forecast/summary',
        undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 3000 }
      );

      if (apiRes && apiRes.days_to_critical_breakdown) {
        const b = apiRes.days_to_critical_breakdown;
        const tot = apiRes.total_stations || 5260;

        return [
          {
            range: '0–7 Days',
            label: 'Critical Alert',
            count: b['0–7 Days'] || 68,
            percentage: Math.round(((b['0–7 Days'] || 68) / tot) * 1000) / 10,
            severity: 'critical',
            farmerDescription: 'Aquifer table is within centimeters of pump suction depth. Emergency water scarcity.',
            actionRequired: 'Immediately restrict continuous tube-well pumping. Alternate hours across neighboring plots.',
          },
          {
            range: '8–30 Days',
            label: 'High Attention',
            count: b['8–30 Days'] || 376,
            percentage: Math.round(((b['8–30 Days'] || 376) / tot) * 1000) / 10,
            severity: 'high',
            farmerDescription: 'Fast depletion velocity indicates critical water stress within the current crop cycle.',
            actionRequired: 'Transition upcoming rabi/kharif sowing to pulses/millets. Implement drip or furrow irrigation.',
          },
          {
            range: '31–60 Days',
            label: 'Watch Zone',
            count: b['31–60 Days'] || 780,
            percentage: Math.round(((b['31–60 Days'] || 780) / tot) * 1000) / 10,
            severity: 'watch',
            farmerDescription: 'Manageable seasonal draw, but requires monitoring if monsoon rainfall is delayed.',
            actionRequired: 'Calibrate pumping schedules to night hours. Check soil moisture before irrigating.',
          },
          {
            range: '60+ Days / Safe',
            label: 'Lower Immediate Risk',
            count: b['60+ Days / Safe'] || 4036,
            percentage: Math.round(((b['60+ Days / Safe'] || 4036) / tot) * 1000) / 10,
            severity: 'safe',
            farmerDescription: 'Adequate groundwater reserve. Recharge rates balance seasonal extraction demand.',
            actionRequired: 'Maintain good agronomic water management. Practice farm-pond rainwater harvesting.',
          },
        ];
      }
    } catch {
      // Fallback
    }

    return [...mockDaysToCriticalBrackets];
  },

  /**
   * Returns multi-period rainfall forecast and infiltration response data.
   */
  async getRainfallForecastSeries() {
    return [...mockRainfallForecastSeries];
  },

  /**
   * Returns Top 10 High-Risk stations ranked by highest risk score & lowest days to critical.
   */
  async getTop10HighRiskStations(): Promise<DWLRStation[]> {
    try {
      const apiRes = await apiClient.get<{ rankings: any[] }>(
        '/forecast/top-risk',
        { limit: 10, days: 30 },
        { useCache: true, cacheTtlMs: 20000, timeoutMs: 2500 }
      );
      if (apiRes && apiRes.rankings && apiRes.rankings.length > 0) {
        const ids = apiRes.rankings.map((r) => r.station_id);
        const all = generate5260Stations();
        return all.filter((s) => ids.includes(s.id));
      }
    } catch {
      // Fallback
    }

    const all = generate5260Stations();
    return [...all]
      .filter((s) => s.status === 'critical' || s.status === 'warning')
      .sort((a, b) => {
        if (a.daysToCritical && b.daysToCritical) {
          return a.daysToCritical - b.daysToCritical;
        }
        return b.riskScore - a.riskScore;
      })
      .slice(0, 10);
  },

  /**
   * Returns Top 10 Lower-Risk / Most Stable stations.
   */
  async getTop10LowerRiskStations(): Promise<DWLRStation[]> {
    const all = generate5260Stations();
    return [...all]
      .filter((s) => s.status === 'healthy')
      .sort((a, b) => a.riskScore - b.riskScore)
      .slice(0, 10);
  },
};
