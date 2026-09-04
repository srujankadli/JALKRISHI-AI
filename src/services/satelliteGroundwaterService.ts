/**
 * JalKrishi AI — Satellite Groundwater Service
 * --------------------------------------------
 * Client-side service for fetching spatial groundwater estimates, coverage determination,
 * satellite/environmental indicator breakdowns, and data provider registration status.
 * Features live API integration with deterministic offline local fallback.
 */

import { apiClient } from './apiClient';

export type EstimationMode = 'DIRECT_DWLR' | 'SATELLITE_ASSISTED';
export type GroundwaterCondition = 'LOW_STRESS' | 'MODERATE_STRESS' | 'HIGH_STRESS' | 'CRITICAL_STRESS';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IndicatorItem {
  name: string;
  value: number | string;
  unit: string;
  status: string;
  source: string;
  confidence: ConfidenceLevel;
  description: string;
}

export interface SatelliteGroundwaterEstimate {
  latitude: number;
  longitude: number;
  dwlr_available: boolean;
  nearest_station_id?: string | null;
  nearest_station_name?: string | null;
  nearest_station_distance_km: number;
  estimation_mode: EstimationMode;
  groundwater_condition: GroundwaterCondition;
  groundwater_stress_score: number;
  estimated_trend: 'RISING' | 'STABLE' | 'FALLING';
  confidence: ConfidenceLevel;
  confidence_score: number;
  rainfall_condition: string;
  rainfall_probability: number;
  rainfall_mm_estimate: number;
  recharge_outlook: 'POOR' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
  indicators: Record<string, IndicatorItem>;
  data_sources: string[];
  timestamp: string;
  disclaimer: string;
  data_mode: string;
}

export interface SatelliteGroundwaterCoverage {
  latitude: number;
  longitude: number;
  dwlr_available: boolean;
  coverage_type: 'Direct Measurement' | 'Satellite-Assisted Estimate';
  radius_km: number;
  nearest_station_id?: string | null;
  nearest_station_distance_km: number;
  confidence_level: ConfidenceLevel;
  data_mode: string;
}

export interface SatelliteProviderSource {
  provider_name: string;
  category: string;
  status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'SIMULATED';
  description: string;
}

/**
 * Deterministic local fallback generator when backend is offline.
 */
