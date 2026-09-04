export type StationStatus = 'healthy' | 'moderate' | 'warning' | 'critical';
export type TrendDirection = 'rising' | 'stable' | 'falling';
export type TelemetryStatus = 'online' | 'delayed' | 'offline';

export interface HistoricalReading {
  date: string;
  waterLevel: number; // in mbgl (meters below ground level)
  rainfall?: number; // in mm
}

export interface DWLRStation {
  id: string;
  stationCode: string;
  stationName: string;
  state: string;
  district: string;
  block: string;
  latitude: number;
  longitude: number;
  waterLevel: number; // Current depth in mbgl (higher = deeper water table = lower water)
  previousWaterLevel: number;
  seasonalAverage: number;
  criticalThreshold: number; // Threshold beyond which station is critical
  riskScore: number; // 0.00 to 1.00
  status: StationStatus;
  trend: TrendDirection;
  trendRateMetersPerMonth: number;
  daysToCritical: number | null;
  batteryLevel: number; // percentage
  telemetryStatus: TelemetryStatus;
  lastUpdated: string;
  soilType?: string;
  aquiferType?: string;
  historicalData?: HistoricalReading[];
  farmerSummary?: string;
  actionableAdvice?: string;
}

export interface DashboardSummary {
  totalStationsMonitored: number;
  activeInScope: number;
  healthyCount: number;
  moderateCount: number;
  warningCount: number;
  criticalCount: number;
  avgDepthMbgl: number;
  waterLevelChangePercentage: number;
  criticalAlertsCount: number;
  telemetryOnlineRate: number;
  averageRainfallMm: number;
  rainfallDeviationPct: number;
  stateSummaries: {
    state: string;
    total: number;
    critical: number;
    warning: number;
    avgDepth: number;
  }[];
}

export interface ForecastPoint {
  date: string;
  predictedLevel: number;
  upperConfidence: number;
  lowerConfidence: number;
  expectedRainfallMm: number;
}

export interface StationForecast {
  stationId: string;
  stationName: string;
  district: string;
  state: string;
  currentLevel: number;
  projectedLevel30d: number;
  projectedDaysToCritical: number | null;
  confidenceScore: number;
  farmerGuidance: string;
  forecastPoints: ForecastPoint[];
}

export interface LocationForecast {
  locationName: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  evidenceMode: 'DIRECT_DWLR' | 'REGIONAL_NEARBY_EVIDENCE' | 'SATELLITE_ASSISTED' | 'LOCATION_REQUIRED' | 'UNRESOLVED';
  nearestStationId?: string;
  nearestStationName?: string;
  nearestStationDistanceKm?: number;
  currentLevel?: number;
  criticalThreshold: number;
  projectedLevel30d?: number;
  projectedLevelEnd?: number;
  projectedDaysToCritical: number | null;
  daysToCriticalUrgency: string;
  forecastRisk: string;
  horizonDays: number;
  dailyChangeM: number;
  confidenceScore: number;
  farmerGuidance: string;
  personalizedProfileNotes?: string[];
  provenanceLabel: string;
  forecastPoints: ForecastPoint[];
}

export type SoilType =
  | 'Alluvial'
  | 'Black'
  | 'Red'
  | 'Laterite'
  | 'Sandy'
  | 'Loamy'
  | 'Clay'
  | 'Other / Unknown';

export type CropSeason = 'Kharif' | 'Rabi' | 'Zaid' | 'Year-round';
export type WaterAvailabilityLevel = 'Abundant' | 'Moderate' | 'Limited' | 'Stressed';
export type RainfallCondition = 'Low' | 'Normal' | 'High';

export interface CropRecommendation {
  id: string;
  name: string;
  hindiName?: string;
  season: CropSeason;
  waterRequirement: 'Low' | 'Medium' | 'High' | 'Very High';
  waterRequirementMm: number;
  suitabilityScore: number; // 0 to 100
  isRecommended: boolean;
  statusLabel: 'Highly Recommended' | 'Moderately Suitable' | 'Not Recommended' | 'High Risk';
  reason: string;
  bulletReasons?: string[];
  warnings?: string[];
  expectedYieldPotential: string;
  irrigationStrategy: string;
  groundwaterImpact: 'Positive / Low Draw' | 'Balanced' | 'High Depletion' | 'Severe Depletion Risk';
  icon: string;
  suitableSoils?: SoilType[];
  suitableSeasons?: CropSeason[];
  waterLevelPreference?: WaterAvailabilityLevel[];
  rainfallPreference?: RainfallCondition | 'Any';
  cropCategory?: string;
  rootDepth?: string;
  durationDays?: string;
}

export type AnomalyCategory =
  | 'Sudden Drop'
  | 'Sudden Rise'
  | 'Missing Data'
  | 'Possible Extraction'
  | 'Sensor Issue';

export type AnomalySeverity = 'info' | 'warning' | 'high' | 'critical' | 'low' | 'medium';

export interface AnomalyTimelinePoint {
  time: string;
  observed: number;
  expected: number;
  isAnomaly?: boolean;
}

export interface GroundwaterAnomaly {
  id: string;
  stationId: string;
  stationName: string;
  state: string;
  district: string;
  block?: string;
  latitude?: number;
  longitude?: number;
  anomalyType: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  detectedAt: string;
  magnitude: string;
  observedValue: number;
  expectedValue: number;
  deviation: string;
  previousReading: number;
  farmerExplanation: string;
  technicalDetails: string;
  suggestedAction: string;
  isResolved: boolean;
  status: 'Under Investigation' | 'Confirmed Sensor Check' | 'Monitoring' | 'Resolved';
  timelineData?: AnomalyTimelinePoint[];
  telemetryHealth?: {
    batteryVoltage: string;
    signalDbm: string;
    hardwareStatus: string;
  };
}

export interface NavigationItem {
  id: string;
  label: string;
  farmerLabel: string;
  path: string;
  iconName: string;
  badge?: string | number;
}

export type WhatsAppIntentEnum =
  | 'WATER_STATUS'
  | 'NEAREST_STATION'
  | 'CROP_RECOMMENDATION'
  | 'FORECAST'
  | 'ANOMALIES'
  | 'STATION_DETAILS'
  | 'HELP'
  | 'GREETING'
  | 'UNKNOWN';
