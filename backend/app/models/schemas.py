from datetime import datetime
from enum import Enum
from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field


# ==========================================
# 1. Enums Matching TypeScript Types
# ==========================================

class StationStatus(str, Enum):
    HEALTHY = "healthy"
    MODERATE = "moderate"
    WARNING = "warning"
    CRITICAL = "critical"


class TrendDirection(str, Enum):
    RISING = "rising"
    STABLE = "stable"
    FALLING = "falling"


class TelemetryStatus(str, Enum):
    ONLINE = "online"
    DELAYED = "delayed"
    OFFLINE = "offline"


class SoilType(str, Enum):
    ALLUVIAL = "Alluvial"
    BLACK = "Black"
    RED = "Red"
    LATERITE = "Laterite"
    SANDY = "Sandy"
    LOAMY = "Loamy"
    CLAY = "Clay"


class CropSeason(str, Enum):
    KHARIF = "Kharif"
    RABI = "Rabi"
    ZAID = "Zaid"
    YEAR_ROUND = "Year-round"


class WaterAvailabilityLevel(str, Enum):
    ABUNDANT = "Abundant"
    MODERATE = "Moderate"
    LIMITED = "Limited"
    STRESSED = "Stressed"


class RainfallCondition(str, Enum):
    LOW = "Low"
    NORMAL = "Normal"
    HIGH = "High"


class AnomalyCategory(str, Enum):
    SUDDEN_DROP = "Sudden Groundwater Drop"
    POSSIBLE_EXTRACTION = "Possible Abnormal Extraction"
    MISSING_DATA = "Missing / Delayed Data"
    SENSOR_ISSUE = "Potential Sensor Error"
    SUDDEN_RISE = "Sudden Groundwater Rise"


class AnomalySeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    WARNING = "Warning"
    INFO = "Info"


# ==========================================
# 2. Base Health & Metadata Schemas
# ==========================================

class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Service health state")
    app_name: str
    version: str
    data_mode: str
    timestamp: str
    disclaimer: str


class DataSourceAdapterInfo(BaseModel):
    name: str
    provider: str
    adapter_status: str = Field("Configured / Ingestion Ready (Demo Mode)", description="Adapter integration status")
    endpoint_type: str


class VersionResponse(BaseModel):
    app_name: str
    tagline: str
    version: str
    organization: Optional[str] = "JalKrishi AI Intelligence Division"
    team: Optional[str] = "JalKrishi Team"
    problem_id: Optional[str] = "JALKRISHI-CORE"
    hackathon: Optional[str] = "Production Platform"
    data_mode: str
    api_prefix: str
    disclaimer: str
    target_pipeline_layers: List[str]
    data_source_adapters: List[DataSourceAdapterInfo]


# ==========================================
# 3. Station & Telemetry Schemas
# ==========================================

class HistoricalReadingSchema(BaseModel):
    date: str
    waterLevel: float = Field(..., description="Water depth in mbgl (meters below ground level)")
    rainfall: Optional[float] = None


class DWLRStationSchema(BaseModel):
    id: str
    stationCode: str
    stationName: str
    state: str
    district: str
    block: str
    latitude: float
    longitude: float
    waterLevel: float
    previousWaterLevel: float
    seasonalAverage: float
    criticalThreshold: float
    riskScore: float
    status: StationStatus
    trend: TrendDirection
    trendRateMetersPerMonth: float
    daysToCritical: Optional[int] = None
    batteryLevel: int
    telemetryStatus: TelemetryStatus
    lastUpdated: str
    soilType: Optional[str] = None
    aquiferType: Optional[str] = None
    historicalData: Optional[List[HistoricalReadingSchema]] = None
    farmerSummary: Optional[str] = None
    actionableAdvice: Optional[str] = None


class StationListResponse(BaseModel):
    stations: List[DWLRStationSchema]
    total: int
    limit: int
    offset: int
    filters_applied: Dict[str, Any]
    data_mode: str
    disclaimer: str


class StationSearchResultResponse(BaseModel):
    stations: List[DWLRStationSchema]
    total_matches: int
    query: str
    data_mode: str


class StationSummaryResponse(BaseModel):
    totalStations: int
    healthyCount: int
    moderateCount: int
    warningCount: int
    criticalCount: int
    avgDepthMbgl: float
    avgRiskScore: float
    statesCount: int
    telemetryHealth: Dict[str, Any]
    data_mode: str
    disclaimer: str


class StationSummarySchema(BaseModel):
    totalStationsMonitored: int
    activeInScope: int
    healthyCount: int
    moderateCount: int
    warningCount: int
    criticalCount: int
    avgDepthMbgl: float
    waterLevelChangePercentage: float
    criticalAlertsCount: int
    telemetryOnlineRate: float
    averageRainfallMm: float
    rainfallDeviationPct: float


# ==========================================
# 4. Analytics Schemas (Phase C)
# ==========================================

class NetworkAnalyticsSummary(BaseModel):
    total_stations: int
    healthy_stations: int
    moderate_stations: int
    warning_stations: int
    critical_stations: int
    healthy_percentage: float
    moderate_percentage: float
    warning_percentage: float
    critical_percentage: float
    average_groundwater_depth: float
    average_risk_score: float
    falling_trend_count: int
    stable_trend_count: int
    rising_trend_count: int
    telemetry_health: Dict[str, Any]
    data_mode: str
    disclaimer: str


class StateAnalyticsRow(BaseModel):
    state: str
    station_count: int
    average_depth: float
    average_risk_score: float
    healthy_count: int
    moderate_count: int
    warning_count: int
    critical_count: int
    healthy_percentage: float
    warning_percentage: float
    critical_percentage: float
    rising_count: int
    stable_count: int
    falling_count: int
    dominant_trend: str
    risk_category: str
    priority: str


class StateAnalyticsResponse(BaseModel):
    states: List[StateAnalyticsRow]
    total_states: int
    filters_applied: Dict[str, Any]
    data_mode: str


class StateRiskRankingRow(BaseModel):
    rank: int
    state: str
    risk_score: float
    risk_category: str
    critical_count: int
    warning_count: int
    falling_percentage: float
    priority: str
    formula: str


class StateRiskRankingResponse(BaseModel):
    rankings: List[StateRiskRankingRow]
    total_ranked: int
    data_mode: str
    disclaimer: str


class DistrictAnalyticsRow(BaseModel):
    state: str
    district: str
    station_count: int
    average_depth: float
    average_risk_score: float
    healthy_count: int
    moderate_count: int
    warning_count: int
    critical_count: int
    critical_percentage: float
    warning_percentage: float
    dominant_trend: str
    falling_percentage: float
    risk_category: str
    days_to_critical_summary: Dict[str, Any]


