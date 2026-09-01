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
    VERSION: str = "2.0.0-phase-j"
    API_V1_STR: str = "/api/v1"
    
    # Project & Hackathon Metadata
    TEAM_NAME: str = "HACKSTACK"
    PROBLEM_ID: str = "SH-AGR-005"
    HACKATHON: str = "Smart Horizon 2026 — 48-Hour International Hackathon"
    
    # Mode & Transparency (Honest Demo Simulation)
    DATA_MODE: str = "DEMO_SIMULATION"
    DEMO_DISCLAIMER: str = (
        "Demo Simulation Mode: Initial backend operational with deterministic 5,260-station telemetry "
        "and simulated hydrogeological models. Real India-WRIS, CGWB, and IMD ingestion adapters "
        "are architected for live production connection."
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
    
    # System Runtime Stats
    BOOT_TIMESTAMP: float = time.time()
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173", "*"]


settings = Settings()
