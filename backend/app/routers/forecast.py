from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Path
from app.models.schemas import (
    StationForecastResponse,
    ForecastSummaryResponse,
    ForecastRiskRankingResponse,
    RegionalForecastResponse,
)
from app.engines.forecasting import forecasting_engine, SUPPORTED_HORIZONS

router = APIRouter(prefix="/api/v1/forecast", tags=["Groundwater Forecasting"])


@router.get(
    "/summary",
    response_model=ForecastSummaryResponse,
    summary="Get Network-Wide Forecast Depletion Indicators",
    description="Calculates forward projection metrics across all 5,260 observation wells (stations reaching critical status within 30d/60d/90d, average Days-to-Critical, and urgency brackets). Data Mode: DEMO_SIMULATION.",
)
def get_forecast_summary() -> ForecastSummaryResponse:
    return forecasting_engine.get_network_forecast_summary()


@router.get(
    "/top-risk",
    response_model=ForecastRiskRankingResponse,
    summary="Get Top At-Risk Forecast Stations",
    description="Ranks DWLR observation wells facing the most acute depletion pressure (shortest Days-to-Critical and highest risk scores).",
)
def get_top_risk_forecasts(
    limit: int = Query(10, ge=1, le=100, description="Top N high-risk stations to return (default 10)"),
    days: int = Query(30, description="Forecast horizon in days (must be 7, 30, 60, or 90)"),
) -> ForecastRiskRankingResponse:
    if days not in SUPPORTED_HORIZONS:
        raise HTTPException(
            status_code=422,
            detail=f"Horizon 'days' must be one of {SUPPORTED_HORIZONS}. Received: {days}",
        )
    return forecasting_engine.get_top_risk_forecasts(limit=limit, days=days)


@router.get(
    "/regional",
    response_model=RegionalForecastResponse,
    summary="Get State-Level 90-Day Forecast Outlooks",
    description="Calculates state-wise forward trajectories, projected drawdown changes, and water management priority actions.",
)
def get_regional_forecast(
    state: Optional[str] = Query(None, description="Optional State filter"),
    days: int = Query(90, description="Forecast horizon in days (must be 7, 30, 60, or 90)"),
) -> RegionalForecastResponse:
    if days not in SUPPORTED_HORIZONS:
        raise HTTPException(
            status_code=422,
            detail=f"Horizon 'days' must be one of {SUPPORTED_HORIZONS}. Received: {days}",
        )
    return forecasting_engine.get_regional_forecast(state=state, days=days)


@router.get(
    "/{station_id}",
    response_model=StationForecastResponse,
    summary="Get Multi-Point Forecast for a Specific Well",
    description="Generates forward trajectory points, baseline, demonstration uncertainty envelope, and Days-to-Critical for a station.",
)
def get_station_forecast(
    station_id: str = Path(..., description="Unique Station ID (e.g. DWLR-PB-001)"),
    days: int = Query(30, description="Forecast horizon in days (7, 30, 60, or 90)"),
) -> StationForecastResponse:
    if days not in SUPPORTED_HORIZONS:
        raise HTTPException(
            status_code=422,
            detail=f"Horizon 'days' must be one of {SUPPORTED_HORIZONS}. Received: {days}",
        )
    try:
        return forecasting_engine.forecast_station(station_id=station_id, horizon_days=days)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"DWLR Station '{station_id}' not found.",
        )
