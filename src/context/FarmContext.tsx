import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { DWLRStation } from '../types';
import { FARMER_CONFIG } from '../config/farmerConfig';
import { stationService } from '../services/stationService';
import { calculateDistanceKm } from '../utils/geoUtils';
import { apiClient } from '../services/apiClient';

export interface FarmWaterProfile {
  location: string;
  crop?: string | null;
  facilities: string[];
  reliability: string;
  groundwaterDependencyRange: string;
  groundwaterPercentage?: number | null;
  externalWaterDependencyRange: string;
  externalPercentage?: number | null;
  rainfallDependency?: string | null;
  rainfallPercentage?: number | null;
  waterSources?: string[];
  groundwaterDependence?: string;
  waterReliability?: string;
}

export const DEFAULT_FARM_PROFILE: FarmWaterProfile = {
  location: '',
  crop: null,
  facilities: [],
  reliability: '',
  groundwaterDependencyRange: '',
  groundwaterPercentage: null,
  externalWaterDependencyRange: '',
  externalPercentage: null,
  rainfallDependency: null,
  rainfallPercentage: null,
  waterSources: [],
  groundwaterDependence: '',
  waterReliability: '',
};

export interface ResolvedFarmLocation {
  locationQuery: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  is_resolved: boolean;
  matched_station_id?: string | null;
  nearest_station_distance_km?: number | null;
  estimation_mode: 'DIRECT_DWLR' | 'SATELLITE_ASSISTED' | 'LOCATION_REQUIRED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface NearbyStationEvidence {
  station: DWLRStation;
  distanceKm: number;
}