class DistrictAnalyticsResponse(BaseModel):
    districts: List[DistrictAnalyticsRow]
    total_districts: int
    filters_applied: Dict[str, Any]
    data_mode: str


class DistrictRiskRankingRow(BaseModel):
    rank: int
    district: str
    state: str
    risk_score: float
    risk_category: str
    critical_count: int
    critical_percentage: float
    warning_count: int
    falling_percentage: float
    priority: str


class DistrictRiskRankingResponse(BaseModel):
    rankings: List[DistrictRiskRankingRow]
    total_ranked: int
    data_mode: str
    disclaimer: str


class TrendSummaryResponse(BaseModel):
    period_days: int
    average_start_depth: float
    average_end_depth: float
    average_change: float
    trend_direction: str
    station_count: int
    filters_applied: Dict[str, Any]
    data_mode: str
    disclaimer: str


# Legacy compat schemas
class StateAnalyticsRowSchema(BaseModel):
    state: str
    totalStations: int
    avgDepth: float
    healthyPct: int
    warningPct: int
    criticalPct: int
    avgRisk: float
    trend: str


class DistrictAnalyticsRowSchema(BaseModel):
    district: str
    state: str
    totalStations: int
    avgDepth: float
    riskScore: float
    criticalCount: int
    warningCount: int
    trend: str
    avgDaysToCritical: Union[int, str]


class NetworkAnalyticsSummarySchema(BaseModel):
    totalStations: int
    healthyCount: int
    moderateCount: int
    warningCount: int
    criticalCount: int
    avgDepth: float
    avgRiskScore: float
    reportingRatePct: float


# ==========================================
# 5. Forecasting Schemas (Phase D)
# ==========================================

class ForecastPointResponse(BaseModel):
    date: str
    predicted_depth: float
    baseline_depth: float
    lower_bound: float
    upper_bound: float
    day_offset: int
    expected_rainfall_mm: float = 0.0
    change_label: Optional[str] = None


class StationForecastResponse(BaseModel):
    station_id: str
    station_name: str
    state: str
    district: str
    current_depth: float
    critical_threshold: float
    current_status: str
    current_trend: str
    risk_score: float
    horizon_days: int
    historical_points_used: int
    daily_change_m: float
    monthly_change_m: float
    forecast_points: List[ForecastPointResponse]
    confidence: float
    days_to_critical: Optional[int] = None
    days_to_critical_status: str
    days_to_critical_urgency: str
    forecast_risk: str
    farmer_guidance: str
    methodology: str
    data_mode: str
    disclaimer: str


class ForecastSummaryResponse(BaseModel):
    total_stations: int
    stations_with_forecast: int
    stations_missing_history: int
    stations_projected_worsening: int
    stations_projected_improving: int
    stations_projected_stable: int
    stations_reaching_critical_30d: int
    stations_reaching_critical_60d: int
    stations_reaching_critical_90d: int
    average_days_to_critical: Optional[float] = None
    days_to_critical_breakdown: Dict[str, int]
    data_mode: str
    disclaimer: str


class ForecastRiskRow(BaseModel):
    rank: int
    station_id: str
    station_name: str
    state: str
    district: str
    current_depth: float
    daily_change_m: float
    days_to_critical: Optional[int] = None
    risk_score: float
    forecast_risk: str
    priority: str


class ForecastRiskRankingResponse(BaseModel):
    rankings: List[ForecastRiskRow]
    total_ranked: int
    horizon_days: int
    data_mode: str
    disclaimer: str


class RegionalForecastRow(BaseModel):
    state: str
    station_count: int
    average_current_depth: float
    average_daily_change: float
    projected_change: float
    forecast_direction: str
    critical_within_horizon: int
    risk_category: str
    expected_rainfall_mm: float
    priority_action: str


class RegionalForecastResponse(BaseModel):
    regions: List[RegionalForecastRow]
    total_regions: int
    horizon_days: int
    data_mode: str
    disclaimer: str


# Legacy forecasting schemas
class ForecastPointSchema(BaseModel):
    date: str
    predictedLevel: float
    upperConfidence: float
    lowerConfidence: float
    expectedRainfallMm: float


class StationForecastSchema(BaseModel):
    stationId: str
    stationName: str
    district: str
    state: str
    currentLevel: float
    projectedLevel30d: float
    projectedDaysToCritical: Optional[int] = None
    confidenceScore: float
    farmerGuidance: str
    forecastPoints: List[ForecastPointSchema]


# ==========================================
# 6. Anomaly Detection Schemas (Phase E)
# ==========================================

class TimelinePointResponse(BaseModel):
    timestamp: str
    observed: float
    expected: float
    deviation: float
    is_anomaly: bool


class AnomalyResponse(BaseModel):
    anomaly_id: str
    station_id: str
    station_name: str
    state: str
    district: str
    block: Optional[str] = None
    category: str
    severity: str
    detected_at: str
    observed_value: float
    expected_value: float
    deviation: str
    deviation_unit: str
    description: str
    why_it_matters: str
    recommended_action: str
    verification_status: str
    evidence: Dict[str, Any]
    timeline: Optional[List[TimelinePointResponse]] = None
    data_mode: str


class AnomalyListResponse(BaseModel):
    anomalies: List[AnomalyResponse]
    total: int
    limit: int
    offset: int
    filters_applied: Dict[str, Any]
    data_mode: str
    disclaimer: str


class AnomalySummaryResponse(BaseModel):
    total_anomalies: int
    critical_count: int
    high_count: int
    warning_count: int
    info_count: int
    sudden_drop_count: int
    sudden_rise_count: int
    possible_extraction_count: int
    missing_data_count: int
    sensor_error_count: int
    stations_affected: int
    data_mode: str
    disclaimer: str


class AnomalyDistributionResponse(BaseModel):
    by_category: Dict[str, int]
    by_severity: Dict[str, int]
    total: int
    data_mode: str


class StateAnomalySummaryRow(BaseModel):
    state: str
    total_anomalies: int
    critical_count: int
    high_count: int
    warning_count: int
    info_count: int
    primary_category: str
    stations_affected: int


class StateAnomalySummaryResponse(BaseModel):
    states: List[StateAnomalySummaryRow]
    total_states: int
    data_mode: str
    disclaimer: str


# Legacy anomaly schemas
class AnomalyTimelinePointSchema(BaseModel):
    time: str
    observed: float
    expected: float
    isAnomaly: Optional[bool] = None


class GroundwaterAnomalySchema(BaseModel):
    id: str
    stationId: str
    stationName: str
    state: str
    district: str
    block: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    anomalyType: str
    category: str
    severity: str
    detectedAt: str
    magnitude: str
    observedValue: float
    expectedValue: float
    deviation: str
    previousReading: float
    farmerExplanation: str
    technicalDetails: str
    suggestedAction: str
    isResolved: bool
    status: str
    timelineData: Optional[List[AnomalyTimelinePointSchema]] = None
    telemetryHealth: Optional[dict] = None


