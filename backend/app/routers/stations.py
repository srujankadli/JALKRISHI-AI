from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Path
from app.config import settings
from app.models.schemas import (
    DWLRStationSchema,
    StationListResponse,
    StationSearchResultResponse,
    StationSummaryResponse,
    NearbyStationEvidenceSchema,
)
from app.pipeline.dwlr_ingest import station_repo

router = APIRouter(prefix="/api/v1/stations", tags=["DWLR Stations"])


@router.get(
    "/nearby",
    response_model=List[NearbyStationEvidenceSchema],
    summary="Get Nearby DWLR Stations for Evidence",
    description="Returns top nearby DWLR stations within radius_km for a given lat/lon coordinate pair.",
)
def get_nearby_stations(
    latitude: float = Query(..., description="Target latitude"),
    longitude: float = Query(..., description="Target longitude"),
    radius_km: float = Query(35.0, gt=0, le=500.0, description="Search radius in kilometers (default 35.0 km)"),
    limit: int = Query(5, ge=1, le=50, description="Max nearby stations to return"),
) -> List[NearbyStationEvidenceSchema]:
    import math
    all_stations = station_repo.get_all()
    nearby_list = []

    for st in all_stations:
        dlat = math.radians(st.latitude - latitude)
        dlon = math.radians(st.longitude - longitude)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(latitude))
            * math.cos(math.radians(st.latitude))
            * math.sin(dlon / 2.0) ** 2
        )
        dist = 6371.0 * (2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))
        if dist <= radius_km:
            nearby_list.append((dist, st))

    nearby_list.sort(key=lambda x: x[0])
    top_nearby = nearby_list[:limit]

    return [
        NearbyStationEvidenceSchema(
            id=st.id,
            stationCode=st.stationCode,
            stationName=st.stationName,
            state=st.state,
            district=st.district,
            block=st.block,
            latitude=st.latitude,
            longitude=st.longitude,
            distance_km=round(dist, 2),
            waterLevel=st.waterLevel,
            status=st.status,
            trend=st.trend,
            daysToCritical=st.daysToCritical,
            lastUpdated=st.lastUpdated,
        )
        for dist, st in top_nearby
    ]



@router.get(
    "",
    response_model=StationListResponse,
    summary="Get Filtered & Paginated DWLR Stations",
    description="Retrieves DWLR observation stations with multi-criteria filtering and pagination. Data Mode: DEMO_SIMULATION.",
)
def get_stations(
    state: Optional[str] = Query(None, description="Filter by Indian State name (e.g. Punjab, Rajasthan)"),
    district: Optional[str] = Query(None, description="Filter by District name (e.g. Sangrur, Kolar)"),
    block: Optional[str] = Query(None, description="Filter by Block / Tehsil name"),
    status: Optional[str] = Query(None, description="Filter by Status: healthy, moderate, warning, critical"),
    trend: Optional[str] = Query(None, description="Filter by Trend: rising, stable, falling"),
    risk: Optional[str] = Query(None, description="Filter by Risk band: low (<0.35), medium (0.35-0.6), high (0.6-0.8), critical (>=0.8)"),
    limit: int = Query(50, ge=1, le=10000, description="Page size limit (default 50, max 10000)"),
    offset: int = Query(0, ge=0, description="Page offset"),
) -> StationListResponse:
    # 1. Filter stations
    filtered = station_repo.filter_stations(
        state=state,
        district=district,
        block=block,
        status=status,
        trend=trend,
        risk=risk,
    )
    total_count = len(filtered)

    # 2. Paginate
    paginated = filtered[offset : offset + limit]

    filters_applied = {
        "state": state,
        "district": district,
        "block": block,
        "status": status,
        "trend": trend,
        "risk": risk,
    }

    return StationListResponse(
        stations=paginated,
        total=total_count,
        limit=limit,
        offset=offset,
        filters_applied={k: v for k, v in filters_applied.items() if v is not None},
        data_mode=settings.DATA_MODE,
        disclaimer=settings.DEMO_DISCLAIMER,
    )


@router.get(
    "/summary",
    response_model=StationSummaryResponse,
    summary="Get Network Aggregation Summary",
    description="Calculates real-time statistics across all 5,260 DWLR stations (counts, average depth, average risk score, telemetry uptime).",
)
def get_station_summary(
    state: Optional[str] = Query(None, description="Optional state filter for localized summary"),
) -> StationSummaryResponse:
    filtered = None
    if state and state.lower() != "all states":
        filtered = station_repo.filter_stations(state=state)

    summary_data = station_repo.get_summary(filtered)
    return StationSummaryResponse(**summary_data)


@router.get(
    "/search",
    response_model=StationSearchResultResponse,
    summary="Search Stations by Keyword",
    description="Performs case-insensitive search across Station ID, Code, Name, District, State, and Block.",
)
def search_stations(
    q: str = Query(..., min_length=1, description="Search term (e.g. kolar, sangrur, DWLR-PB-001)"),
    limit: int = Query(50, ge=1, le=500, description="Maximum matches to return"),
) -> StationSearchResultResponse:
    matches = station_repo.search(q, limit=limit)
    return StationSearchResultResponse(
        stations=matches,
        total_matches=len(matches),
        query=q,
        data_mode=settings.DATA_MODE,
    )


@router.get(
    "/{station_id}",
    response_model=DWLRStationSchema,
    summary="Get Complete Station Record",
    description="Returns detailed telemetry record, historical readings, soil type, and actionable advice for a specific DWLR station.",
)
def get_station_by_id(
    station_id: str = Path(..., description="Unique Station ID (e.g. DWLR-PB-001) or Station Code"),
) -> DWLRStationSchema:
    st = station_repo.get_by_id(station_id)
    if not st:
        raise HTTPException(
            status_code=404,
            detail=f"DWLR Station '{station_id}' not found in the 5,260-station network.",
        )
    return st
