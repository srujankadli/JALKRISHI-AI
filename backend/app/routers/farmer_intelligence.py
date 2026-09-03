"""
JalKrishi AI — Unified Farmer Intelligence Router (Phase O)
------------------------------------------------------------
API endpoints providing unified groundwater decision-support, crop recommendations,
and irrigation guidance for any location in India, whether covered by direct DWLR
well observations (Mode A) or Satellite-Assisted Spatial Estimates (Mode B).
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from app.engines.farmer_intelligence import farmer_intelligence_engine
from app.routers.satellite_groundwater import validate_coordinates
from app.models.schemas import GroundwaterIntelligenceSchema

router = APIRouter(
    prefix="/intelligence",
    tags=["Unified Farmer Groundwater Intelligence"],
)


@router.get(
    "/unified",
    response_model=GroundwaterIntelligenceSchema,
    summary="Get Unified Groundwater & Farmer Intelligence",
    description=(
        "Returns complete hydrogeological decision-support intelligence for any lat/lon coordinate. "
        "Automatically determines DWLR vs Satellite-Assisted coverage and produces unified groundwater signals, "
        "30-day forecast outlook, spatial risk signals, crop recommendations, and irrigation guidance."
    ),
)
def get_unified_groundwater_intelligence(
    latitude: float = Query(..., description="Target latitude (-90.0 to +90.0)"),
    longitude: float = Query(..., description="Target longitude (-180.0 to +180.0)"),
    radius_km: Optional[float] = Query(
        None, gt=0, le=500, description="Custom DWLR coverage radius in km (default 15.0 km)"
    ),
):
    validate_coordinates(latitude, longitude)
    try:
        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=latitude, lon=longitude, radius_km=radius_km
        )
        return intel
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing unified groundwater intelligence: {str(e)}",
        )


@router.get(
    "/crop-advice",
    summary="Get Crop Advice for Location (DWLR or Satellite)",
    description="Returns water-smart crop recommendations for any location using direct DWLR or satellite-assisted water availability signals.",
)
def get_crop_advice_for_location(
    latitude: float = Query(..., description="Target latitude (-90.0 to +90.0)"),
    longitude: float = Query(..., description="Target longitude (-180.0 to +180.0)"),
):
    validate_coordinates(latitude, longitude)
    try:
        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=latitude, lon=longitude
        )
        return {
            "latitude": latitude,
            "longitude": longitude,
            "coverage_type": intel.coverage_type,
            "groundwater_condition": intel.groundwater_condition,
            "crop_implications": intel.crop_implications,
            "recommended_crops": intel.recommended_crops,
            "confidence": intel.confidence,
            "disclaimer": intel.disclaimer,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating crop advice: {str(e)}",
        )


@router.get(
    "/irrigation-advice",
    summary="Get Irrigation Advice for Location (DWLR or Satellite)",
    description="Returns water-use and irrigation caution guidance for any location based on direct DWLR or satellite-assisted groundwater signals.",
)
def get_irrigation_advice_for_location(
    latitude: float = Query(..., description="Target latitude (-90.0 to +90.0)"),
    longitude: float = Query(..., description="Target longitude (-180.0 to +180.0)"),
):
    validate_coordinates(latitude, longitude)
    try:
        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=latitude, lon=longitude
        )
        return {
            "latitude": latitude,
            "longitude": longitude,
            "coverage_type": intel.coverage_type,
            "groundwater_condition": intel.groundwater_condition,
            "rainfall_signal": intel.rainfall_signal,
            "irrigation_implications": intel.irrigation_implications,
            "confidence": intel.confidence,
            "disclaimer": intel.disclaimer,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating irrigation advice: {str(e)}",
        )
