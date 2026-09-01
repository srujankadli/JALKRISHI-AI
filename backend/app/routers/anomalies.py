from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Path
from app.models.schemas import (
    AnomalyResponse,
    AnomalyListResponse,
    AnomalySummaryResponse,
    AnomalyDistributionResponse,
    StateAnomalySummaryResponse,
)
from app.engines.anomaly_detector import anomaly_engine

router = APIRouter(prefix="/api/v1/anomalies", tags=["Anomaly Detection & Alerts"])


@router.get(
    "",
    response_model=AnomalyListResponse,
    summary="Get Filtered Anomaly Feed",
    description="Retrieves multi-category groundwater anomalies with filtering by state, district, category, and severity. Data Mode: DEMO_SIMULATION.",
)
def get_anomalies(
    state: Optional[str] = Query(None, description="Filter by state (e.g. Punjab, Rajasthan)"),
    district: Optional[str] = Query(None, description="Filter by district (e.g. Sangrur, Jodhpur)"),
    category: Optional[str] = Query(None, description="Filter by category: sudden_drop, possible_extraction, missing_data, sensor_issue, sudden_rise"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, warning, info"),
    station_id: Optional[str] = Query(None, description="Filter by specific station ID (e.g. DWLR-PB-001)"),
    limit: int = Query(50, ge=1, le=500, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
) -> AnomalyListResponse:
    return anomaly_engine.get_anomalies(
        state=state,
        district=district,
        category=category,
        severity=severity,
        station_id=station_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/summary",
    response_model=AnomalySummaryResponse,
    summary="Get Anomaly Summary Statistics",
    description="Calculates network-level totals across the 5 anomaly categories and 4 severity tiers.",
)
def get_anomaly_summary() -> AnomalySummaryResponse:
    return anomaly_engine.get_summary()


@router.get(
    "/distribution",
    response_model=AnomalyDistributionResponse,
    summary="Get Category & Severity Distributions",
    description="Returns frequency distribution counts for charting and dashboard widgets.",
)
def get_anomaly_distribution() -> AnomalyDistributionResponse:
    return anomaly_engine.get_distribution()


@router.get(
    "/states",
    response_model=StateAnomalySummaryResponse,
    summary="Get State-Level Anomaly Breakdown",
    description="Aggregates anomaly alerts and primary category per state.",
)
def get_state_anomaly_summary() -> StateAnomalySummaryResponse:
    return anomaly_engine.get_state_summary()


@router.get(
    "/station/{station_id}",
    response_model=List[AnomalyResponse],
    summary="Get All Anomalies for a Specific Station",
    description="Returns list of detected anomalies associated with a given observation well.",
)
def get_station_anomalies(
    station_id: str = Path(..., description="Unique Station ID (e.g. DWLR-PB-001)"),
) -> List[AnomalyResponse]:
    try:
        return anomaly_engine.get_station_anomalies(station_id=station_id)
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"DWLR Station '{station_id}' not found.",
        )