function generateLocalFallbackEstimate(
  lat: number,
  lon: number,
  radiusKm: number = 15.0
): SatelliteGroundwaterEstimate {
  // Deterministic pseudo-random seed based on lat/lon
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453) % 1;

  const rawDist = Math.round((seed * 45 + 2) * 10) / 10;
  const isDwlrAvailable = rawDist <= radiusKm;
  const dist = rawDist;

  const stressScore = Math.round((0.25 + seed * 0.65) * 100) / 100;
  let condition: GroundwaterCondition = 'MODERATE_STRESS';
  if (stressScore < 0.35) condition = 'LOW_STRESS';
  else if (stressScore < 0.60) condition = 'MODERATE_STRESS';
  else if (stressScore < 0.80) condition = 'HIGH_STRESS';
  else condition = 'CRITICAL_STRESS';

  const trend: 'RISING' | 'STABLE' | 'FALLING' = seed > 0.6 ? 'FALLING' : seed > 0.3 ? 'STABLE' : 'RISING';
  const confidence: ConfidenceLevel = isDwlrAvailable ? 'HIGH' : dist <= 50 ? 'MEDIUM' : 'LOW';

  const ndvi = Math.round((0.25 + seed * 0.5) * 100) / 100;
  const tempAnomaly = Math.round((-1.0 + seed * 4.5) * 10) / 10;
  const rainMm = Math.round((20 + seed * 120) * 10) / 10;

  return {
    latitude: lat,
    longitude: lon,
    dwlr_available: isDwlrAvailable,
    nearest_station_id: isDwlrAvailable ? `DWLR-STN-${Math.abs(Math.round(lat * 100)) % 1000}` : null,
    nearest_station_name: isDwlrAvailable ? `Observation Well (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)` : null,
    nearest_station_distance_km: dist,
    estimation_mode: isDwlrAvailable ? 'DIRECT_DWLR' : 'SATELLITE_ASSISTED',
    groundwater_condition: condition,
    groundwater_stress_score: stressScore,
    estimated_trend: trend,
    confidence,
    confidence_score: Math.round((0.4 + seed * 0.5) * 100) / 100,
    rainfall_condition: rainMm > 90 ? 'EXCESS' : rainMm < 40 ? 'DEFICIT' : 'NORMAL',
    rainfall_probability: Math.round(30 + seed * 60),
    rainfall_mm_estimate: rainMm,
    recharge_outlook: rainMm > 80 ? 'GOOD' : rainMm > 45 ? 'MODERATE' : 'POOR',
    indicators: {
      surface_temperature_signal: {
        name: 'Surface Thermal Anomaly',
        value: `${tempAnomaly > 0 ? '+' : ''}${tempAnomaly}`,
        unit: '°C vs baseline',
        status: tempAnomaly > 1.5 ? 'ELEVATED_WARMING' : 'NORMAL',
        source: 'REMOTE_SENSING_SIMULATION',
        confidence: 'MEDIUM',
        description: 'Surface skin temperature anomaly from remote-sensing radiometer simulation.',
      },
      vegetation_water_stress: {
        name: 'Vegetation Moisture Index (NDVI)',
        value: ndvi,
        unit: 'Index (0-1)',
        status: ndvi < 0.35 ? 'MOISTURE_DEFICIT' : 'HEALTHY_CANOPY',
        source: 'REMOTE_SENSING_SIMULATION',
        confidence: 'MEDIUM',
        description: 'Normalized vegetation greenness as a proxy for shallow soil moisture.',
      },
      water_storage_anomaly: {
        name: 'Terrestrial Water Storage (GRACE)',
        value: '-4.2',
        unit: 'cm water height',
        status: 'NOT_CONFIGURED (STUB)',
        source: 'NASA_GRACE_ADAPTER (NOT_CONFIGURED)',
        confidence: 'LOW',
        description: 'Deep storage anomaly stub. Live NASA GRACE feed is NOT_CONFIGURED.',
      },
      ground_deformation_signal: {
        name: 'Ground Subsidence Rate (InSAR)',
        value: '-2.1',
        unit: 'mm/year',
        status: 'NOT_CONFIGURED (STUB)',
        source: 'SENTINEL_SAR_ADAPTER (NOT_CONFIGURED)',
        confidence: 'LOW',
        description: 'Aquifer compaction stub. Live Sentinel-1 SAR provider is NOT_CONFIGURED.',
      },
      rainfall_signal: {
        name: 'Precipitation Signal',
        value: `${rainMm} mm`,
        unit: 'mm (30d)',
        status: rainMm < 40 ? 'DEFICIT' : 'NORMAL',
        source: 'SIMULATED_WEATHER_DATA',
        confidence: 'MEDIUM',
        description: '30-day cumulative precipitation simulation for natural aquifer recharge.',
      },
      nearby_dwlr_signal: {
        name: 'Nearest DWLR Telemetry',
        value: `${dist} km`,
        unit: 'km distance',
        status: trend,
        source: 'DIRECT_DWLR_NETWORK',
        confidence: isDwlrAvailable ? 'HIGH' : 'MEDIUM',
        description: 'Drawdown velocity recorded at nearest operational DWLR well.',
      },
    },
    data_sources: [
      'REMOTE_SENSING_SIMULATION',
      'SIMULATED_WEATHER_DATA',
      'NEARBY_DWLR_NETWORK',
      'FUTURE_GRACE_ADAPTER (NOT_CONFIGURED)',
      'FUTURE_SAR_ADAPTER (NOT_CONFIGURED)',
    ],
    timestamp: new Date().toISOString(),
    disclaimer:
      'Satellite-Assisted Estimate. This estimate combines remote-sensing indicators, rainfall signals, nearby groundwater observations, and environmental context. It is NOT a direct well-level measurement.',
    data_mode: 'DEMO_SIMULATION',
  };
}

