from datetime import datetime
from typing import Dict, Any, List, Optional
from app.models.schemas import (
    DataSourceEnum,
    DataPipelineStatusResponse,
    DataRefreshResponse,
    CSVValidationResponse,
    DataQualityReport,
)
from app.config import settings
from app.pipeline.dwlr_ingest import station_repo
from app.pipeline.data_quality import data_quality_engine
from app.pipeline.csv_loader import csv_loader
from app.pipeline.future_adapters import (
    india_wris_loader,
    cgwb_loader,
    imd_rainfall_loader,
)


class IngestionManager:
    """
    Unified Data Ingestion & Quality Control Manager.
    Coordinates sources, normalizes records, and manages telemetry repository cache.
    """

    def __init__(self):
        self.active_source: DataSourceEnum = DataSourceEnum.DEMO_SIMULATION
        self.last_refresh_time: str = datetime.utcnow().isoformat() + "Z"
        self._cached_quality_report: Optional[DataQualityReport] = None
        self._ensure_initial_quality_report()

    def _ensure_initial_quality_report(self):
        if self._cached_quality_report is None:
            stations = station_repo.get_all()
            self._cached_quality_report = data_quality_engine.validate_stations(stations)

    def get_quality_report(self, force_recheck: bool = False) -> DataQualityReport:
        if force_recheck or self._cached_quality_report is None:
            stations = station_repo.get_all()
            self._cached_quality_report = data_quality_engine.validate_stations(stations)
        return self._cached_quality_report

    def get_status(self) -> DataPipelineStatusResponse:
        stations = station_repo.get_all()
        q_report = self.get_quality_report()

        # Total telemetry records: 5,260 stations * ~6 historical points + 1 current = 36,820 points
        total_telemetry_points = sum(len(s.historicalData or []) + 1 for s in stations)

        return DataPipelineStatusResponse(
            active_source=self.active_source.value,
            data_mode=settings.DATA_MODE,
            station_count=len(stations),
            telemetry_record_count=total_telemetry_points,
            last_refresh=self.last_refresh_time,
            quality_score=q_report.quality_score,
            validation_status="PASS" if q_report.valid else "FAIL",
            quality_report=q_report,
            available_sources=[
                DataSourceEnum.DEMO_SIMULATION.value,
                DataSourceEnum.CSV_IMPORT.value,
            ],
            future_sources=[
                DataSourceEnum.INDIA_WRIS.value,
                DataSourceEnum.CGWB.value,
                DataSourceEnum.IMD.value,
            ],
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def refresh_data(self, source: DataSourceEnum = DataSourceEnum.DEMO_SIMULATION) -> DataRefreshResponse:
        """
        Refreshes and reloads telemetry data from the active source.
        In DEMO_SIMULATION mode, regenerates the deterministic 5,260 stations dataset.
        """
        self.active_source = source
        self.last_refresh_time = datetime.utcnow().isoformat() + "Z"

        # In DEMO_SIMULATION mode, reload repo cache to verify determinism
        stations = station_repo.reload()

        # Re-run quality validation
        self._cached_quality_report = data_quality_engine.validate_stations(stations)

        return DataRefreshResponse(
            refresh_started=True,
            source=self.active_source.value,
            records_loaded=len(stations),
            quality_score=self._cached_quality_report.quality_score,
            timestamp=self.last_refresh_time,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def validate_csv(self, csv_content: str) -> CSVValidationResponse:
        """Previews and validates uploaded CSV telemetry content without replacing demo data."""
        return csv_loader.validate_csv(csv_content)

    def get_adapter_status(self, source_name: str) -> Dict[str, Any]:
        s = source_name.upper().replace("-", "_")
        if s == "INDIA_WRIS":
            return india_wris_loader.get_status()
        elif s == "CGWB":
            return cgwb_loader.get_status()
        elif s == "IMD":
            return imd_rainfall_loader.get_status()
        else:
            return {
                "source": source_name,
                "status": "UNKNOWN",
                "message": f"Adapter '{source_name}' is not recognized.",
            }


ingestion_manager = IngestionManager()
