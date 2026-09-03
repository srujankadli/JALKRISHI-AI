from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import csv
import io

from app.models.schemas import (
    ProviderTypeEnum,
    ProviderStatusEnum,
    ProviderMetadataSchema,
    NormalizedDWLRObservation,
    SystemProviderMatrixResponse,
    DWLRStationSchema,
)
from app.pipeline.dwlr_ingest import station_repo
from app.config import settings


# ==========================================
# 1. Base Data Provider Abstraction
# ==========================================

class BaseDataProvider(ABC):
    """Abstract interface for all JalKrishi hydrogeological data providers."""

    @abstractmethod
    def get_metadata(self) -> ProviderMetadataSchema:
        """Returns metadata and status for this provider."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if provider is operational and providing data."""
        pass

    @abstractmethod
    def get_observations(self) -> List[NormalizedDWLRObservation]:
        """Returns normalized observations supplied by this provider."""
        pass

    @abstractmethod
    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        """Looks up normalized observation by station code/ID."""
        pass


# ==========================================
# 2. Government DWLR API Adapter
# ==========================================

class GovernmentDWLRAdapter(BaseDataProvider):
    """
    Adapter interface for official Government DWLR REST APIs (India-WRIS / CGWB).
    Currently NOT_CONFIGURED. Does not claim live access or use fake credentials.
    """

    def __init__(self):
        self.api_key: Optional[str] = None
        self.endpoint: str = "https://indiawris.gov.in/api/v1/dwlr/telemetry"

    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="Government DWLR API (India-WRIS / CGWB)",
            provider_type=ProviderTypeEnum.GOVERNMENT_API,
            status=ProviderStatusEnum.NOT_CONFIGURED,
            last_updated="Never (Adapter Not Configured)",
            coverage="Pan-India DWLR Telemetry Network (Unconfigured)",
            capabilities=["Live Telemetry Ingestion", "Real-Time Sensor Alerts", "Hourly Piezometer Stream"],
            message="Government REST API connector is not configured. System is operating on fallback data providers.",
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return self.api_key is not None and len(self.api_key) > 0

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        return []

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        return None


# ==========================================
# 3. Dataset Upload Provider
# ==========================================

