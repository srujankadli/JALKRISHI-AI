from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Path, Depends, status
from app.models.schemas import (
    StationForecastResponse,
    LocationForecastResponse,
    ForecastSummaryResponse,
    ForecastRiskRankingResponse,
    RegionalForecastResponse,
    UserProfile,
    UserRoleEnum,
)
from app.engines.forecasting import forecasting_engine, SUPPORTED_HORIZONS
from app.pipeline.location_resolver import resolve_location
from app.routers.auth import require_roles

router = APIRouter(prefix="/api/v1/forecast", tags=["Groundwater Forecasting"])

OFFICIAL_ROLES = [
    UserRoleEnum.ADMIN,
    UserRoleEnum.STATE_OFFICIAL,
    UserRoleEnum.DISTRICT_OFFICIAL,
    UserRoleEnum.HYDROLOGIST_ANALYST,
    UserRoleEnum.READ_ONLY_OFFICIAL,
]


@router.get(
    "/location",
    response_model=LocationForecastResponse,
    summary="Get Location-Aware Farmer Groundwater Forecast",
    description="Calculates localized multi-horizon forecast trajectory, Days-to-Critical, and farm profile advice for any coordinate/district in India.",
)
def get_location_forecast(
    location: Optional[str] = Query(None, description="Location search query (e.g. Nashik, Kochi, Jaipur, Ballari)"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    days: int = Query(30, description="Forecast horizon in days (7, 30, 60, or 90)"),
    crop: Optional[str] = Query(None, description="Current or planned crop"),
    water_source: Optional[str] = Query(None, description="Primary water source (e.g. Borewell, Canal, Rain-fed)"),
    groundwater_dependence: Optional[str] = Query(None, description="Groundwater reliance level (High, Moderate, Low)"),
    water_reliability: Optional[str] = Query(None, description="Water reliability (e.g. Perennial, Seasonal, Deficit)"),
) -> LocationForecastResponse:
    if days not in SUPPORTED_HORIZONS:
        raise HTTPException(
            status_code=422,
            detail=f"Horizon 'days' must be one of {SUPPORTED_HORIZONS}. Received: {days}",
        )

    if not ((location and location.strip()) or (lat is not None and lon is not None)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates or a verified location query are required. Please provide a valid location.",
        )

    resolved = resolve_location(
        location_query=location,
        latitude=lat,
        longitude=lon,
    )

    if not resolved.is_resolved or resolved.latitude is None or resolved.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resolved.error_message or "We couldn't verify that location. Please enter a valid village, town, city, district, state, or 6-digit PIN code.",
        )

    return forecasting_engine.forecast_location(
        location_query=location,
        latitude=lat,
        longitude=lon,
        horizon_days=days,
        crop=crop,
        water_source=water_source,
        groundwater_dependence=groundwater_dependence,
        water_reliability=water_reliability,
    )


@router.get(
    "/summary",
    response_model=ForecastSummaryResponse,
    summary="Get Network-Wide Forecast Depletion Indicators (Official Only)",
    description="Calculates forward projection metrics across all 5,260 observation wells. Enforces Official RBAC.",
)
def get_forecast_summary(
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
) -> ForecastSummaryResponse:
    return forecasting_engine.get_network_forecast_summary()


@router.get(
    "/top-risk",
    response_model=ForecastRiskRankingResponse,
    summary="Get Top At-Risk Forecast Stations (Official Only)",
    description="Ranks DWLR observation wells facing the most acute depletion pressure. Enforces Official RBAC.",
)
def get_top_risk_forecasts(
    limit: int = Query(10, ge=1, le=100, description="Top N high-risk stations to return (default 10)"),
    days: int = Query(30, description="Forecast horizon in days (must be 7, 30, 60, or 90)"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
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
    summary="Get State-Level 90-Day Forecast Outlooks (Official Only)",
    description="Calculates state-wise forward trajectories and water management priority actions. Enforces Official RBAC.",
)
def get_regional_forecast(
    state: Optional[str] = Query(None, description="Optional State filter"),
    days: int = Query(90, description="Forecast horizon in days (must be 7, 30, 60, or 90)"),
    user: UserProfile = Depends(require_roles(OFFICIAL_ROLES)),
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

