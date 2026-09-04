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

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [experienceMode, setExperienceModeState] = useState<'farmer' | 'official'>(() => {
    try {
      const saved = localStorage.getItem(FARMER_CONFIG.STORAGE_KEYS.EXPERIENCE_MODE);
      return saved === 'official' ? 'official' : 'farmer';
    } catch {
      return 'farmer';
    }
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
      const allStations = await stationService.getAllStations();

      // 1. Try to match directly with existing DWLR station records
      const cleanQ = trimmed.toLowerCase();
      const directStationMatch = allStations.find(
        (s) =>
          s.district.toLowerCase() === cleanQ ||
          s.stationName.toLowerCase().includes(cleanQ) ||
          s.block?.toLowerCase() === cleanQ ||
          s.id.toLowerCase() === cleanQ
      );

      let targetLat: number;
      let targetLon: number;
      let targetDistrict: string;
      let targetState: string;

      if (directStationMatch) {
        targetLat = directStationMatch.latitude;
        targetLon = directStationMatch.longitude;
        targetDistrict = directStationMatch.district;
        targetState = directStationMatch.state;
      } else {
        // Query backend unified endpoint or fallback coordinates generator
        try {
          const res = await apiClient.get<any>(
            '/intelligence/unified',
            { location_query: trimmed },
            { timeoutMs: 2500 }
          );
          if (res && res.latitude && res.longitude) {
            targetLat = res.latitude;
            targetLon = res.longitude;
            targetDistrict = res.district || trimmed;
            targetState = res.state || 'India';
          } else {
            throw new Error('Location could not be resolved. Enter a village, town, district, PIN code, or coordinates.');
          }
        } catch (resolutionError) {
          throw resolutionError;
        }
      }

      // 2. Calculate spatial distances to all monitoring stations
      const stationDistances: NearbyStationEvidence[] = allStations.map((s) => ({
        station: s,
        distanceKm: calculateDistanceKm(targetLat, targetLon, s.latitude, s.longitude),
      }));

      // Sort by distance ascending
      stationDistances.sort((a, b) => a.distanceKm - b.distanceKm);

      const closest = stationDistances[0] || null;
      setNearestStation(closest);

      const isDirect = closest ? closest.distanceKm <= FARMER_CONFIG.DIRECT_DWLR_RADIUS_KM : false;
      setIsDirectObservation(isDirect);

      // Filter stations within configured nearby evidence radius
      const evidenceStations = stationDistances
        .filter((item) => item.distanceKm <= FARMER_CONFIG.NEARBY_EVIDENCE_RADIUS_KM)
        .slice(0, FARMER_CONFIG.MAX_NEARBY_STATIONS_DISPLAY);

      setNearbyStations(evidenceStations);

      const resolved: ResolvedFarmLocation = {
        locationQuery: trimmed,
        name: trimmed,
        district: targetDistrict,
        state: targetState,
        latitude: targetLat,
        longitude: targetLon,
        is_resolved: true,
        matched_station_id: closest?.station.id || null,
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

  const setExperienceMode = (mode: 'farmer' | 'official') => {
    setExperienceModeState(mode);
    try {
      localStorage.setItem(FARMER_CONFIG.STORAGE_KEYS.EXPERIENCE_MODE, mode);
    } catch (e) {
      console.warn('Could not persist experience mode to localStorage', e);
    }
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