# ==========================================
# 7. Crop Recommendation Schemas (Phase F)
# ==========================================

class CropScoringBreakdown(BaseModel):
    soil_score: float
    water_score: float
    season_score: float
    rainfall_score: float
    groundwater_score: float
    overall_score: float


class CropRecommendation(BaseModel):
    rank: int
    crop_id: str
    crop_name: str
    local_name: Optional[str] = None
    overall_score: float
    tier: str
    water_requirement_mm: int
    maturity_days: str
    scores: CropScoringBreakdown
    aquifer_impact: str
    reasons: List[str]
    farmer_advice: str
    estimated_water_demand_m3: Optional[float] = None


class NotRecommendedCrop(BaseModel):
    crop_id: str
    crop_name: str
    local_name: Optional[str] = None
    overall_score: float
    water_requirement_mm: int
    aquifer_impact: str
    reason: str
    farmer_warning: str


class GroundwaterContext(BaseModel):
    station_count_used: int
    station_id: Optional[str] = None
    station_name: Optional[str] = None
    average_depth_mbgl: float
    average_risk_score: float
    dominant_trend: str
    critical_station_percentage: float
    forecast_context: str


class CropRecommendationRequest(BaseModel):
    state: str
    district: str
    station_id: Optional[str] = None
    soil_type: SoilType
    season: CropSeason
    rainfall_condition: RainfallCondition
    water_availability: WaterAvailabilityLevel
    farm_area_acres: Optional[float] = Field(None, gt=0, description="Farm plot area in acres (must be > 0 if specified)")
    irrigation_method: Optional[str] = Field(None, description="Irrigation method: Drip, Sprinkler, Flood, Rainfed")
    farmer_priority: Optional[str] = Field(None, description="Priority: Water Saving, Yield, Low Risk, Balanced")


class CropRecommendationResponse(BaseModel):
    farm_profile: Dict[str, Any]
    groundwater_context: GroundwaterContext
    top_recommendations: List[CropRecommendation]
    not_recommended: List[NotRecommendedCrop]
    all_evaluated_crops: Optional[List[CropRecommendation]] = None
    scoring_weights: Dict[str, float]
    methodology: str
    data_mode: str
    disclaimer: str


class CropComparisonRequest(BaseModel):
    state: str
    district: str
    station_id: Optional[str] = None
    soil_type: SoilType
    season: CropSeason
    rainfall_condition: RainfallCondition
    water_availability: WaterAvailabilityLevel
    crop_ids: List[str] = Field(..., min_length=1, description="List of crop IDs to compare")
    farm_area_acres: Optional[float] = Field(None, gt=0, description="Farm plot area in acres")
    irrigation_method: Optional[str] = None


class CropComparisonRow(BaseModel):
    crop_id: str
    crop_name: str
    local_name: Optional[str] = None
    water_requirement_mm: int
    maturity_days: str
    yield_potential: str
    drought_tolerance: str
    aquifer_impact: str
    overall_score: float
    tier: str
    scores: CropScoringBreakdown
    estimated_water_demand_m3: Optional[float] = None


class CropComparisonResponse(BaseModel):
    comparisons: List[CropComparisonRow]
    total_compared: int
    groundwater_context: GroundwaterContext
    data_mode: str
    disclaimer: str


class CropProfileResponse(BaseModel):
    crop_id: str
    crop_name: str
    local_name: Optional[str] = None
    category: str
    seasons: List[CropSeason]
    suitable_soils: List[SoilType]
    water_requirement_mm: int
    water_demand_tier: str
    maturity_days: str
    drought_tolerance: str
    root_zone_depth_cm: str
    rainfall_preference: RainfallCondition
    aquifer_impact: str
    yield_potential: str
    description: str
    farmer_notes: str


class CropCatalogResponse(BaseModel):
    crops: List[CropProfileResponse]
    total_crops: int
    data_mode: str
    disclaimer: str


class CropMethodologyResponse(BaseModel):
    scoring_weights: Dict[str, float]
    tier_thresholds: Dict[str, str]
    supported_soils: List[str]
    supported_seasons: List[str]
    supported_water_levels: List[str]
    supported_rainfall_conditions: List[str]
    limitations: List[str]
    data_mode: str
    disclaimer: str


# Legacy crop recommendation schemas
class CropRecommendationSchema(BaseModel):
    id: str
    name: str
    hindiName: Optional[str] = None
    season: CropSeason
    waterRequirement: str
    waterRequirementMm: int
    suitabilityScore: int
    isRecommended: bool
    statusLabel: str
    reason: str
    bulletReasons: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    expectedYieldPotential: str
    irrigationStrategy: str
    groundwaterImpact: str
    icon: str
    suitableSoils: Optional[List[SoilType]] = None
    suitableSeasons: Optional[List[CropSeason]] = None
    waterLevelPreference: Optional[List[WaterAvailabilityLevel]] = None
    rainfallPreference: Optional[Union[RainfallCondition, str]] = None
    cropCategory: Optional[str] = None
    rootDepth: Optional[str] = None
    durationDays: Optional[str] = None


class CropEvaluationCriteriaSchema(BaseModel):
    soilType: SoilType
    season: CropSeason
    waterAvailability: WaterAvailabilityLevel
    rainfallCondition: RainfallCondition
    groundwaterTrend: Optional[TrendDirection] = None
    state: Optional[str] = None
    district: Optional[str] = None


class CropRecommendationResultSchema(BaseModel):
    top3: List[CropRecommendationSchema]
    allRecommended: List[CropRecommendationSchema]
    notRecommended: List[CropRecommendationSchema]
    criteria: CropEvaluationCriteriaSchema
    scoringModelSummary: str


# ==========================================
# 8. WhatsApp Conversational Schemas
# ==========================================

class WhatsAppIntentEnum(str, Enum):
    WATER_STATUS = "WATER_STATUS"
    NEAREST_STATION = "NEAREST_STATION"
    CROP_RECOMMENDATION = "CROP_RECOMMENDATION"
    FORECAST = "FORECAST"
    ANOMALIES = "ANOMALIES"
    STATION_DETAILS = "STATION_DETAILS"
    HELP = "HELP"
    GREETING = "GREETING"
    UNKNOWN = "UNKNOWN"


class WhatsAppAction(BaseModel):
    label: str
    action: str
    payload: Optional[Dict[str, Any]] = None


