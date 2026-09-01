from fastapi import APIRouter, status, Path
from app.models.schemas import (
    DataPipelineStatusResponse,
    DataRefreshResponse,
    CSVValidationRequest,
    CSVValidationResponse,
)
from app.pipeline.ingestion_manager import ingestion_manager

router = APIRouter(prefix="/data", tags=["Data Pipeline & Ingestion Layer"])


@router.get(
    "/status",
    response_model=DataPipelineStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Data Pipeline Status & Quality Report",
    description="Returns telemetry source, active data mode, station counts, validation report, and future adapter states.",
)
def get_data_status() -> DataPipelineStatusResponse:
    return ingestion_manager.get_status()


@router.post(
    "/refresh",
    response_model=DataRefreshResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh / Reload Active Telemetry Data",
    description="Reloads and validates the deterministic 5,260-station DWLR dataset.",
)
def refresh_data() -> DataRefreshResponse:
    return ingestion_manager.refresh_data()


@router.post(
    "/validate-csv",
    response_model=CSVValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate & Preview CSV Telemetry Upload",
    description="Parses, normalizes, and checks data quality for user-uploaded CSV telemetry without modifying the primary dataset.",
)
def validate_csv(request: CSVValidationRequest) -> CSVValidationResponse:
    return ingestion_manager.validate_csv(request.csv_content)


@router.get(
    "/adapters/{source_name}",
    summary="Get Future Government Ingestion Adapter Status",
    description="Returns the configuration status for India-WRIS, CGWB, or IMD data ingestion adapters.",
)
def get_adapter_info(
    source_name: str = Path(..., description="Adapter name (india-wris, cgwb, imd)"),
):
    return ingestion_manager.get_adapter_status(source_name)
