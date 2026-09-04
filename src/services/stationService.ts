import type { DWLRStation, StationStatus, TrendDirection } from '../types';
import { generate5260Stations } from '../data/stationGenerator';
import { findNearestStation } from '../utils/geoUtils';
import { apiClient } from './apiClient';
import type { ApiStationListResponse, ApiStationSummaryResponse } from '../types/api';

export interface StationFilterParams {
  state?: string;
  district?: string;
  status?: StationStatus | 'all';
  trend?: TrendDirection | 'all';
  riskLevel?: 'all' | 'low' | 'medium' | 'high' | 'critical';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface StateStationSummary {
  state: string;
  total: number;
  healthy: number;
  moderate: number;
  warning: number;
  critical: number;
  avgDepth: number;
  stressInsight: string;
}

export const stationService = {
  /**
   * Returns all 5,260 DWLR stations (from FastAPI backend if online, else deterministic local generator).
   */
  async getAllStations(): Promise<DWLRStation[]> {
    try {
      const res = await apiClient.get<ApiStationListResponse>(
        '/stations',
        { limit: 5260 },
        { useCache: true, cacheTtlMs: 60000, timeoutMs: 8000 }
      );
      if (res && res.stations && res.stations.length > 0) {
        return res.stations;
      }
    } catch {
      // Backend offline -> seamless local fallback
    }

    const all = generate5260Stations();
    return [...all];
  },

  /**
   * Retrieves a single DWLR station by its unique ID or station code.
   */
  async getStationById(id: string): Promise<DWLRStation | undefined> {
    if (!id) return undefined;

    try {
      const station = await apiClient.get<DWLRStation>(
        `/stations/${encodeURIComponent(id)}`,
        undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
      if (station && station.id) {
        return station;
      }
    } catch {
      // Fallback to local
    }

    const all = generate5260Stations();
    const cleanId = id.toLowerCase();
    return all.find(
      (s) => s.id.toLowerCase() === cleanId || s.stationCode.toLowerCase() === cleanId
    );
  },

  /**
   * Returns filtered stations according to multiple criteria (state, district, status, trend, risk, search).
   */
  async filterStations(params: StationFilterParams): Promise<DWLRStation[]> {
    try {
      const apiParams: Record<string, any> = {};
      if (params.state && params.state !== 'All States' && params.state !== 'All India') {
        apiParams.state = params.state;
      }
      if (params.district && params.district !== 'All Districts') {
        apiParams.district = params.district;
      }
      if (params.status && params.status !== 'all') {
        apiParams.status = params.status;
      }
      if (params.trend && params.trend !== 'all') {
        apiParams.trend = params.trend;
      }
      if (params.limit) {
        apiParams.limit = params.limit;
      }
      if (params.offset) {
        apiParams.offset = params.offset;
      }

      // If search query is provided, query search endpoint
      if (params.searchQuery && params.searchQuery.trim() !== '') {
        const searchRes = await apiClient.get<{ stations: DWLRStation[] }>(
          '/stations/search',
          { q: params.searchQuery.trim() },
          { timeoutMs: 2500 }
        );
        if (searchRes && searchRes.stations) {
          let list = searchRes.stations;
          if (params.state && params.state !== 'All States') {
            list = list.filter((s) => s.state.toLowerCase() === params.state?.toLowerCase());
          }
          if (params.district && params.district !== 'All Districts') {
            list = list.filter((s) => s.district.toLowerCase() === params.district?.toLowerCase());
          }
          if (params.status && params.status !== 'all') {
            list = list.filter((s) => s.status === params.status);
          }
          return list;
        }
      }

      const res = await apiClient.get<ApiStationListResponse>(
        '/stations',
        apiParams,
        { useCache: true, cacheTtlMs: 20000, timeoutMs: 3000 }
      );
      if (res && res.stations) {
        let list = res.stations;
        if (params.riskLevel && params.riskLevel !== 'all') {
          if (params.riskLevel === 'low') list = list.filter((s) => s.riskScore < 0.4);
          else if (params.riskLevel === 'medium') list = list.filter((s) => s.riskScore >= 0.4 && s.riskScore < 0.7);
          else if (params.riskLevel === 'high') list = list.filter((s) => s.riskScore >= 0.7 && s.riskScore < 0.85);
          else if (params.riskLevel === 'critical') list = list.filter((s) => s.riskScore >= 0.85);
        }
        return list;
      }
    } catch {
      // Fallback
    }

    // Local deterministic fallback logic
    const all = generate5260Stations();
    let filtered = all;

    if (params.state && params.state !== 'All States' && params.state !== 'All India') {
      const st = params.state.toLowerCase();
      filtered = filtered.filter((s) => s.state.toLowerCase() === st);
    }

    if (params.district && params.district !== 'All Districts') {
      const dist = params.district.toLowerCase();
      filtered = filtered.filter((s) => s.district.toLowerCase() === dist);
    }

    if (params.status && params.status !== 'all') {
      filtered = filtered.filter((s) => s.status === params.status);
    }

    if (params.trend && params.trend !== 'all') {
      filtered = filtered.filter((s) => s.trend === params.trend);
    }

    if (params.riskLevel && params.riskLevel !== 'all') {
      if (params.riskLevel === 'low') {
        filtered = filtered.filter((s) => s.riskScore < 0.4);
      } else if (params.riskLevel === 'medium') {
        filtered = filtered.filter((s) => s.riskScore >= 0.4 && s.riskScore < 0.7);
      } else if (params.riskLevel === 'high') {
        filtered = filtered.filter((s) => s.riskScore >= 0.7 && s.riskScore < 0.85);
      } else if (params.riskLevel === 'critical') {
        filtered = filtered.filter((s) => s.riskScore >= 0.85);
      }
    }

    if (params.searchQuery && params.searchQuery.trim() !== '') {
      const query = params.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.stationName.toLowerCase().includes(query) ||
          s.district.toLowerCase().includes(query) ||
          s.state.toLowerCase().includes(query) ||
          s.block.toLowerCase().includes(query) ||
          s.stationCode.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      );
    }

    if (params.limit && params.limit > 0) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  },

  /**
   * Retrieves list of all unique states represented in the network.
   */
  async getDistinctStates(): Promise<string[]> {
    const all = await this.getAllStations();
    const states = Array.from(new Set(all.map((s) => s.state))).sort();
    return ['All States', ...states];
  },

  /**
   * Retrieves all unique districts, optionally filtered by state.
   */
  async getDistinctDistricts(state?: string): Promise<string[]> {
    const all = await this.getAllStations();
    let pool = all;
    if (state && state !== 'All States' && state !== 'All India') {
      pool = pool.filter((s) => s.state.toLowerCase() === state.toLowerCase());
    }
    const districts = Array.from(new Set(pool.map((s) => s.district))).sort();
    return ['All Districts', ...districts];
  },

  /**
   * Returns a calculated state hydrological summary and regional insight.
   */
  async getStateSummary(state: string): Promise<StateStationSummary | null> {
    if (!state || state === 'All States' || state === 'All India') return null;

    const all = await this.getAllStations();
    const stateStations = all.filter((s) => s.state.toLowerCase() === state.toLowerCase());
    if (stateStations.length === 0) return null;

    const total = stateStations.length;
    const healthy = stateStations.filter((s) => s.status === 'healthy').length;
    const moderate = stateStations.filter((s) => s.status === 'moderate').length;
    const warning = stateStations.filter((s) => s.status === 'warning').length;
    const critical = stateStations.filter((s) => s.status === 'critical').length;
    const avgDepth =
      Math.round(
        (stateStations.reduce((sum, s) => sum + s.waterLevel, 0) / total) * 10
      ) / 10;

    let stressInsight = '';
    const criticalPct = Math.round((critical / total) * 100);

    if (criticalPct > 20) {
      stressInsight = `${state} displays elevated groundwater stress across ${critical} monitored stations (${criticalPct}%). Urgent conservation & micro-irrigation advised.`;
    } else if (warning + critical > 0.3 * total) {
      stressInsight = `${state} has ${warning + critical} observation wells in warning or critical status. Shallow alluvial recovery is lagged.`;
    } else {
      stressInsight = `${state} maintains favorable groundwater storage across ${healthy} healthy stations (${Math.round((healthy / total) * 100)}%). Active recharge detected.`;
    }

    return {
      state,
      total,
      healthy,
      moderate,
      warning,
      critical,
      avgDepth,
      stressInsight,
    };
  },

  /**
   * Returns network summary counters.
   */
  async getNetworkSummary(): Promise<ApiStationSummaryResponse | null> {
    try {
      return await apiClient.get<ApiStationSummaryResponse>(
        '/stations/summary',
        undefined,
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 2500 }
      );
    } catch {
      return null;
    }
  },

  /**
   * Retrieves nearby DWLR stations within radiusKm for evidence display.
   */
  async getNearbyStations(latitude: number, longitude: number, radiusKm = 35.0, limit = 5): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>(
        '/stations/nearby',
        { latitude, longitude, radius_km: radiusKm, limit },
        { useCache: true, cacheTtlMs: 30000, timeoutMs: 3000 }
      );
      if (res && Array.isArray(res)) {
        return res;
      }
    } catch {
      // Fallback
    }
    return [];
  },

  /**
   * Finds closest DWLR observation well using Haversine calculation.
   */
  async findNearest(userLat: number, userLon: number) {
    const all = await this.getAllStations();
    return findNearestStation(userLat, userLon, all);
  },

  async getHighRiskStations(limit = 10): Promise<DWLRStation[]> {
    const all = await this.getAllStations();
    return [...all]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  },

  async getSafeStations(limit = 10): Promise<DWLRStation[]> {
    const all = await this.getAllStations();
    return [...all]
      .sort((a, b) => a.riskScore - b.riskScore)
      .slice(0, limit);
  },
};
