"""
JalKrishi AI — Satellite Groundwater Router
-------------------------------------------
API endpoints for satellite-assisted groundwater estimation, spatial coverage lookup,
indicator inspection, provider source status, and subsystem health check.
"""

from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException, status

from app.config import settings
from app.engines.satellite_groundwater import satellite_groundwater_engine
from app.models.schemas import (
    SatelliteGroundwaterEstimateResponse,
    SatelliteGroundwaterCoverageResponse,
    IndicatorItemSchema,
    SatelliteProviderSourceSchema,
)

router = APIRouter(
    prefix="/satellite-groundwater",
    tags=["Satellite-Assisted Groundwater Intelligence"],
)


def validate_coordinates(lat: float, lon: float):
    """Validate latitude and longitude ranges."""
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid latitude value '{lat}'. Latitude must be between -90.0 and +90.0 degrees.",
        )
    if not (-180.0 <= lon <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid longitude value '{lon}'. Longitude must be between -180.0 and +180.0 degrees.",
        )


@router.get(
    "/estimate",
    response_model=SatelliteGroundwaterEstimateResponse,
    summary="Get Satellite-Assisted Groundwater Estimate",
    description=(
        "Returns a spatial groundwater stress estimate for any latitude/longitude coordinate. "
        "Evaluates nearby DWLR well telemetry, remote-sensing indicators, and simulated weather signals. "
        "Explicitly labelled as Satellite-Assisted Estimate, NOT direct well measurement."
    ),
)
def get_satellite_groundwater_estimate(
    latitude: float = Query(..., description="Target latitude (-90.0 to +90.0)"),
    longitude: float = Query(..., description="Target longitude (-180.0 to +180.0)"),
    radius_km: Optional[float] = Query(
        None, gt=0, le=500, description="Custom DWLR coverage radius in kilometers (default: 15.0 km)"
    ),
):
    validate_coordinates(latitude, longitude)
    try:
        estimate = satellite_groundwater_engine.estimate_groundwater_condition(
            lat=latitude, lon=longitude, radius_km=radius_km
        )
        return estimate
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing satellite-assisted groundwater estimate: {str(e)}",
        )


@router.get(
    "/coverage",
    response_model=SatelliteGroundwaterCoverageResponse,
    summary="Check DWLR vs Satellite Coverage",
    description="Determines whether a coordinate is covered by direct DWLR well observations or requires satellite-assisted spatial estimation.",
)
def get_groundwater_coverage(
    latitude: float = Query(..., description="Target latitude (-90.0 to +90.0)"),
    longitude: float = Query(..., description="Target longitude (-180.0 to +180.0)"),
    radius_km: Optional[float] = Query(
        None, gt=0, le=500, description="Custom DWLR coverage radius in kilometers (default: 15.0 km)"
    ),
):
    validate_coordinates(latitude, longitude)
    try:
        coverage = satellite_groundwater_engine.get_coverage(
            lat=latitude, lon=longitude, radius_km=radius_km
        )
        return coverage
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error determining groundwater spatial coverage: {str(e)}",
        )


@router.get(
    "/indicators",
    response_model=Dict[str, IndicatorItemSchema],
    summary="Get Satellite & Environmental Indicators",
    description="Returns detailed breakdown of all remote sensing, thermal, moisture, weather, and DWLR indicators for a coordinate.",
)
def get_satellite_indicators(
    latitude: float = Query(..., description="Target latitude (-90.0 to +90.0)"),
    longitude: float = Query(..., description="Target longitude (-180.0 to +180.0)"),
):
    validate_coordinates(latitude, longitude)
    try:
        estimate = satellite_groundwater_engine.estimate_groundwater_condition(
            lat=latitude, lon=longitude
        )
        return estimate.indicators
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching satellite indicators: {str(e)}",
        )


@router.get(
    "/sources",
    response_model=List[SatelliteProviderSourceSchema],
    summary="Get Architected Data Provider Sources",
    description="Returns registration and live configuration status for all satellite, weather, and terrestrial storage adapters.",
)
def get_satellite_provider_sources():
    return satellite_groundwater_engine.get_registered_providers()


@router.get(
    "/health",
    summary="Satellite Groundwater Subsystem Health Check",
    description="Returns operational status of the satellite groundwater estimation engine.",
)
def get_satellite_subsystem_health():
    return {
        "status": "HEALTHY",
        "subsystem": "Satellite-Assisted Groundwater Engine",
        "coverage_radius_km": settings.DWLR_COVERAGE_RADIUS_KM,
        "data_mode": settings.DATA_MODE,
        "adapters_count": len(satellite_groundwater_engine.get_registered_providers()),
        "disclaimer": (
            "Subsystem operational. Satellite-assisted estimates do not claim direct well-level measurement."
        ),
    }