class DatasetUploadProvider(BaseDataProvider):
    """
    Provider for user-uploaded custom structured DWLR datasets (CSV / Excel).
    Normalizes custom readings into standard JalKrishi observations.
    """

    def __init__(self):
        self._custom_observations: List[NormalizedDWLRObservation] = []
        self._dataset_filename: Optional[str] = None
        self._last_uploaded_at: Optional[str] = None

    def ingest_csv_content(self, csv_text: str, filename: str = "custom_dataset.csv") -> int:
        """Parses CSV text and activates Dataset Upload provider."""
        reader = csv.DictReader(io.StringIO(csv_text))
        new_obs: List[NormalizedDWLRObservation] = []

        for idx, row in enumerate(reader, start=1):
            st_id = row.get("station_id") or row.get("id") or f"UP-CSV-{idx:03d}"
            st_name = row.get("station_name") or row.get("name") or f"Uploaded Station {st_id}"
            state = row.get("state", "Uploaded Sector")
            district = row.get("district", "Uploaded District")
            block = row.get("block", "Uploaded Block")

            try:
                lat = float(row.get("latitude") or row.get("lat") or 20.0)
                lon = float(row.get("longitude") or row.get("lng") or 78.0)
                depth_raw = row.get("groundwater_level") or row.get("water_level") or row.get("depth_mbgl")
                if depth_raw is None:
                    continue
                depth = float(depth_raw)
            except (ValueError, TypeError):
                continue

            risk = float(row.get("risk_score", 0.45))
            status = row.get("status", "moderate").lower()

            obs = NormalizedDWLRObservation(
                station_id=st_id,
                station_name=st_name,
                state=state,
                district=district,
                block=block,
                latitude=lat,
                longitude=lon,
                timestamp=datetime.now(timezone.utc).isoformat(),
                groundwater_level_mbgl=depth,
                risk_score=risk,
                status=status,
                provider_source=f"Uploaded DWLR Dataset ({filename})",
                data_mode=settings.DATA_MODE,
            )
            new_obs.append(obs)

        if new_obs:
            self._custom_observations = new_obs
            self._dataset_filename = filename
            self._last_uploaded_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

            # Convert NormalizedDWLRObservation to DWLRStationSchema and feed station_repo
            from app.models.schemas import StationStatus, TrendDirection, TelemetryStatus
            custom_schemas: List[DWLRStationSchema] = []
            for obs in new_obs:
                status_enum = StationStatus.CRITICAL if obs.status == "critical" else StationStatus.WARNING if obs.status == "warning" else StationStatus.HEALTHY if obs.status == "healthy" else StationStatus.MODERATE
                trend_enum = TrendDirection.FALLING if obs.risk_score > 0.6 else TrendDirection.RISING if obs.risk_score < 0.3 else TrendDirection.STABLE

                st = DWLRStationSchema(
                    id=obs.station_id,
                    stationCode=f"UP-{obs.station_id}",
                    stationName=obs.station_name,
                    state=obs.state,
                    district=obs.district,
                    block=obs.block,
                    latitude=obs.latitude,
                    longitude=obs.longitude,
                    waterLevel=obs.groundwater_level_mbgl,
                    previousWaterLevel=round(obs.groundwater_level_mbgl - 0.2, 1),
                    seasonalAverage=round(obs.groundwater_level_mbgl * 0.9, 1),
                    criticalThreshold=round(obs.groundwater_level_mbgl + 5.0, 1),
                    riskScore=obs.risk_score,
                    status=status_enum,
                    trend=trend_enum,
                    trendRateMetersPerMonth=0.15 if trend_enum == TrendDirection.FALLING else -0.10 if trend_enum == TrendDirection.RISING else 0.0,
                    daysToCritical=30 if status_enum == StationStatus.CRITICAL else 60 if status_enum == StationStatus.WARNING else None,
                    batteryLevel=95,
                    telemetryStatus=TelemetryStatus.ONLINE,
                    lastUpdated="Just now (Uploaded Dataset)",
                    soilType="Uploaded Soil Context",
                    aquiferType="Uploaded Aquifer Layer",
                    historicalData=[],
                    farmerSummary=f"Uploaded Station: Water table depth at {obs.groundwater_level_mbgl} m mbgl.",
                    actionableAdvice="Follow localized water conservation scheduling.",
                )
                custom_schemas.append(st)

            station_repo.set_custom_stations(custom_schemas)

        return len(new_obs)

    def clear_dataset(self):
        """Clears uploaded dataset and resets status & station_repo back to reference simulation."""
        self._custom_observations = []
        self._dataset_filename = None
        self._last_uploaded_at = None
        station_repo.reset_to_default()

    def get_metadata(self) -> ProviderMetadataSchema:
        if self.is_available():
            status = ProviderStatusEnum.ACTIVE
            msg = f"Active uploaded dataset '{self._dataset_filename}' containing {len(self._custom_observations)} normalized DWLR stations."
            updated = self._last_uploaded_at or "Recently Uploaded"
        else:
            status = ProviderStatusEnum.AVAILABLE_CAPABILITY
            msg = "Dataset upload capability ready (No active custom dataset uploaded). System using Reference Simulation fallback."
            updated = "No Active Dataset"

        return ProviderMetadataSchema(
            provider_name="Uploaded DWLR Dataset Provider",
            provider_type=ProviderTypeEnum.DATASET_UPLOAD,
            status=status,
            last_updated=updated,
            coverage=f"{len(self._custom_observations)} Custom Uploaded Observation Points" if self.is_available() else "User Upload Scope",
            capabilities=["CSV Dataset Ingestion", "Schema Normalization", "Custom District Evaluation"],
            message=msg,
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return len(self._custom_observations) > 0

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        return self._custom_observations

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        st_low = station_id.lower()
        for obs in self._custom_observations:
            if obs.station_id.lower() == st_low:
                return obs
        return None


# ==========================================
# 4. Reference Simulation Data Provider
# ==========================================

class ReferenceSimulationProvider(BaseDataProvider):
    """
    JalKrishi Reference Simulation Data Provider.
    Supplies 5,260 normalized observation points across 13 major Indian states.
    Always active and transparently labeled as a reference simulation dataset.
    """

    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="JalKrishi Reference Simulation Dataset",
            provider_type=ProviderTypeEnum.SIMULATION,
            status=ProviderStatusEnum.ACTIVE_SIMULATION,
            last_updated="2026-08-31 (Reference Baseline)",
            coverage="5,260 Observation Points across 13 Major Indian States",
            capabilities=["Deterministic Hydrogeological Telemetry", "Seasonal Baseline Interpolation", "Multi-Region Spatial Analysis"],
            message="JalKrishi reference simulation dataset active. Provides deterministic hydrogeological baseline for decision-support engines.",
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return True

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        all_stations = station_repo.get_all()
        normalized: List[NormalizedDWLRObservation] = []

        for st in all_stations:
            normalized.append(
                NormalizedDWLRObservation(
                    station_id=st.id,
                    station_name=st.stationName,
                    state=st.state,
                    district=st.district,
                    block=st.block,
                    latitude=st.latitude,
                    longitude=st.longitude,
                    timestamp="2026-08-31 12:00:00Z",
                    groundwater_level_mbgl=st.waterLevel,
                    risk_score=st.riskScore,
                    status=st.status.value,
                    provider_source="JalKrishi Reference Simulation Dataset",
                    data_mode=settings.DATA_MODE,
                )
            )

        return normalized

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        st = station_repo.get_by_id(station_id)
        if not st:
            return None

        return NormalizedDWLRObservation(
            station_id=st.id,
            station_name=st.stationName,
            state=st.state,
            district=st.district,
            block=st.block,
            latitude=st.latitude,
            longitude=st.longitude,
            timestamp="2026-08-31 12:00:00Z",
            groundwater_level_mbgl=st.waterLevel,
            risk_score=st.riskScore,
            status=st.status.value,
            provider_source="JalKrishi Reference Simulation Dataset",
            data_mode=settings.DATA_MODE,
        )


# ==========================================
# 5. Remote Sensing & Auxiliary Adapters
# ==========================================

class RemoteSensingProvider(BaseDataProvider):
    """Remote Sensing Vegetation & Surface Thermal Moisture Provider."""

    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="Remote Sensing Surface Indicator Engine",
            provider_type=ProviderTypeEnum.REMOTE_SENSING,
            status=ProviderStatusEnum.ACTIVE_SIMULATION,
            last_updated="Real-Time Spatial Grid (Simulated)",
            coverage="Pan-India Multispectral Grid (1km resolution)",
            capabilities=["Canopy Water Stress (NDWI/NDVI)", "Land Surface Temperature Anomaly", "Spatial Moisture Infiltration"],
            message="Simulated remote sensing indicators active for satellite-assisted groundwater estimation.",
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return True

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        return []

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        return None


class WeatherProvider(BaseDataProvider):
    """Precipitation & Meteorological Signal Provider."""

    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="IMD Meteorological & Rainfall Signal Engine",
            provider_type=ProviderTypeEnum.WEATHER_PROVIDER,
            status=ProviderStatusEnum.ACTIVE_SIMULATION,
            last_updated="30-Day Precipitation Signal (Simulated)",
            coverage="All 766 Indian Districts",
            capabilities=["30-Day Accumulated Rainfall", "Recharge Deficit Analysis", "Monsoon Moisture Infiltration"],
            message="Simulated gridded weather and rainfall signals active.",
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return True

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        return []

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        return None


class NASAGRACEAdapter(BaseDataProvider):
    """NASA GRACE Terrestrial Water Storage Satellite Adapter (Not Configured)."""

    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="NASA GRACE Gravity & Deep Storage Satellite",
            provider_type=ProviderTypeEnum.REMOTE_SENSING,
            status=ProviderStatusEnum.NOT_CONFIGURED,
            last_updated="Unconfigured",
            coverage="Deep Mass Anomaly Grid",
            capabilities=["Deep Aquifer Storage Anomaly", "Regional Subsurface Mass Velocity"],
            message="NASA GRACE satellite telemetry adapter not configured in current environment.",
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return False

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        return []

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        return None


class SentinelInSARAdapter(BaseDataProvider):
    """Sentinel-1 InSAR Subsidence & Aquifer Deformation Adapter (Not Configured)."""

    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="Sentinel-1 InSAR Crustal Deformation Radar",
            provider_type=ProviderTypeEnum.REMOTE_SENSING,
            status=ProviderStatusEnum.NOT_CONFIGURED,
            last_updated="Unconfigured",
            coverage="Millimetric Surface Deformation Radar",
            capabilities=["Aquifer Subsidence Tracking", "Borewell Depletion Strain"],
            message="Sentinel-1 InSAR radar deformation adapter not configured in current environment.",
            data_mode=settings.DATA_MODE,
        )

    def is_available(self) -> bool:
        return False

    def get_observations(self) -> List[NormalizedDWLRObservation]:
        return []

    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]:
        return None


