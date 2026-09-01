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
    team: str
    problem_id: str
    hackathon: str
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