class WhatsAppWebhookRequest(BaseModel):
    from_number: Optional[str] = Field(None, description="Simulated sender phone identifier")
    message: str = Field(..., description="Farmer conversational text query or shortcut")
    language: Optional[str] = Field("en", description="Preferred language ('en' | 'hi')")
    conversation_id: Optional[str] = Field(None, description="In-memory conversation session ID")
    latitude: Optional[float] = Field(None, description="Optional GPS latitude for nearest well")
    longitude: Optional[float] = Field(None, description="Optional GPS longitude for nearest well")


class WhatsAppWebhookResponse(BaseModel):
    success: bool = True
    conversation_id: str
    intent: WhatsAppIntentEnum
    language: str
    reply: str
    actions: List[WhatsAppAction] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = None
    data_mode: str = "DEMO_SIMULATION"
    disclaimer: str = "Demo Simulation Mode: Simulated farmer chatbot response based on 5,260-station DWLR model."


# ==========================================
# 9. Data Pipeline, Quality & Ingestion Schemas
# ==========================================

class DataSourceEnum(str, Enum):
    DEMO_SIMULATION = "DEMO_SIMULATION"
    CSV_IMPORT = "CSV_IMPORT"
    INDIA_WRIS = "INDIA_WRIS"
    CGWB = "CGWB"
    IMD = "IMD"