class STTProviderAdapter(BaseDataProvider):
    """Speech-to-Text Provider Adapter."""
    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="Speech-to-Text Engine",
            provider_type=ProviderTypeEnum.REMOTE_SENSING,
            status=ProviderStatusEnum.NOT_CONFIGURED,
            last_updated="Unconfigured",
            coverage="Multilingual Voice Transcription",
            capabilities=["Spoken Audio Transcription", "Voice Query Language Identification"],
            message="Cloud Speech-to-Text provider is not configured. Text input fallback active.",
            data_mode=settings.DATA_MODE,
        )
    def is_available(self) -> bool: return False
    def get_observations(self) -> List[NormalizedDWLRObservation]: return []
    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]: return None


class TTSProviderAdapter(BaseDataProvider):
    """Text-to-Speech Provider Adapter."""
    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="Text-to-Speech Engine",
            provider_type=ProviderTypeEnum.REMOTE_SENSING,
            status=ProviderStatusEnum.NOT_CONFIGURED,
            last_updated="Unconfigured",
            coverage="13 Regional Indian Languages",
            capabilities=["Spoken Advice Audio Synthesis"],
            message="Cloud Text-to-Speech provider is not configured. Written farmer text advice remains active.",
            data_mode=settings.DATA_MODE,
        )
    def is_available(self) -> bool: return False
    def get_observations(self) -> List[NormalizedDWLRObservation]: return []
    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]: return None


