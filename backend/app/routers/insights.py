from fastapi import APIRouter, HTTPException, Path, status
from app.models.schemas import ExecutiveInsightSummaryResponse, StationInsightResponse
from app.engines.insight_engine import insight_engine

router = APIRouter(prefix="/insights", tags=["AI Executive Intelligence"])


@router.get(
    "/summary",
    response_model=ExecutiveInsightSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get JalKrishi AI Executive Intelligence Summary",
    description="Synthesizes network groundwater depth, analytics risk, forecast trajectories, telemetry anomalies, and crop recommendations into a concise executive brief.",
)
def get_insights_summary() -> ExecutiveInsightSummaryResponse:
    return insight_engine.get_executive_summary()


@router.get(
    "/station/{station_id}",
    response_model=StationInsightResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI Station Intelligence Brief",
    description="Synthesizes telemetry, forecast trajectory, anomaly status, and crop advice for a specific DWLR observation well.",
)
def get_station_insight(
    station_id: str = Path(..., description="Unique station ID (e.g. DWLR-PB-001)"),
) -> StationInsightResponse:
    try:
        return insight_engine.get_station_insight(station_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
