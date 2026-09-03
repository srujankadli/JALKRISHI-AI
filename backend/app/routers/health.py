from datetime import datetime
from fastapi import APIRouter
from app.config import settings
from app.models.schemas import HealthResponse, VersionResponse, DataSourceAdapterInfo

router = APIRouter(tags=["Health & Version"])


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
@router.get("/api/v1/health", response_model=HealthResponse, summary="API v1 Health Check")
def health_check() -> HealthResponse:
    """Returns the live operational status and metadata of the JalKrishi AI backend."""
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        data_mode=settings.DATA_MODE,
        timestamp=datetime.utcnow().isoformat() + "Z",
        disclaimer=settings.DEMO_DISCLAIMER,
    )


@router.get("/api/v1/version", response_model=VersionResponse, summary="API Version & Target Architecture")
@router.get("/api/v1/info", response_model=VersionResponse, summary="Backend Info")
def version_info() -> VersionResponse:
    """Returns version details, team information, and target architecture ingestion layers."""
    adapters = [
        DataSourceAdapterInfo(
            name="India-WRIS Telemetry Adapter",
            provider="Ministry of Jal Shakti",
            adapter_status="Ingestion Interface Ready (Demo Mode)",
            endpoint_type="REST / CSV Stream",
        ),
        DataSourceAdapterInfo(
            name="CGWB NAQUIM Piezometer Registry",
            provider="Central Ground Water Board",
            adapter_status="Lithological Schema Ready (Demo Mode)",
            endpoint_type="Hydrogeological Metadata",
        ),
        DataSourceAdapterInfo(
            name="IMD Gridded Rainfall Feed",
            provider="India Meteorological Department",
            adapter_status="Precipitation Grid Ready (Demo Mode)",
            endpoint_type="Gridded Spatial API",
        ),
    ]

    pipeline_layers = [
        "1. DWLR Telemetry Ingestion (5,260 Observation Wells)",
        "2. Hydrogeological Processing & Statistical QC (Z-Score > 2.5)",
        "3. Multi-Horizon Forecasting Engine (7d/30d/60d/90d + Confidence Bands)",
        "4. Hydro-Agronomic Crop Recommendation Engine (6-Factor Weighted Scorer)",
        "5. Regional Analytics & Export Service (XLSX & PDF)",
        "6. React Web Platform & Planned WhatsApp Bot",
    ]

    return VersionResponse(
        app_name=settings.APP_NAME,
        tagline=settings.APP_TAGLINE,
        version=settings.VERSION,
        organization=settings.ORGANIZATION,
        team="JalKrishi Intelligence Team",
        problem_id="JALKRISHI-CORE",
        hackathon="JalKrishi Production Platform",
        data_mode=settings.DATA_MODE,
        api_prefix=settings.API_V1_STR,
        disclaimer=settings.DEMO_DISCLAIMER,
        target_pipeline_layers=pipeline_layers,
        data_source_adapters=adapters,
    )
