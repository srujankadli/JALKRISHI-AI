"""
JalKrishi AI — Official Intelligence & Decision Support Router
--------------------------------------------------------------
Provides REST endpoints under /api/v1/official/ for government officials, hydrologists,
and water decision-makers.

Enforces Role-Based Access Control (RBAC) and geographic authorization server-side.
"""

from fastapi import APIRouter, Depends, Query, status, HTTPException
from typing import Optional

from app.models.schemas import (
    UserProfile,
    UserRoleEnum,
    OfficialOverviewResponse,
    OfficialMapResponse,
    ExplainStressResponse,
    OfficialAlertsResponse,
    RiskRankingResponse,
    NetworkHealthResponse,
    InterventionsResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
    OfficialAnalystRequest,
    OfficialAnalystResponse,
    EvidenceCenterResponse,
    RegionComparisonRequest,
    RegionComparisonResponse,
)
from app.routers.auth import get_current_active_user, require_roles
from app.engines.official_intelligence import official_intelligence_engine

router = APIRouter(prefix="/official", tags=["Official Command & Decision Center"])

OFFICIAL_ROLES = [
    UserRoleEnum.ADMIN,
    UserRoleEnum.STATE_OFFICIAL,
    UserRoleEnum.DISTRICT_OFFICIAL,
    UserRoleEnum.HYDROLOGIST_ANALYST,
    UserRoleEnum.READ_ONLY_OFFICIAL,
]


@router.get(
    "/overview",
    response_model=OfficialOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Official Command Center Overview & KPIs",
    description="Returns executive KPI summary, network coverage, critical stations, and recent anomaly count.",
)
def get_official_overview(
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> OfficialOverviewResponse:
    return official_intelligence_engine.get_overview(user)


@router.get(
    "/map",
    response_model=OfficialMapResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Official GIS Intelligence Map Features & Layers",
    description="Returns geo-spatial features and 12 intelligence layer controls scoped to authorized user geography.",
)
def get_official_map(
    layer: Optional[str] = Query(None, description="Active layer name filter"),
    region_type: Optional[str] = Query("station", description="station, district, block, state"),
    target_region: Optional[str] = Query(None, description="Optional state or district name filter"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> OfficialMapResponse:
    return official_intelligence_engine.get_intelligence_map(
        user=user, layer=layer, region_type=region_type, target_region=target_region
    )


@router.get(
    "/explain-stress",
    response_model=ExplainStressResponse,
    status_code=status.HTTP_200_OK,
    summary="Explain Area Stress ('Why is this area stressed?')",
    description="Returns an explainable evidence breakdown of primary contributors, evidence, and confidence rating.",
)
def explain_area_stress(
    area_id: str = Query(..., description="Station ID or District name"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> ExplainStressResponse:
    return official_intelligence_engine.explain_area_stress(user=user, area_id=area_id)


@router.get(
    "/alerts",
    response_model=OfficialAlertsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Groundwater Early Warning System Alerts",
    description="Returns early warning alerts with severity ratings, evidence, confidence, and decision support recommendations.",
)
def get_official_alerts(
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> OfficialAlertsResponse:
    return official_intelligence_engine.get_early_warning_alerts(user)


@router.get(
    "/risk-ranking",
    response_model=RiskRankingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get District / State Risk Index Leaderboard",
    description="Ranks regions using a transparent 5-component risk index with sorting options.",
)
def get_risk_ranking(
    level: str = Query("district", description="district or state"),
    sort_by: str = Query("risk_score", description="risk_score, fastest_decline, lowest_confidence, recharge_opportunity"),
    target_region: Optional[str] = Query(None, description="Optional region filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=500, description="Items per page"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> RiskRankingResponse:
    return official_intelligence_engine.get_risk_ranking(
        user=user, level=level, sort_by=sort_by, target_region=target_region, page=page, page_size=page_size
    )


@router.get(
    "/trends",
    status_code=status.HTTP_200_OK,
    summary="Get Official Time-Series Trend Analytics",
    description="Returns observed vs model forecast time-series analytics across 7d, 30d, 90d, 1y.",
)
def get_official_trends(
    station_id: Optional[str] = Query(None, description="Specific DWLR station ID"),
    range_days: int = Query(30, description="Time range in days (7, 30, 90, 365)"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
):
    return official_intelligence_engine.get_trends_analytics(
        user=user, station_id=station_id, range_days=range_days
    )


@router.get(
    "/network",
    response_model=NetworkHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Get DWLR Network Telemetry Health",
    description="Dedicated monitoring endpoint for online, delayed, and offline telemetry stations.",
)
def get_network_health(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=500, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query across ID, name, district, state, block"),
    state: Optional[str] = Query(None, description="State filter"),
    district: Optional[str] = Query(None, description="District filter"),
    block: Optional[str] = Query(None, description="Block filter"),
    risk: Optional[str] = Query(None, description="Risk level filter (critical, warning, healthy)"),
    telemetry_status: Optional[str] = Query(None, description="Telemetry status filter (online, delayed, offline)"),
    sensor_status: Optional[str] = Query(None, description="Sensor status filter (CALIBRATED, CALIBRATION_DUE, NO_PING)"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> NetworkHealthResponse:
    return official_intelligence_engine.get_network_health(
        user=user,
        page=page,
        page_size=page_size,
        search=search,
        state=state,
        district=district,
        block=block,
        risk=risk,
        telemetry_status=telemetry_status,
        sensor_status=sensor_status,
    )


@router.get(
    "/interventions",
    response_model=InterventionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Recharge & Intervention Opportunity Candidates",
    description="Identifies candidate areas for artificial recharge, monitoring expansion, and agricultural water management.",
)
def get_interventions(
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> InterventionsResponse:
    return official_intelligence_engine.get_interventions(user)


@router.post(
    "/scenario",
    response_model=ScenarioSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate What-If Hydro-Agronomic Scenario",
    description="Simulates hypothetical variations in rainfall, agricultural demand, and recharge interventions. Explicitly labeled hypothetical output.",
)
def simulate_scenario(
    request: ScenarioSimulationRequest,
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> ScenarioSimulationResponse:
    if user.system_role == UserRoleEnum.READ_ONLY_OFFICIAL and False:
        # Read-Only officials can execute non-mutating scenario simulations
        pass
    return official_intelligence_engine.simulate_scenario(user=user, req=request)


@router.post(
    "/analyst",
    response_model=OfficialAnalystResponse,
    status_code=status.HTTP_200_OK,
    summary="Query Official AI Intelligence Analyst",
    description="Grounded AI question answering using authorized JalKrishi data and intelligence engines without hallucination.",
)
def query_ai_analyst(
    request: OfficialAnalystRequest,
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> OfficialAnalystResponse:
    return official_intelligence_engine.query_ai_analyst(user=user, req=request)


@router.get(
    "/evidence",
    response_model=EvidenceCenterResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Data & Evidence Provider Status",
    description="Reports status of data providers (Active Simulation, Unconfigured Satellite / Government APIs).",
)
def get_evidence_center(
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> EvidenceCenterResponse:
    return official_intelligence_engine.get_evidence_center(user)


@router.post(
    "/compare",
    response_model=RegionComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare Groundwater Metrics Between Two Regions",
    description="Provides side-by-side metric comparison and model interpretation between two districts or states.",
)
def compare_regions(
    request: RegionComparisonRequest,
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> RegionComparisonResponse:
    return official_intelligence_engine.compare_regions(user=user, req=request)
