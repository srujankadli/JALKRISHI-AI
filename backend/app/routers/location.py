"""
JalKrishi AI — Location Verification & Resolution Router
--------------------------------------------------------
Endpoints for strictly validating farmer locations, disambiguating multi-match queries,
and converting administrative/place names to coordinates.
"""

from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, status

from app.pipeline.location_resolver import resolve_location
from app.models.schemas import (
    LocationResolutionResponse,
    LocationResolutionStatus,
    AmbiguousLocationOption,
)

router = APIRouter(
    prefix="/location",
    tags=["Location Verification & Resolution"],
)


@router.get(
    "/resolve",
    response_model=LocationResolutionResponse,
    summary="Resolve and Verify Farmer Location",
    description="Strictly validates and resolves a location query or coordinate pair to verified Indian administrative entities.",
)
def resolve_farmer_location(
    query: Optional[str] = Query(None, description="Location search query (village, city, district, state, PIN)"),
    latitude: Optional[float] = Query(None, description="Latitude"),
    longitude: Optional[float] = Query(None, description="Longitude"),
):
    res = resolve_location(
        location_query=query,
        latitude=latitude,
        longitude=longitude,
    )

    ambiguous_list = None
    if res.ambiguous_options:
        ambiguous_list = [
            AmbiguousLocationOption(
                name=opt.get("name") or (f"{query.title()}, {opt['district']}" if query else opt["district"]),
                district=opt["district"],
                state=opt["state"],
                latitude=opt["latitude"],
                longitude=opt["longitude"],
                confidence=opt.get("confidence", 0.85),
                display_label=f"{opt['district']}, {opt['state']}"
            )
            for opt in res.ambiguous_options
        ]

    st_status = res.status
    if st_status == "VERIFIED":
        st_enum = LocationResolutionStatus.VERIFIED
    elif st_status == "RESOLVED":
        st_enum = LocationResolutionStatus.RESOLVED
    elif st_status == "AMBIGUOUS":
        st_enum = LocationResolutionStatus.AMBIGUOUS
    elif st_status == "INTERNATIONAL":
        st_enum = LocationResolutionStatus.INTERNATIONAL
    elif st_status == "OUTSIDE_SUPPORTED_REGION":
        st_enum = LocationResolutionStatus.OUTSIDE_SUPPORTED_REGION
    else:
        st_enum = LocationResolutionStatus.UNRESOLVED

    return LocationResolutionResponse(
        is_resolved=res.is_resolved,
        status=st_enum,
        query=query or "",
        name=res.name,
        canonical_name=res.name,
        district=res.district,
        state=res.state,
        latitude=res.latitude,
        longitude=res.longitude,
        matched_station_id=res.matched_station_id,
        resolution_source=res.resolution_source or "UNVERIFIED",
        confidence=res.confidence,
        error_message=res.error_message,
        ambiguous_options=ambiguous_list,
        is_international=res.is_international,
    )

