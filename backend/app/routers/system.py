import time
from datetime import datetime
from fastapi import APIRouter, status, HTTPException
from app.config import settings
from app.pipeline.dwlr_ingest import station_repo
from app.pipeline.ingestion_manager import ingestion_manager

router = APIRouter(tags=["Health & System Diagnostics"])


@router.get("/health", summary="Root Health Check")
@router.get("/api/v1/health", summary="API v1 Health Check")
@router.get("/api/health", summary="API Health Check")
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "data_mode": settings.DATA_MODE,
        "active_source": ingestion_manager.active_source.value,
        "station_count": len(station_repo.get_all()),
        "disclaimer": settings.DEMO_DISCLAIMER,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/api/v1/ready", summary="Readiness Probe")
@router.get("/api/ready", summary="Readiness Probe Alias")
def readiness_check():
    stations = station_repo.get_all()
    if not stations or len(stations) == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Station repository not initialized",
        )
    return {
        "ready": True,
        "status": "ready",
        "station_count": len(stations),
        "data_mode": settings.DATA_MODE,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/api/v1/system/status", summary="Full System Status & Diagnostics")
@router.get("/api/system/status", summary="System Status Alias")
def system_status():
    stations = station_repo.get_all()
    uptime_sec = round(time.time() - settings.BOOT_TIMESTAMP, 1)
    q_report = ingestion_manager.get_quality_report()

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "data_mode": settings.DATA_MODE,
        "active_source": ingestion_manager.active_source.value,
        "station_count": len(stations),
        "telemetry_record_count": sum(len(s.historicalData or []) + 1 for s in stations),
        "data_quality_score": q_report.quality_score,
        "uptime_seconds": uptime_sec,
        "engines": {
            "dwlr_station_repository": "available",
            "analytics": "available",
            "forecasting": "available",
            "anomaly_detection": "available",
            "crop_recommender": "available",
            "whatsapp": "available",
            "data_pipeline": "available",
        },
        "available_data_sources": [
            "DEMO_SIMULATION",
            "CSV_IMPORT",
        ],
        "future_adapters": {
            "india_wris": "NOT_CONFIGURED",
            "cgwb": "NOT_CONFIGURED",
            "imd": "NOT_CONFIGURED",
        },
        "disclaimer": settings.DEMO_DISCLAIMER,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
