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
from app.pipeline.location_resolver import resolve_location
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
        "Returns complete hydrogeological decision-support intelligence for any lat/lon coordinate or verified location. "
        "Automatically determines DWLR vs Satellite-Assisted coverage and produces unified groundwater signals, "
        "30-day forecast outlook, spatial risk signals, crop recommendations, and irrigation guidance."
    ),
)
def get_unified_groundwater_intelligence(
    latitude: Optional[float] = Query(None, description="Target latitude (-90.0 to +90.0)"),
    longitude: Optional[float] = Query(None, description="Target longitude (-180.0 to +180.0)"),
    location_query: Optional[str] = Query(None, description="Location search query (village, city, district)"),
    radius_km: Optional[float] = Query(
        None, gt=0, le=500, description="Custom DWLR coverage radius in km (default 15.0 km)"
    ),
):
    lat = latitude
    lon = longitude

    if lat is None or lon is None:
        if location_query:
            res = resolve_location(location_query)
            if not res.is_resolved or res.latitude is None or res.longitude is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=res.error_message or "We couldn't verify that location. Please enter a valid village, town, city, district, state, or 6-digit PIN code."
                )
            lat = res.latitude
            lon = res.longitude
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coordinates or a verified location query are required. Please provide a valid location."
            )

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
    location_query: Optional[str] = Query(None, description="Location search query"),
):
    lat = latitude
    lon = longitude

    if lat is None or lon is None:
        if location_query:
            res = resolve_location(location_query)
            if not res.is_resolved or res.latitude is None or res.longitude is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=res.error_message or "We couldn't verify that location. Please enter a valid location."
                )
            lat = res.latitude
            lon = res.longitude
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coordinates or a verified location query are required."
            )

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
            "irrigation_guidance": intel.irrigation_implications,
            "irrigation_implications": intel.irrigation_implications,
            "rainfall_signal": intel.rainfall_signal,
            "risk_signals": intel.risk_alerts,
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
    summary="Farmer Conversational Intelligence Dialogue Query",
    description="Processes farmer queries in 13 Indian regional languages and returns structured audio and visual intelligence response.",
)
def process_farmer_conversation(
    req: VoiceQueryRequest,
    session_id: Optional[str] = Query("default", description="Farmer session ID for multi-turn dialogue context")
):
    try:
        s_id = req.session_id or session_id or "default"
        response = farmer_dialogue_manager.process_farmer_message(
            request=req,
            session_id=s_id
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing farmer conversation dialogue: {str(e)}",
        )


@router.post(
    "/voice/query",
    response_model=VoiceQueryResponse,
    summary="Multi-lingual Voice & Text Groundwater Dialogue Query",
    description="Processes farmer queries in 13 Indian regional languages and returns structured audio and visual intelligence response.",
)
def process_voice_or_text_farmer_query(
    req: VoiceQueryRequest,
    session_id: Optional[str] = Query("default", description="Farmer session ID for multi-turn dialogue context")
):
    try:
        s_id = req.session_id or session_id or "default"
        response = farmer_dialogue_manager.process_farmer_message(
            request=req,
            session_id=s_id
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing multilingual voice/text dialogue: {str(e)}",
        )

