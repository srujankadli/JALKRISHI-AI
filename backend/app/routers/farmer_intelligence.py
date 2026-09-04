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
from app.engines.farmer_dialogue_manager import farmer_dialogue_manager
from app.routers.satellite_groundwater import validate_coordinates
from app.models.schemas import GroundwaterIntelligenceSchema, VoiceQueryRequest, VoiceQueryResponse

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
    latitude: Optional[float] = Query(None, description="Target latitude (-90.0 to +90.0)"),
    longitude: Optional[float] = Query(None, description="Target longitude (-180.0 to +180.0)"),
    radius_km: Optional[float] = Query(
        None, gt=0, le=500, description="Custom DWLR coverage radius in km (default 15.0 km)"
    ),
):
    lat = latitude if latitude is not None else 20.5937
    lon = longitude if longitude is not None else 78.9629
    validate_coordinates(lat, lon)
    try:
        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=lat, lon=lon, radius_km=radius_km
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
    latitude: Optional[float] = Query(None, description="Target latitude (-90.0 to +90.0)"),
    longitude: Optional[float] = Query(None, description="Target longitude (-180.0 to +180.0)"),
):
    lat = latitude if latitude is not None else 20.5937
    lon = longitude if longitude is not None else 78.9629
    validate_coordinates(lat, lon)
    try:
        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=lat, lon=lon
        )
        return {
            "latitude": lat,
            "longitude": lon,
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


@router.post(
    "/conversation",
    response_model=VoiceQueryResponse,
    summary="Farmer Conversational AI & Dialogue Manager Endpoint",
    description="Multi-turn conversational dialogue endpoint with slot context, location-first resolution, minimum questions, and data provenance.",
)
def handle_farmer_conversation(request: VoiceQueryRequest) -> VoiceQueryResponse:
    raw_query = request.query.strip() if request.query else ""
    if not raw_query and not request.audio_base64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query message must be provided.")
    session_id = request.session_id or "default"
    return farmer_dialogue_manager.process_message(request, session_id=session_id)