export const satelliteGroundwaterService = {
  /**
   * Fetch spatial groundwater condition estimate for coordinates.
   */
  async getGroundwaterEstimate(
    latitude: number,
    longitude: number,
    radiusKm: number = 15.0
  ): Promise<SatelliteGroundwaterEstimate> {
    try {
      const res = await apiClient.get<SatelliteGroundwaterEstimate>(
        '/satellite-groundwater/estimate',
        { latitude, longitude, radius_km: radiusKm },
        { timeoutMs: 3000 }
      );
      if (res && res.estimation_mode) {
        return res;
      }
    } catch (err) {
      console.warn('Backend satellite groundwater endpoint unavailable, using deterministic local fallback:', err);
    }
    return generateLocalFallbackEstimate(latitude, longitude, radiusKm);
  },

  /**
   * Determine spatial DWLR vs Satellite coverage.
   */
  async getCoverage(
    latitude: number,
    longitude: number,
    radiusKm: number = 15.0
  ): Promise<SatelliteGroundwaterCoverage> {
    try {
      const res = await apiClient.get<SatelliteGroundwaterCoverage>(
        '/satellite-groundwater/coverage',
        { latitude, longitude, radius_km: radiusKm },
        { timeoutMs: 3000 }
      );
      if (res && res.coverage_type) {
        return res;
      }
    } catch (err) {
      // Fallback
    }
    const est = generateLocalFallbackEstimate(latitude, longitude, radiusKm);
    return {
      latitude,
      longitude,
      dwlr_available: est.dwlr_available,
      coverage_type: est.dwlr_available ? 'Direct Measurement' : 'Satellite-Assisted Estimate',
      radius_km: radiusKm,
      nearest_station_id: est.nearest_station_id,
      nearest_station_distance_km: est.nearest_station_distance_km,
      confidence_level: est.confidence,
      data_mode: 'DEMO_SIMULATION',
    };
  },

  /**
   * Fetch satellite and environmental indicator breakdown.
   */
  async getIndicators(latitude: number, longitude: number): Promise<Record<string, IndicatorItem>> {
    try {
      const res = await apiClient.get<Record<string, IndicatorItem>>(
        '/satellite-groundwater/indicators',
        { latitude, longitude },
        { timeoutMs: 3000 }
      );
      if (res && Object.keys(res).length > 0) {
        return res;
      }
    } catch (err) {
      // Fallback
    }
    const est = generateLocalFallbackEstimate(latitude, longitude);
    return est.indicators;
  },

  /**
   * Fetch list of registered remote sensing & weather data adapters.
   */
  async getProviderSources(): Promise<SatelliteProviderSource[]> {
    try {
      const res = await apiClient.get<SatelliteProviderSource[]>(
        '/satellite-groundwater/sources',
        undefined,
        { timeoutMs: 3000 }
      );
      if (res && res.length > 0) {
        return res;
      }
    } catch (err) {
      // Fallback
    }
    return [
      {
        provider_name: 'MODIS / Sentinel-2 Optical & Thermal Adapter',
        category: 'Optical & Thermal Satellite',
        status: 'SIMULATED',
        description: 'Simulated remote sensing indicators for canopy water stress & land surface temperature.',
      },
      {
        provider_name: 'NASA GRACE / GRACE-FO Mascon Adapter',
        category: 'Terrestrial Water Storage',
        status: 'NOT_CONFIGURED',
        description: 'NASA GRACE deep water storage anomaly adapter. Live credentials NOT_CONFIGURED.',
      },
      {
        provider_name: 'Sentinel-1 InSAR Subsidence Adapter',
        category: 'SAR Ground Deformation',
        status: 'NOT_CONFIGURED',
        description: 'Sentinel-1 SAR aquifer compaction adapter. Live credentials NOT_CONFIGURED.',
      },
      {
        provider_name: 'IMD / GPM Precipitation Adapter',
        category: 'Precipitation & Weather',
        status: 'SIMULATED',
        description: 'Simulated 30-day precipitation and monsoon recharge probability model.',
      },
    ];
  },
};
