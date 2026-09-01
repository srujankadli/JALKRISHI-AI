from typing import Dict, Any
from app.models.schemas import DataSourceEnum


class BaseIngestionAdapter:
    """Abstract base class for telemetry ingestion adapters."""
    source_name: DataSourceEnum

    def fetch_data(self) -> Dict[str, Any]:
        raise NotImplementedError


class IndiaWRISLoader(BaseIngestionAdapter):
    """
    Adapter interface for Ministry of Jal Shakti / India-WRIS Telemetry API.
    In DEMO_SIMULATION mode, this stub safely declares its unconfigured state.
    """
    source_name = DataSourceEnum.INDIA_WRIS

    def get_status(self) -> Dict[str, Any]:
        return {
            "source": self.source_name.value,
            "status": "NOT_CONFIGURED",
            "message": "Live India-WRIS REST API telemetry connector is not configured in demo mode.",
            "auth_required": "API Key / OAuth2 Client Credentials",
            "expected_endpoint": "https://indiawris.gov.in/api/v1/dwlr/telemetry",
            "data_mode": "DEMO_SIMULATION",
        }


class CGWBLoader(BaseIngestionAdapter):
    """
    Adapter interface for Central Ground Water Board (CGWB) Monitoring Wells.
    """
    source_name = DataSourceEnum.CGWB

    def get_status(self) -> Dict[str, Any]:
        return {
            "source": self.source_name.value,
            "status": "NOT_CONFIGURED",
            "message": "Live Central Ground Water Board (CGWB) telemetry connector is not configured.",
            "auth_required": "CGWB Departmental Token",
            "expected_endpoint": "https://cgwb.gov.in/api/groundwater-levels",
            "data_mode": "DEMO_SIMULATION",
        }


class IMDRainfallLoader(BaseIngestionAdapter):
    """
    Adapter interface for India Meteorological Department (IMD) Gridded Rainfall Data.
    """
    source_name = DataSourceEnum.IMD

    def get_status(self) -> Dict[str, Any]:
        return {
            "source": self.source_name.value,
            "status": "NOT_CONFIGURED",
            "message": "Live IMD gridded precipitation telemetry is not configured.",
            "auth_required": "IMD Open Data Portal API Token",
            "expected_endpoint": "https://imd.gov.in/api/v2/gridded/rainfall",
            "data_mode": "DEMO_SIMULATION",
        }


# Singleton instances
india_wris_loader = IndiaWRISLoader()
cgwb_loader = CGWBLoader()
imd_rainfall_loader = IMDRainfallLoader()