class QualityValidationStatus(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"


class DataQualityReport(BaseModel):
    valid: bool
    records_checked: int
    valid_records: int
    invalid_records: int
    warnings_count: int
    errors_count: int
    quality_score: float = Field(..., description="Overall data quality score (0.0 - 100.0%)")
    duplicate_station_ids: int
    invalid_coordinates: int
    negative_depths: int
    missing_required_fields: int
    issues_list: List[str] = Field(default_factory=list)
    data_mode: str = "DEMO_SIMULATION"
    timestamp: str


class DWLRNormalizedRecord(BaseModel):
    station_id: str
    station_code: Optional[str] = None
    station_name: str
    latitude: float
    longitude: float
    state: str
    district: str
    block: Optional[str] = None
    water_depth_mbgl: float
    status: StationStatus
    trend: TrendDirection
    risk_score: float
    telemetry_status: TelemetryStatus
    battery_voltage: Optional[float] = None
    signal_strength_dbm: Optional[int] = None
    soil_type: Optional[str] = None
    aquifer_type: Optional[str] = None
    critical_depth_mbgl: Optional[float] = None
    source: DataSourceEnum = DataSourceEnum.DEMO_SIMULATION
    data_mode: str = "DEMO_SIMULATION"


class DataPipelineStatusResponse(BaseModel):
    active_source: str
    data_mode: str
    station_count: int
    telemetry_record_count: int
    last_refresh: str
    quality_score: float
    validation_status: str
    quality_report: DataQualityReport
    available_sources: List[str]
    future_sources: List[str]
    disclaimer: str


class DataRefreshResponse(BaseModel):
    refresh_started: bool
    source: str
    records_loaded: int
    quality_score: float
    timestamp: str
    data_mode: str
    disclaimer: str


class CSVValidationRequest(BaseModel):
    csv_content: str = Field(..., description="Raw text content of uploaded CSV")
    source_label: Optional[str] = "Uploaded CSV"


class CSVValidationResponse(BaseModel):
    success: bool
    records_parsed: int
    valid_records: int
    invalid_records: int
    quality_report: DataQualityReport
    sample_records: List[Dict[str, Any]] = Field(default_factory=list)
    data_mode: str = "DEMO_SIMULATION"
    disclaimer: str = "Validation Sandbox Mode: Previews CSV compliance without altering the active 5,260-station network."


# ==========================================
# 10. AI Executive Intelligence Schemas (Phase L)
# ==========================================

class ExecutiveInsightSummaryResponse(BaseModel):
    headline: str
    current_situation: str
    top_priority_region: str
    why_it_matters: str
    forecast_outlook: str
    recommended_farmer_action: str
    confidence_level: str  # HIGH | MODERATE | LIMITED
    confidence_explanation: str
    network_metrics: Dict[str, Any]
    top_priority_regions: List[Dict[str, Any]] = Field(default_factory=list)
    cross_system_links: List[Dict[str, Any]] = Field(default_factory=list)
    data_mode: str = "DEMO_SIMULATION"
    disclaimer: str = "Demo Simulation Mode: AI insights synthesized deterministically from 5,260-station DWLR model."


class StationInsightResponse(BaseModel):
    station_id: str
    station_name: str
    district: str
    state: str
    current_depth: float
    status: str
    trend: str
    risk_score: float
    headline: str
    why_it_matters: str
    forecast_summary: str
    days_to_critical: Optional[int] = None
    anomaly_notes: Optional[str] = None
    recommended_crops: List[str] = Field(default_factory=list)
    action_plan: str
    confidence_level: str = "HIGH"
    data_mode: str = "DEMO_SIMULATION"
    disclaimer: str = "Demo Simulation Mode: Station intelligence generated deterministically."


# ==========================================
# 11. Authentication & Security Schemas
# ==========================================

class LoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Email address or username")
    password: str = Field(..., description="User password")
    role: Optional[str] = Field("hydrogeologist", description="Role selection")


class UserRoleEnum(str, Enum):
    FARMER = "FARMER"
    READ_ONLY_OFFICIAL = "READ_ONLY_OFFICIAL"
    DISTRICT_OFFICIAL = "DISTRICT_OFFICIAL"
    STATE_OFFICIAL = "STATE_OFFICIAL"
    HYDROLOGIST_ANALYST = "HYDROLOGIST_ANALYST"
    ADMIN = "ADMIN"


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    role: str
    system_role: UserRoleEnum = Field(UserRoleEnum.FARMER, description="Authoritative backend role")
    organization: str
    department: str
    assigned_state: Optional[str] = "All India"
    avatar_initials: str = "JA"
    phone: Optional[str] = None
    preferred_language: str = "en"
    farm_latitude: Optional[float] = None
    farm_longitude: Optional[float] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    data_mode: str = "DEMO_SIMULATION"


# ==========================================
# 12. Satellite-Assisted Groundwater Schemas
# ==========================================

class IndicatorItemSchema(BaseModel):
    name: str = Field(..., description="Name of indicator")
    value: Union[float, str] = Field(..., description="Observed or simulated indicator value")
    unit: str = Field(..., description="Unit of measurement")
    status: str = Field(..., description="Status e.g. NORMAL, ELEVATED_STRESS, CRITICAL")
    source: str = Field(..., description="Source e.g. REMOTE_SENSING_SIMULATION")
    confidence: str = Field("MEDIUM", description="Confidence level: HIGH | MEDIUM | LOW")
    description: str = Field(..., description="Plain language explanation of signal")


class SatelliteGroundwaterEstimateResponse(BaseModel):
    latitude: float = Field(..., description="Target query latitude")
    longitude: float = Field(..., description="Target query longitude")
    dwlr_available: bool = Field(..., description="Whether direct DWLR observation is available within coverage radius")
    nearest_station_id: Optional[str] = Field(None, description="Station ID of nearest DWLR well")
    nearest_station_name: Optional[str] = Field(None, description="Station name of nearest DWLR well")
    nearest_station_distance_km: float = Field(..., description="Distance to nearest DWLR station in kilometers")
    estimation_mode: str = Field(..., description="DIRECT_DWLR or SATELLITE_ASSISTED")
    groundwater_condition: str = Field(..., description="LOW_STRESS | MODERATE_STRESS | HIGH_STRESS | CRITICAL_STRESS")
    groundwater_stress_score: float = Field(..., description="Stress index from 0.0 (safe) to 1.0 (critical)")
    estimated_trend: str = Field(..., description="RISING | STABLE | FALLING")
    confidence: str = Field(..., description="HIGH | MEDIUM | LOW")
    confidence_score: float = Field(..., description="Confidence index from 0.0 to 1.0")
    rainfall_condition: str = Field("NORMAL", description="Rainfall signal: DEFICIT | NORMAL | EXCESS")
    rainfall_probability: float = Field(..., description="Estimated rainfall probability (0-100%)")
    rainfall_mm_estimate: float = Field(..., description="Estimated 30-day precipitation in mm")
    recharge_outlook: str = Field(..., description="Recharge outlook: POOR | MODERATE | GOOD | EXCELLENT")
    indicators: Dict[str, IndicatorItemSchema] = Field(default_factory=dict, description="Supporting indicators")
    data_sources: List[str] = Field(default_factory=list, description="Data sources used for estimation")
    timestamp: str = Field(..., description="ISO timestamp of estimate calculation")
    disclaimer: str = Field(..., description="Scientific disclaimer on satellite estimation vs direct measurement")
    data_mode: str = Field("DEMO_SIMULATION", description="Data provenance mode")


class SatelliteGroundwaterCoverageResponse(BaseModel):
    latitude: float
    longitude: float
    dwlr_available: bool
    coverage_type: str  # Direct DWLR Measurement | Satellite-Assisted Estimate
    radius_km: float
    nearest_station_id: Optional[str] = None
    nearest_station_distance_km: float
    confidence_level: str
    data_mode: str = "DEMO_SIMULATION"


class SatelliteProviderSourceSchema(BaseModel):
    provider_name: str
    category: str
    status: str  # CONFIGURED | NOT_CONFIGURED | SIMULATED
    description: str
    disclaimer: str = "Demo Simulation Mode: Authenticated session established under JalKrishi AI security policy."


# ==========================================
# 13. Unified Groundwater & Farmer Intelligence Schemas
# ==========================================

class GroundwaterIntelligenceSchema(BaseModel):
    latitude: float = Field(..., description="Query latitude")
    longitude: float = Field(..., description="Query longitude")
    coverage_type: str = Field(..., description="Direct DWLR Measurement | Satellite-Assisted Estimate")
    estimation_mode: str = Field(..., description="DIRECT_DWLR | SATELLITE_ASSISTED")
    groundwater_condition: str = Field(..., description="HEALTHY | LOW_STRESS | MODERATE_STRESS | HIGH_STRESS | CRITICAL_STRESS")
    current_groundwater_signal: str = Field(..., description="Human-readable depth or stress signal")
    trend: str = Field(..., description="RISING | STABLE | FALLING")
    forecast_summary: str = Field(..., description="Unified 30-day hydrogeological forecast or outlook summary")
    forecast_30d_water_level: Optional[float] = Field(None, description="Inferred or predicted water level depth in mbgl if available")
    estimated_depth_range: Optional[str] = Field(None, description="Depth range e.g. 13-17 m bgl (Model-Derived Estimate)")
    forecast_confidence: str = Field(..., description="HIGH | MEDIUM | LOW (propagated uncertainty)")
    stress_score: float = Field(..., description="Aquifer stress index 0.0 to 1.0")
    recharge_outlook: str = Field(..., description="EXCELLENT | GOOD | MODERATE | POOR")
    recharge_score: float = Field(..., description="Infiltration score 0.0 to 1.0")
    nearest_station_id: Optional[str] = Field(None, description="Station code of nearest DWLR well")
    nearest_station_name: Optional[str] = Field(None, description="Station name of nearest DWLR well")
    nearest_station_distance_km: float = Field(..., description="Geodesic distance to nearest DWLR well")
    remote_sensing_indicators: Dict[str, IndicatorItemSchema] = Field(default_factory=dict, description="Supporting remote sensing signals")
    rainfall_signal: str = Field(..., description="30-day precipitation status")
    risk_alerts: List[str] = Field(default_factory=list, description="Direct anomaly flags or spatial risk signals")
    crop_implications: str = Field(..., description="Agronomic water availability implications for cropping")
    irrigation_implications: str = Field(..., description="Water conservation & irrigation schedule caution")
    farmer_recommendations: List[str] = Field(default_factory=list, description="3-5 concise actionable farmer recommendations")
    recommended_crops: List[str] = Field(default_factory=list, description="Top water-smart crop recommendations")
    confidence: str = Field(..., description="Overall pipeline confidence: HIGH | MEDIUM | LOW")
    confidence_score: float = Field(..., description="Overall confidence index 0.0 to 1.0")
    data_sources: List[str] = Field(default_factory=list, description="Data provenance list")
    timestamp: str = Field(..., description="ISO timestamp")
    disclaimer: str = Field(..., description="Data provenance & scientific transparency disclaimer")
    data_mode: str = Field("DEMO_SIMULATION", description="Data mode")
    location_info: Optional[LocationInfoSchema] = Field(None, description="Resolved location metadata")
    coverage_info: Optional[CoverageInfoSchema] = Field(None, description="Coverage mode & distance metadata")
    groundwater_info: Optional[GroundwaterLevelSchema] = Field(None, description="Direct or model-derived groundwater level metadata")
    provenance_info: Optional[ProvenanceInfoSchema] = Field(None, description="Data provenance metadata")


# ==========================================
# 14. Data Provider Resilience Layer Schemas
# ==========================================

class ProviderTypeEnum(str, Enum):
    GOVERNMENT_API = "GOVERNMENT_API"
    DATASET_UPLOAD = "DATASET_UPLOAD"
    REMOTE_SENSING = "REMOTE_SENSING"
    WEATHER_PROVIDER = "WEATHER_PROVIDER"
    SIMULATION = "SIMULATION"


class ProviderStatusEnum(str, Enum):
    LIVE = "LIVE"
    ACTIVE = "ACTIVE"
    AVAILABLE = "AVAILABLE"
    AVAILABLE_CAPABILITY = "AVAILABLE_CAPABILITY"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    FALLBACK = "FALLBACK"
    ACTIVE_SIMULATION = "ACTIVE_SIMULATION"
    ERROR = "ERROR"


class ProviderMetadataSchema(BaseModel):
    provider_name: str = Field(..., description="Name of data provider")
    provider_type: ProviderTypeEnum = Field(..., description="Type category of data provider")
    status: ProviderStatusEnum = Field(..., description="Operational status of data provider")
    last_updated: str = Field(..., description="Human-readable timestamp of last update")
    coverage: str = Field(..., description="Geographic or spatial coverage summary")
    capabilities: List[str] = Field(default_factory=list, description="Supported provider capabilities")
    message: str = Field(..., description="Transparent status message")
    data_mode: str = Field("DEMO_SIMULATION", description="Data mode")


class NormalizedDWLRObservation(BaseModel):
    station_id: str = Field(..., description="Normalized station code")
    station_name: str = Field(..., description="Normalized station name")
    state: str = Field(..., description="State name")
    district: str = Field(..., description="District name")
    block: str = Field(..., description="Block name")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    timestamp: str = Field(..., description="Observation timestamp")
    groundwater_level_mbgl: float = Field(..., description="Depth in metres below ground level")
    risk_score: float = Field(..., description="Risk score 0.0 to 1.0")
    status: str = Field(..., description="Station status")
    provider_source: str = Field(..., description="Name of provider supplying this reading")
    data_mode: str = Field("DEMO_SIMULATION", description="Data mode")


class SystemProviderMatrixResponse(BaseModel):
    active_provider: ProviderMetadataSchema = Field(..., description="Currently active resolved DWLR provider")
    providers: List[ProviderMetadataSchema] = Field(default_factory=list, description="All registered system data providers")
    fallback_chain: List[str] = Field(default_factory=list, description="Ordered resolution fallback chain")
    total_providers: int = Field(..., description="Count of registered providers")
    data_mode: str = Field("DEMO_SIMULATION", description="Data mode")
    disclaimer: str = Field(..., description="Data honesty disclaimer")


# ==========================================
# 15. Multilingual & Voice Assistant Schemas
# ==========================================

class LanguageConfigSchema(BaseModel):
    language_code: str = Field(..., description="ISO language code (e.g. en, hi, bn, te, mr, ta, gu, kn, ml, pa, or, as, ur)")
    display_name: str = Field(..., description="English display name")
    native_name: str = Field(..., description="Native language script name")
    speech_supported: bool = Field(True, description="Whether speech recognition is supported")
    translation_supported: bool = Field(True, description="Whether translation is supported")
    tts_supported: bool = Field(True, description="Whether text-to-speech is supported")
    status: str = Field("CONFIGURED", description="Provider status for this language")


# ==========================================
# 15. Dynamic Location & Evidence Schemas
# ==========================================

class LocationInfoSchema(BaseModel):
    name: str = Field(..., description="Resolved location or region name")
    district: Optional[str] = Field(None, description="District name if available")
    state: Optional[str] = Field(None, description="State name if available")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")


class CoverageInfoSchema(BaseModel):
    mode: str = Field(..., description="DIRECT_DWLR or SATELLITE_ASSISTED")
    nearest_station_id: Optional[str] = Field(None, description="Nearest DWLR station code")
    nearest_station_name: Optional[str] = Field(None, description="Nearest DWLR station name")
    distance_km: float = Field(..., description="Geodesic distance to nearest station in km")


class GroundwaterLevelSchema(BaseModel):
    level_value: Optional[float] = Field(None, description="Direct depth observation in m bgl if available")
    level_min: Optional[float] = Field(None, description="Estimated lower bound depth in m bgl for satellite mode")
    level_max: Optional[float] = Field(None, description="Estimated upper bound depth in m bgl for satellite mode")
    unit: str = Field("m bgl", description="Measurement unit")
    is_direct_measurement: bool = Field(..., description="True if direct DWLR observation, False if satellite model estimate")
    confidence: str = Field(..., description="Confidence level: HIGH, MEDIUM, LOW")


class ProvenanceInfoSchema(BaseModel):
    primary_source: str = Field(..., description="DWLR or SATELLITE_REMOTE_SENSING")
    data_mode: str = Field("REFERENCE_SIMULATION", description="Data provenance mode")


class VoiceQueryRequest(BaseModel):
    query: str = Field(..., description="Spoken or typed farmer query string")
    station_id: Optional[str] = Field(None, description="Selected DWLR station code if available")
    latitude: Optional[float] = Field(None, description="Farm latitude coordinate")
    longitude: Optional[float] = Field(None, description="Farm longitude coordinate")
    location_query: Optional[str] = Field(None, description="Explicit or extracted location name query")
    language: str = Field("en", description="Farmer requested/interface language code")
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio bytes if available")
    session_id: Optional[str] = Field("default", description="Session identifier for multi-turn farmer context")
    context_location: Optional[str] = Field(None, description="Current established conversational location context")
    context_crop: Optional[str] = Field(None, description="Current established conversational crop context")


class VoiceQueryResponse(BaseModel):
    query_text: str = Field(..., description="Transcribed or received query text")
    detected_language: str = Field(..., description="Language code detected or requested")
    farmer_response_language: str = Field(..., description="Language code of returned response")
    intent: str = Field("GROUNDWATER_LEVEL", description="Classified farmer intent category")
    intent_category: Optional[str] = Field("GROUNDWATER", description="WEATHER, CROP, IRRIGATION, RECHARGE, FORECAST, RISK, ANOMALY, DWLR, GROUNDWATER")
    response_type: str = Field("INTELLIGENCE", description="CONVERSATIONAL or INTELLIGENCE")
    text_response: str = Field(..., description="Formatted farmer-facing natural language response")
    intelligence: Optional[GroundwaterIntelligenceSchema] = Field(None, description="Structured hydrogeological decision support")
    location: Optional[LocationInfoSchema] = Field(None, description="Resolved location metadata")
    coverage: Optional[CoverageInfoSchema] = Field(None, description="Coverage mode & distance metadata")
    groundwater: Optional[GroundwaterLevelSchema] = Field(None, description="Direct or model-derived groundwater level metadata")
    provenance: Optional[ProvenanceInfoSchema] = Field(None, description="Data provenance metadata")
    weather_info: Optional[Dict[str, Any]] = Field(None, description="Structured weather & rainfall metadata")
    crop_info: Optional[Dict[str, Any]] = Field(None, description="Structured crop recommendation metadata")
    irrigation_info: Optional[Dict[str, Any]] = Field(None, description="Structured irrigation guidance metadata")
    recharge_info: Optional[Dict[str, Any]] = Field(None, description="Structured recharge guidance metadata")
    audio_url: Optional[str] = Field(None, description="Synthesized TTS audio URL if available")
    voice_playback_available: bool = Field(False, description="Whether spoken audio playback is active")
    stt_provider_status: str = Field("NOT_CONFIGURED", description="Speech-to-Text provider status")
    tts_provider_status: str = Field("NOT_CONFIGURED", description="Text-to-Speech provider status")
    translation_provider_status: str = Field("LOCAL_CORE_TRANSLATIONS", description="Translation provider status")
    data_mode: str = Field("DEMO_SIMULATION", description="Data mode")
    disclaimer: str = Field(..., description="Data honesty disclaimer")
    location_required: bool = Field(False, description="Whether location is required to proceed")
    awaiting_location: bool = Field(False, description="Whether the assistant is awaiting location input")
    pending_intent: Optional[str] = Field(None, description="Pending intent awaiting location clarification")
    crop: Optional[str] = Field(None, description="Established conversational crop context")
    farmer_name: Optional[str] = Field(None, description="Established farmer name")


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize")
    language: str = Field("en", description="Target language code")


class TTSResponse(BaseModel):
    text: str = Field(..., description="Input text")
    language: str = Field(..., description="Language code")
    audio_url: Optional[str] = Field(None, description="Audio URL if synthesized")
    status: str = Field("NOT_CONFIGURED", description="TTS provider status")
    message: str = Field(..., description="Status message")


# ==========================================
# 11. Official Command & Decision Center Schemas
# ==========================================

class OfficialOverviewKPI(BaseModel):
    monitoring_stations: int
    reporting_stations: int
    data_coverage_pct: float
    critical_stations: int
    high_risk_areas: int
    declining_zones: int
    improving_zones: int
    recharge_opportunity_zones: int
    forecast_stress_areas: int
    data_mode: str
    disclaimer: str


class OfficialOverviewResponse(BaseModel):
    timestamp: str
    user_role: str
    assigned_scope: str
    kpis: OfficialOverviewKPI
    recent_anomalies_count: int
    high_risk_districts: List[str]
    disclaimer: str


class OfficialMapFeature(BaseModel):
    id: str
    name: str
    type: str
    latitude: float
    longitude: float
    groundwater_level: Optional[float]
    groundwater_condition: str
    trend: str
    risk_score: float
    anomaly_status: str
    rainfall_signal: str
    recharge_opportunity: str
    crop_demand_signal: str
    forecast_stress: str
    confidence: str
    data_source: str


class OfficialMapResponse(BaseModel):
    timestamp: str
    user_scope: str
    features: List[OfficialMapFeature]
    available_layers: List[str]
    data_mode: str
    disclaimer: str


class StressContributor(BaseModel):
    factor: str
    weight_pct: int
    description: str
    evidence_type: str


class ExplainStressResponse(BaseModel):
    area_id: str
    area_name: str
    risk_level: str
    risk_score: float
    primary_contributors: List[StressContributor]
    supporting_evidence: List[str]
    confidence: str
    data_mode: str
    model_interpretation_note: str


class OfficialAlert(BaseModel):
    alert_id: str
    severity: str
    location_name: str
    district: str
    state: str
    detected_signal: str
    evidence: List[str]
    trend: str
    confidence: str
    suggested_official_action: str
    timestamp: str


class OfficialAlertsResponse(BaseModel):
    timestamp: str
    user_scope: str
    total_alerts: int
    alerts: List[OfficialAlert]
    disclaimer: str


class RiskRankingComponent(BaseModel):
    name: str
    weight_pct: int
    score: float
    description: str


class RiskRankingItem(BaseModel):
    rank: int
    region_name: str
    parent_region: str
    risk_score: float
    risk_category: str
    trend: str
    components: List[RiskRankingComponent]
    confidence: str
    monitoring_gap_score: float
    recharge_score: float


class RiskRankingResponse(BaseModel):
    timestamp: str
    user_scope: str
    methodology: str
    page: int = 1
    page_size: int = 25
    total_pages: int = 1
    total_items: int = 0
    rankings: List[RiskRankingItem]
    disclaimer: str


class NetworkStationItem(BaseModel):
    station_id: str
    station_name: str
    district: str
    state: str
    latest_reading: Optional[float]
    unit: str
    timestamp: str
    telemetry_status: str
    data_quality_status: str
    battery_level: Optional[int] = None
    sensor_status: Optional[str] = "CALIBRATED"
    trend: str
    risk_score: float
    data_source: str


class NetworkHealthResponse(BaseModel):
    timestamp: str
    user_scope: str
    total_stations: int
    online_stations: int
    delayed_stations: int
    offline_stations: int
    missing_pings_count: int
    reporting_pct: float
    page: int = 1
    page_size: int = 25
    total_pages: int = 1
    total_items: int = 0
    stations: List[NetworkStationItem]
    disclaimer: str


class InterventionOpportunity(BaseModel):
    id: str
    area_name: str
    district: str
    state: str
    category: str
    groundwater_condition: str
    rainfall_signal: str
    recharge_signal: str
    trend: str
    risk_level: str
    confidence: str
    potential_intervention: str
    disclaimer: str


class InterventionsResponse(BaseModel):
    timestamp: str
    user_scope: str
    total_opportunities: int
    opportunities: List[InterventionOpportunity]
    disclaimer: str


class ScenarioSimulationRequest(BaseModel):
    rainfall_pct_change: float = Field(0.0, description="Hypothetical rainfall change (-20 to +20)")
    crop_demand_pct_change: float = Field(0.0, description="Hypothetical agricultural demand change (-20 to +20)")
    recharge_intervention_level: str = Field("None", description="None, Low, Medium, High")
    target_region: Optional[str] = Field(None, description="Optional target state/district")


class ScenarioSimulationResponse(BaseModel):
    timestamp: str
    target_region: str
    inputs: Dict[str, Any]
    simulated_stress_score: float
    baseline_stress_score: float
    delta_pct: float
    simulated_forecast_trajectory: List[Dict[str, Any]]
    recharge_opportunity_impact: str
    water_pressure_category: str
    disclaimer: str


class OfficialAnalystRequest(BaseModel):
    query: str = Field(..., description="Natural language question for AI Analyst")
    language: str = Field("en", description="Target response language")
    target_region: Optional[str] = Field(None, description="Optional filter region")


class OfficialAnalystResponse(BaseModel):
    query: str
    answer: str
    evidence: List[str]
    confidence: str
    data_source: str
    data_mode: str
    relevant_region: str
    disclaimer: str


class EvidenceProviderStatus(BaseModel):
    provider_name: str
    status: str
    description: str
    last_check: str
    data_mode: str


class EvidenceCenterResponse(BaseModel):
    timestamp: str
    active_data_mode: str
    providers: List[EvidenceProviderStatus]
    disclaimer: str


class RegionComparisonRequest(BaseModel):
    region_a: str = Field(..., description="First region name (State or District)")
    region_b: str = Field(..., description="Second region name (State or District)")


class RegionComparisonResponse(BaseModel):
    timestamp: str
    region_a: Dict[str, Any]
    region_b: Dict[str, Any]
    comparative_interpretation: str
    confidence: str
    disclaimer: str



# ==========================================
# 18. Proactive Groundwater Intelligence & Early Warning Schemas
# ==========================================

class ProactiveRiskState(str, Enum):
    STABLE = "STABLE"
    EMERGING_RISK = "EMERGING_RISK"
    ESCALATING_RISK = "ESCALATING_RISK"
    CRITICAL_RISK = "CRITICAL_RISK"
    RECOVERY_SIGNAL = "RECOVERY_SIGNAL"
    DATA_QUALITY_WARNING = "DATA_QUALITY_WARNING"


class ProactiveLifecycleStatus(str, Enum):
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    ESCALATING = "ESCALATING"
    RECOVERING = "RECOVERING"
    RESOLVED = "RESOLVED"


class ProactiveSignalType(str, Enum):
    GROUNDWATER_DECLINE = "GROUNDWATER_DECLINE"
    GROUNDWATER_RISE = "GROUNDWATER_RISE"
    ACCELERATING_DECLINE = "ACCELERATING_DECLINE"
    FORECASTED_STRESS = "FORECASTED_STRESS"
    ANOMALY_PERSISTENCE = "ANOMALY_PERSISTENCE"
    RAINFALL_DEFICIT = "RAINFALL_DEFICIT"
    RECHARGE_SIGNAL = "RECHARGE_SIGNAL"
    SATELLITE_VEGETATION_STRESS = "SATELLITE_VEGETATION_STRESS"
    SATELLITE_TEMPERATURE_STRESS = "SATELLITE_TEMPERATURE_STRESS"
    WATER_STORAGE_STRESS = "WATER_STORAGE_STRESS"
    DATA_QUALITY_DEGRADATION = "DATA_QUALITY_DEGRADATION"


class TargetAudienceEnum(str, Enum):
    FARMER = "FARMER"
    OFFICIAL = "OFFICIAL"
    HYDROLOGIST = "HYDROLOGIST"


class EvidenceSignalSchema(BaseModel):
    signal_type: ProactiveSignalType
    label: str
    value: str
    direction: str  # DECLINING | RISING | STABLE | NEUTRAL
    severity: str  # CRITICAL | HIGH | MODERATE | LOW | INFO
    confidence: str  # HIGH | MODERATE | LOW
    evidence_source: str
    provenance: str = "JalKrishi Reference Simulation Dataset"
    evaluation_period: str = "Current Reference Analysis"
    timestamp: str


class ExplainabilitySchema(BaseModel):
    observation: str = Field(..., description="Direct measurable observation or retrieved data point")
    signal: str = Field(..., description="Interpretation of the rate/direction of change")
    risk: str = Field(..., description="Identified hydrological or agricultural stress level")
    recommendation: str = Field(..., description="Tailored primary action")
    confidence: str = Field(..., description="Confidence level: HIGH | MODERATE | LOW")
    what_changed: str = Field(..., description="Concise human-readable explanation of what changed")
    why_it_matters: str = Field(..., description="Concise explanation of agronomic or hydrological impact")
    evidence_summary: str = Field(..., description="Summary of multi-signal supporting evidence")
    what_to_do: str = Field(..., description="Clear actionable next steps")
    technical_evidence: Optional[Dict[str, Any]] = Field(None, description="Detailed telemetry/model parameters for officials/hydrologists")


class AudienceActionSchema(BaseModel):
    target_audience: TargetAudienceEnum
    action_title: str
    action_description: str
    priority: str  # IMMEDIATE | HIGH | MEDIUM | ROUTINE
    category: str  # IRRIGATION | CROP | WELL_MONITORING | FIELD_VERIFICATION | TELEMETRY_CHECK


class ProactiveAlertSchema(BaseModel):
    alert_id: str
    station_id: str
    station_name: str
    state: str
    district: str
    block: Optional[str] = ""
    latitude: float
    longitude: float
    risk_state: ProactiveRiskState
    lifecycle_status: ProactiveLifecycleStatus
    priority_score: float = Field(..., description="Deterministic priority score 0.0 to 100.0")
    confidence: str  # HIGH | MODERATE | LOW
    multi_signal_confirmed: bool = Field(False, description="True if supported by >= 2 independent evidence sources")
    signal_count: int = 1
    persistence_cycles: int = 1
    evidence_signals: List[EvidenceSignalSchema]
    explainability: ExplainabilitySchema
    audience_actions: List[AudienceActionSchema]
    notification_candidate: bool = False
    notification_priority: str = "MEDIUM"
    notification_message: str = ""
    first_detected_at: str
    last_evaluated_at: str
    data_mode: str = "DEMO_SIMULATION"
    provenance: str = "JalKrishi Reference Simulation Dataset"


class ProactiveOverviewResponse(BaseModel):
    timestamp: str
    data_mode: str = "DEMO_SIMULATION"
    provenance: str = "JalKrishi Reference Simulation Dataset"
    total_active_alerts: int
    critical_risk_count: int
    escalating_risk_count: int
    emerging_risk_count: int
    recovery_signal_count: int
    data_quality_warning_count: int
    stable_monitored_count: int
    top_priority_alerts: List[ProactiveAlertSchema]
    state_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    disclaimer: str = "JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model."


class ProactiveRegionSummary(BaseModel):
    region_name: str
    region_type: str  # STATE | DISTRICT
    total_monitored_nodes: int
    active_alerts_count: int
    critical_count: int
    escalating_count: int
    emerging_count: int
    recovery_count: int
    data_quality_count: int
    primary_risk_state: ProactiveRiskState
    regional_stress_summary: str
    top_recommended_action: str


class ProactiveRegionSummaryResponse(BaseModel):
    timestamp: str
    total_regions: int
    regions: List[ProactiveRegionSummary]
    disclaimer: str


class ProactiveStationEvaluationResponse(BaseModel):
    station_id: str
    station_name: str
    state: str
    district: str
    block: str
    latitude: float
    longitude: float
    current_water_level: float
    trend_rate_m_per_month: float
    forecast_trajectory_summary: str
    proactive_alert: Optional[ProactiveAlertSchema]
    is_alert_active: bool
    evaluation_timestamp: str
    data_mode: str = "DEMO_SIMULATION"
    provenance: str = "JalKrishi Reference Simulation Dataset"