export interface FarmContextType {
  location: string;
  resolvedLocation: ResolvedFarmLocation | null;
  profile: FarmWaterProfile;
  nearbyStations: NearbyStationEvidence[];
  nearestStation: NearbyStationEvidence | null;
  isDirectObservation: boolean;
  isLoading: boolean;
  error: string | null;
  experienceMode: 'farmer' | 'official';
  setFarmLocation: (query: string) => Promise<boolean>;
  updateFarmProfile: (updates: Partial<FarmWaterProfile>) => void;
  clearFarmLocation: () => void;
  setExperienceMode: (mode: 'farmer' | 'official') => void;
  refreshFarmIntelligence: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

import { useAuth } from './AuthContext';

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOfficial } = useAuth();
  const experienceMode: 'farmer' | 'official' = isOfficial ? 'official' : 'farmer';

  const [location, setLocation] = useState<string>(() => {
    try {
      return localStorage.getItem(FARMER_CONFIG.STORAGE_KEYS.FARM_LOCATION) || '';
    } catch {
      return '';
    }
  });

  const [profile, setProfile] = useState<FarmWaterProfile>(() => {
    try {
      const saved = localStorage.getItem(FARMER_CONFIG.STORAGE_KEYS.FARM_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_FARM_PROFILE, ...parsed };
      }
    } catch (e) {
      console.warn('Could not parse stored farm water profile', e);
    }
    return DEFAULT_FARM_PROFILE;
  });

  const [resolvedLocation, setResolvedLocation] = useState<ResolvedFarmLocation | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStationEvidence[]>([]);
  const [nearestStation, setNearestStation] = useState<NearbyStationEvidence | null>(null);
  const [isDirectObservation, setIsDirectObservation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resolveLocationAndStations = useCallback(async (queryLoc: string): Promise<boolean> => {
    const trimmed = queryLoc.trim();
    if (!trimmed) {
      setResolvedLocation(null);
      setNearbyStations([]);
      setNearestStation(null);
      setIsDirectObservation(false);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Resolve location via backend dynamic location resolver
      const locRes = await apiClient.get<any>(
        '/location/resolve',
        { query: trimmed },
        { timeoutMs: 3000 }
      );

      if (!locRes || !locRes.is_resolved || locRes.latitude === null || locRes.latitude === undefined || locRes.longitude === null || locRes.longitude === undefined) {
        throw new Error(
          locRes?.error_message ||
            'Location could not be verified. Please enter a valid village, town, city, district, state, or 6-digit PIN code.'
        );
      }

      const targetLat = locRes.latitude;
      const targetLon = locRes.longitude;
      const targetDistrict = locRes.district || locRes.name || trimmed;
      const targetState = locRes.state || 'India';
      const canonicalName = locRes.name || locRes.canonical_name || trimmed;

      // 2. Fetch nearby DWLR stations within 35 km
      const nearbyRaw = await stationService.getNearbyStations(
        targetLat,
        targetLon,
        FARMER_CONFIG.NEARBY_EVIDENCE_RADIUS_KM,
        FARMER_CONFIG.MAX_NEARBY_STATIONS_DISPLAY
      );

      const stationDistances: NearbyStationEvidence[] = (nearbyRaw || []).map((st: any) => ({
        station: {
          id: st.id,
          stationCode: st.stationCode,
          stationName: st.stationName,
          state: st.state,
          district: st.district,
          block: st.block || '',
          latitude: st.latitude,
          longitude: st.longitude,
          waterLevel: st.waterLevel,
          previousWaterLevel: st.waterLevel,
          seasonalAverage: st.waterLevel,
          criticalThreshold: 25.0,
          riskScore: 0.5,
          status: st.status,
          trend: st.trend,
          trendRateMetersPerMonth: 0.1,
          daysToCritical: st.daysToCritical,
          batteryLevel: 90,
          telemetryStatus: 'online' as any,
          lastUpdated: st.lastUpdated,
        },
        distanceKm: st.distance_km ?? calculateDistanceKm(targetLat, targetLon, st.latitude, st.longitude),
      }));

      // Sort by distance ascending
      stationDistances.sort((a, b) => a.distanceKm - b.distanceKm);

      const closest = stationDistances[0] || null;
      setNearestStation(closest);

      const isDirect = closest ? closest.distanceKm <= FARMER_CONFIG.DIRECT_DWLR_RADIUS_KM : false;
      setIsDirectObservation(isDirect);
      setNearbyStations(stationDistances);

      const resolved: ResolvedFarmLocation = {
        locationQuery: trimmed,
        name: canonicalName,
        district: targetDistrict,
        state: targetState,
        latitude: targetLat,
        longitude: targetLon,
        is_resolved: true,
        matched_station_id: closest?.station.id || locRes.matched_station_id || null,
        nearest_station_distance_km: closest?.distanceKm || null,
        estimation_mode: isDirect ? 'DIRECT_DWLR' : 'SATELLITE_ASSISTED',
        confidence: isDirect ? 'HIGH' : closest && closest.distanceKm <= 50 ? 'MEDIUM' : 'LOW',
      };

      setResolvedLocation(resolved);
      return true;
    } catch (err: any) {
      console.error('Error resolving farm location:', err);
      setError(err?.message || 'Failed to resolve location');
      setResolvedLocation(null);
      setNearbyStations([]);
      setNearestStation(null);
      setIsDirectObservation(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (location) {
      resolveLocationAndStations(location);
    }
  }, [location, resolveLocationAndStations]);

  const setFarmLocation = async (query: string): Promise<boolean> => {
    const trimmed = query.trim();
    if (!trimmed) {
      clearFarmLocation();
      return false;
    }

    // Resolve before making the new location canonical. This prevents an unknown
    // entry from changing only the label while reusing another area's evidence.
    const wasResolved = await resolveLocationAndStations(trimmed);
    if (!wasResolved) {
      return false;
    }

    setLocation(trimmed);
    try {
      localStorage.setItem(FARMER_CONFIG.STORAGE_KEYS.FARM_LOCATION, trimmed);
    } catch (e) {
      console.warn('Could not persist farm location to localStorage', e);
    }

    // Also update profile location
    setProfile((prev) => {
      const next = { ...prev, location: trimmed };
      try {
        localStorage.setItem(FARMER_CONFIG.STORAGE_KEYS.FARM_PROFILE, JSON.stringify(next));
      } catch (e) {
        console.warn('Could not persist profile to localStorage', e);
      }
      return next;
    });

    return true;
  };

  const updateFarmProfile = (updates: Partial<FarmWaterProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(FARMER_CONFIG.STORAGE_KEYS.FARM_PROFILE, JSON.stringify(next));
      } catch (e) {
        console.warn('Could not persist updated farm profile to localStorage', e);
      }
      return next;
    });
  };

  const clearFarmLocation = () => {
    setLocation('');
    setResolvedLocation(null);
    setNearbyStations([]);
    setNearestStation(null);
    setIsDirectObservation(false);
    try {
      localStorage.removeItem(FARMER_CONFIG.STORAGE_KEYS.FARM_LOCATION);
    } catch (e) {
      console.warn('Could not remove location from localStorage', e);
    }
    setProfile((prev) => {
      const next = { ...prev, location: '' };
      try {
        localStorage.setItem(FARMER_CONFIG.STORAGE_KEYS.FARM_PROFILE, JSON.stringify(next));
      } catch {
        // Keep the in-memory profile usable even when storage is unavailable.
      }
      return next;
    });
  };

  const setExperienceMode = (_mode: 'farmer' | 'official') => {
    // Mode is strictly authoritative from authenticated session (useAuth)
  };

  const refreshFarmIntelligence = async () => {
    if (location) {
      await resolveLocationAndStations(location);
    }
  };

  return (
    <FarmContext.Provider
      value={{
        location,
        resolvedLocation,
        profile,
        nearbyStations,
        nearestStation,
        isDirectObservation,
        isLoading,
        error,
        experienceMode,
        setFarmLocation,
        updateFarmProfile,
        clearFarmLocation,
        setExperienceMode,
        refreshFarmIntelligence,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = (): FarmContextType => {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
};