class TranslationProviderAdapter(BaseDataProvider):
    """Multilingual Translation Provider Adapter."""
    def get_metadata(self) -> ProviderMetadataSchema:
        return ProviderMetadataSchema(
            provider_name="Multilingual Translation Engine",
            provider_type=ProviderTypeEnum.REMOTE_SENSING,
            status=ProviderStatusEnum.AVAILABLE,
            last_updated="Local Core Translations Active",
            coverage="13 Major Indian Regional Languages",
            capabilities=["Hydro-Agronomic Translation", "Data-Honesty Terminology Preservation"],
            message="Local Core Hydro-Agronomic Multilingual Translator active across 13 Indian regional languages.",
            data_mode=settings.DATA_MODE,
        )
    def is_available(self) -> bool: return True
    def get_observations(self) -> List[NormalizedDWLRObservation]: return []
    def get_station_by_id(self, station_id: str) -> Optional[NormalizedDWLRObservation]: return None


# ==========================================
# 6. Provider Resilience Registry
# ==========================================

class ProviderResilienceRegistry:
    """
    Central Registry and Provider Resolution Engine.
    Resolves data provider fallback order safely without hardcoding or collapse.
    """

    def __init__(self):
        self.government_adapter = GovernmentDWLRAdapter()
        self.dataset_upload_provider = DatasetUploadProvider()
        self.reference_simulation_provider = ReferenceSimulationProvider()
        self.remote_sensing_provider = RemoteSensingProvider()
        self.weather_provider = WeatherProvider()
        self.grace_adapter = NASAGRACEAdapter()
        self.insar_adapter = SentinelInSARAdapter()
        self.stt_adapter = STTProviderAdapter()
        self.tts_adapter = TTSProviderAdapter()
        self.translation_adapter = TranslationProviderAdapter()

    def resolve_active_dwlr_provider(self) -> BaseDataProvider:
        """
        Fallback Resolution Logic:
        1. Government DWLR API (if configured & live)
        2. Dataset Upload Provider (if uploaded dataset available)
        3. JalKrishi Reference Simulation Dataset (Default active fallback)
        """
        if self.government_adapter.is_available():
            return self.government_adapter
        elif self.dataset_upload_provider.is_available():
            return self.dataset_upload_provider
        else:
            return self.reference_simulation_provider

    def get_active_provider_metadata(self) -> ProviderMetadataSchema:
        active = self.resolve_active_dwlr_provider()
        return active.get_metadata()

    def get_all_providers_metadata(self) -> List[ProviderMetadataSchema]:
        return [
            self.government_adapter.get_metadata(),
            self.dataset_upload_provider.get_metadata(),
            self.reference_simulation_provider.get_metadata(),
            self.remote_sensing_provider.get_metadata(),
            self.weather_provider.get_metadata(),
            self.grace_adapter.get_metadata(),
            self.insar_adapter.get_metadata(),
            self.stt_adapter.get_metadata(),
            self.tts_adapter.get_metadata(),
            self.translation_adapter.get_metadata(),
        ]

    def get_system_provider_matrix(self) -> SystemProviderMatrixResponse:
        all_meta = self.get_all_providers_metadata()
        active_meta = self.get_active_provider_metadata()

        fallback_chain = [
            "1. Government DWLR API (Unconfigured)",
            "2. Uploaded DWLR Dataset (Available on demand)",
            "3. JalKrishi Reference Simulation Dataset (Active Fallback)",
        ]

        disclaimer = (
            "Data Resilience Layer: JalKrishi operates on a provider-agnostic architecture. "
            "When government endpoints are unconfigured, decision support uses reference simulation baseline "
            "or uploaded datasets without interruption."
        )

        return SystemProviderMatrixResponse(
            active_provider=active_meta,
            providers=all_meta,
            fallback_chain=fallback_chain,
            total_providers=len(all_meta),
            data_mode=settings.DATA_MODE,
            disclaimer=disclaimer,
        )


provider_registry = ProviderResilienceRegistry()
