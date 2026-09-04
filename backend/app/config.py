import time
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Application Settings & Configuration for JalKrishi AI"""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "JalKrishi AI — Groundwater Intelligence Platform"
    APP_TAGLINE: str = "Know Your Water. Grow Smarter."
    APP_ENV: str = "development"  # development | staging | production
    VERSION: str = "2.6.0"
    API_V1_STR: str = "/api/v1"
    
    # Platform & Organization Metadata
    ORGANIZATION: str = "JalKrishi AI Intelligence Division"
    
    # Mode & Scientific Transparency (Reference Simulation Network)
    DATA_MODE: str = "DEMO_SIMULATION"
    DEMO_DISCLAIMER: str = (
        "Demo Simulation Mode: JalKrishi Reference DWLR Telemetry Network & Satellite Hydro-Agronomic Intelligence Engine. "
        "Baseline telemetry utilizes reference observation dataset across 5,260 stations."
    )
    
    # Server & Execution Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_TIMEOUT_SECONDS: int = 15
    
    # Input Limits & Safety Protections
    CSV_MAX_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 Megabytes
    MAX_PAGINATION_LIMIT: int = 10000
    MAX_QUERY_STRING_LENGTH: int = 256
    
    # Spatial & Coverage Settings
    DWLR_COVERAGE_RADIUS_KM: float = 15.0
    
    # System Runtime Stats
    BOOT_TIMESTAMP: float = time.time()
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
