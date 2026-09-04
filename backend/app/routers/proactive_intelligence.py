"""
JalKrishi Proactive Intelligence API Router
============================================
Exposes proactive groundwater intelligence, early warnings, multi-signal fusion,
explainable evidence, and audience-specific action recommendations.
"""

from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Path, Depends
from app.models.schemas import (
    ProactiveOverviewResponse,
    ProactiveAlertSchema,
    ProactiveRegionSummaryResponse,
    ProactiveStationEvaluationResponse,
    ExplainabilitySchema,
    ProactiveRiskState,
    ProactiveLifecycleStatus,
    TargetAudienceEnum,
    UserProfile,
    UserRoleEnum,
)
from app.engines.proactive_intelligence import proactive_intelligence_engine
from app.routers.auth import get_current_user

router = APIRouter(prefix="/proactive", tags=["Proactive Groundwater Intelligence"])


@router.get(
    "/overview",
    response_model=ProactiveOverviewResponse,
    summary="Get Proactive Intelligence Network Overview",
    description="Returns high-level proactive risk statistics, distribution of risk states, top critical alerts, and spatial highlights.",
)
def get_proactive_overview() -> ProactiveOverviewResponse:
    return proactive_intelligence_engine.get_overview()


@router.get(
    "/alerts",
    response_model=List[ProactiveAlertSchema],
    summary="Get Proactive Early Warning Alerts",
    description="Retrieves multi-signal proactive alerts with filtering by state, district, risk state, lifecycle status, target audience, and minimum priority score.",
)
def get_proactive_alerts(
    state: Optional[str] = Query(None, description="Filter by state (e.g. Punjab, Rajasthan, Karnataka)"),
    district: Optional[str] = Query(None, description="Filter by district"),
    risk_state: Optional[ProactiveRiskState] = Query(None, description="Filter by risk state: STABLE, EMERGING_RISK, ESCALATING_RISK, CRITICAL_RISK, RECOVERY_SIGNAL, DATA_QUALITY_WARNING"),
    lifecycle_status: Optional[ProactiveLifecycleStatus] = Query(None, description="Filter by lifecycle: NEW, ACTIVE, ESCALATING, RECOVERING, RESOLVED"),
    audience: Optional[TargetAudienceEnum] = Query(None, description="Filter by audience: FARMER, OFFICIAL, HYDROLOGIST, PUBLIC"),
    min_priority: float = Query(0.0, ge=0.0, le=100.0, description="Minimum priority score (0-100)"),
    search: Optional[str] = Query(None, description="Search term across station ID, name, district, or state"),
    limit: int = Query(50, ge=1, le=500, description="Max alerts to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: Optional[UserProfile] = Depends(get_current_user),
) -> List[ProactiveAlertSchema]:
    # RBAC geographical scoping if user is an official
    filter_state = state
    filter_district = district
    if current_user and current_user.system_role in [UserRoleEnum.STATE_OFFICIAL, UserRoleEnum.DISTRICT_OFFICIAL]:
        if current_user.assigned_state and not filter_state:
            # Check if assigned_state contains a specific state name
            for s in ["Punjab", "Haryana", "Rajasthan", "Karnataka", "Gujarat", "Maharashtra", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Uttar Pradesh", "Madhya Pradesh", "Bihar", "West Bengal"]:
                if s.lower() in current_user.assigned_state.lower():
                    filter_state = s
                    break

    return proactive_intelligence_engine.get_alerts(
        state=filter_state,
        district=filter_district,
        risk_state=risk_state,
        lifecycle_status=lifecycle_status,
        audience=audience,
        min_priority=min_priority,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/regions",
    response_model=ProactiveRegionSummaryResponse,
    summary="Get Proactive Regional Risk Summaries",
    description="Aggregates proactive risk states across administrative levels (District or State) with dominant risk states, active alert counts, and action readiness.",
)
def get_proactive_regions(
    region_type: str = Query("district", pattern="^(district|state)$", description="Aggregation level: district or state"),
    state: Optional[str] = Query(None, description="Optional state filter for district rollups"),
) -> ProactiveRegionSummaryResponse:
    group_by = "STATE" if region_type.lower() == "state" else "DISTRICT"
    return proactive_intelligence_engine.get_regional_summary(group_by=group_by)


@router.get(
    "/stations/{station_id}",
    response_model=ProactiveStationEvaluationResponse,
    summary="Evaluate Specific Station for Proactive Signals",
    description="Performs multi-signal fusion on a single DWLR station, determining its risk state, confidence, evidence breakdown, and recommendations.",
)
def evaluate_station_proactive(
    station_id: str = Path(..., description="Target DWLR Station ID (e.g. DWLR-PB-001)"),
) -> ProactiveStationEvaluationResponse:
    eval_result = proactive_intelligence_engine.evaluate_station(station_id)
    if not eval_result:
        raise HTTPException(
            status_code=404,
            detail=f"Station '{station_id}' not found or telemetry data unavailable for proactive evaluation.",
        )
    return eval_result


@router.get(
    "/evidence/{alert_id}",
    response_model=ExplainabilitySchema,
    summary="Get Explainable Evidence for an Alert",
    description="Returns detailed evidence decomposition including what changed, why it matters, contributing signals, confidence metrics, and technical parameter traces.",
)
def get_alert_evidence(
    alert_id: str = Path(..., description="Alert ID (e.g. PROACTIVE-DWLR-PB-001)"),
) -> ExplainabilitySchema:
    evidence = proactive_intelligence_engine.get_alert_evidence(alert_id)
    if not evidence:
        raise HTTPException(
            status_code=404,
            detail=f"Alert '{alert_id}' not found or evidence not available.",
        )
    return evidence


@router.post(
    "/refresh",
    response_model=ProactiveOverviewResponse,
    summary="Trigger Manual Re-evaluation of Network",
    description="Forces recalculation and alert lifecycle reconciliation across all monitored DWLR stations.",
)
def trigger_proactive_refresh() -> ProactiveOverviewResponse:
    proactive_intelligence_engine.evaluate_network()
    return proactive_intelligence_engine.get_overview()
