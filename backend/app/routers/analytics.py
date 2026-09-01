from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.models.schemas import (
    NetworkAnalyticsSummary,
    StateAnalyticsResponse,
    StateRiskRankingResponse,
    DistrictAnalyticsResponse,
    DistrictRiskRankingResponse,
    TrendSummaryResponse,
)
from app.engines.analytics import analytics_engine

router = APIRouter(prefix="/api/v1/analytics", tags=["Groundwater Analytics"])


@router.get(
    "/summary",
    response_model=NetworkAnalyticsSummary,
    summary="Get Network-Wide Telemetry & Depletion Summary",
    description="Calculates real-time national or filtered aggregated statistics (station status breakdowns, percentages, average depth, and telemetry health). Data Mode: DEMO_SIMULATION.",
)
def get_network_summary(
    state: Optional[str] = Query(None, description="Optional State filter (e.g. Punjab)"),
    district: Optional[str] = Query(None, description="Optional District filter (e.g. Sangrur)"),
    status: Optional[str] = Query(None, description="Optional Status filter: healthy, moderate, warning, critical"),
    trend: Optional[str] = Query(None, description="Optional Trend filter: rising, stable, falling"),
    risk: Optional[str] = Query(None, description="Optional Risk band: low, medium, high, critical"),
) -> NetworkAnalyticsSummary:
    return analytics_engine.get_network_summary(
        state=state,
        district=district,
        status=status,
        trend=trend,
        risk=risk,
    )


@router.get(
    "/states",
    response_model=StateAnalyticsResponse,
    summary="Get State-Level Groundwater Analytics",
    description="Calculates state-wise aggregations including station counts, average depths, risk categories, and dominant trends.",
)
def get_state_analytics(
    state: Optional[str] = Query(None, description="Filter to a specific state"),
    status: Optional[str] = Query(None, description="Filter station population by status"),
    trend: Optional[str] = Query(None, description="Filter station population by trend"),
    risk: Optional[str] = Query(None, description="Filter station population by risk band"),
) -> StateAnalyticsResponse:
    return analytics_engine.get_state_analytics(
        state=state,
        status=status,
        trend=trend,
        risk=risk,
    )


@router.get(
    "/states/risk-ranking",
    response_model=StateRiskRankingResponse,
    summary="Get Regional State Risk Ranking",
    description="Calculates a transparent weighted demonstration regional risk score across states to prioritize water resource interventions.",
)
def get_state_risk_ranking(
    status: Optional[str] = Query(None, description="Filter by status tier"),
    trend: Optional[str] = Query(None, description="Filter by trend direction"),
    risk: Optional[str] = Query(None, description="Filter by risk category"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum states to return"),
) -> StateRiskRankingResponse:
    return analytics_engine.get_state_risk_ranking(
        status=status,
        trend=trend,
        risk=risk,
        limit=limit,
    )


@router.get(
    "/districts",
    response_model=DistrictAnalyticsResponse,
    summary="Get District-Level Groundwater Analytics",
    description="Calculates district-wise breakdowns of depth, status percentages, and observed drawdown metrics.",
)
def get_district_analytics(
    state: Optional[str] = Query(None, description="Filter districts within a specific state"),
    district: Optional[str] = Query(None, description="Filter to a specific district name"),
    status: Optional[str] = Query(None, description="Filter by status tier"),
    trend: Optional[str] = Query(None, description="Filter by trend direction"),
    risk: Optional[str] = Query(None, description="Filter by risk band"),
) -> DistrictAnalyticsResponse:
    return analytics_engine.get_district_analytics(
        state=state,
        district=district,
        status=status,
        trend=trend,
        risk=risk,
    )


@router.get(
    "/districts/risk-ranking",
    response_model=DistrictRiskRankingResponse,
    summary="Get Top At-Risk Districts",
    description="Ranks districts by acute aquifer depletion risk (default top 10).",
)
def get_district_risk_ranking(
    state: Optional[str] = Query(None, description="Filter within a state"),
    status: Optional[str] = Query(None, description="Filter by status tier"),
    trend: Optional[str] = Query(None, description="Filter by trend direction"),
    risk: Optional[str] = Query(None, description="Filter by risk band"),
    limit: int = Query(10, ge=1, le=100, description="Top N districts to return (default 10)"),
) -> DistrictRiskRankingResponse:
    return analytics_engine.get_district_risk_ranking(
        state=state,
        status=status,
        trend=trend,
        risk=risk,
        limit=limit,
    )


@router.get(
    "/trend",
    response_model=TrendSummaryResponse,
    summary="Get Observed Historical Groundwater Trajectory",
    description="Summarizes observed historical trajectory for 7, 30, or 90-day timeframes.",
)
def get_groundwater_trend(
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    days: int = Query(30, description="Timeframe in days (must be 7, 30, or 90)"),
) -> TrendSummaryResponse:
    if days not in [7, 30, 90]:
        raise HTTPException(
            status_code=422,
            detail="Timeframe 'days' parameter must be exactly 7, 30, or 90.",
        )
    return analytics_engine.get_groundwater_trend_summary(
        state=state,
        district=district,
        days=days,
    )
