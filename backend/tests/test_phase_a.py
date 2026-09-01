import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.models.schemas import (
    StationStatus,
    TrendDirection,
    SoilType,
    CropSeason,
    HealthResponse,
    VersionResponse,
    DWLRStationSchema,
)


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase A Backend Validation Test")
    print("==================================================")
    
    # 1. Test Schema Instantiation
    print("1. Testing Pydantic Schemas...")
    test_station = DWLRStationSchema(
        id="station-test-1",
        stationCode="DWLR-PB-001",
        stationName="Sangrur Central Well",
        state="Punjab",
        district="Sangrur",
        block="Bhawanigarh",
        latitude=30.245,
        longitude=75.842,
        waterLevel=28.4,
        previousWaterLevel=27.8,
        seasonalAverage=24.5,
        criticalThreshold=26.0,
        riskScore=0.88,
        status=StationStatus.CRITICAL,
        trend=TrendDirection.FALLING,
        trendRateMetersPerMonth=-0.85,
        daysToCritical=18,
        batteryLevel=94,
        telemetryStatus="online",
        lastUpdated="2026-09-01T08:00:00Z",
        soilType=SoilType.ALLUVIAL.value,
        aquiferType="Alluvial Sand & Gravel",
    )
    assert test_station.status == StationStatus.CRITICAL
    assert test_station.riskScore == 0.88
    print("   [OK] Pydantic schemas validated successfully.")

    # 2. Test FastAPI TestClient
    print("2. Testing FastAPI TestClient & Health Routes...")
    client = TestClient(app)

    # Root endpoint
    res_root = client.get("/")
    assert res_root.status_code == 200, f"Root returned {res_root.status_code}"
    data_root = res_root.json()
    assert data_root["team"] == "HACKSTACK"
    assert data_root["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] GET / returned 200 OK with HACKSTACK metadata.")

    # Healthcheck endpoint
    res_health = client.get("/health")
    assert res_health.status_code == 200, f"Health returned {res_health.status_code}"
    health_data = res_health.json()
    assert health_data["status"] == "healthy"
    assert health_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] GET /health returned 200 OK (Status: healthy).")

    # API v1 Healthcheck endpoint
    res_v1_health = client.get("/api/v1/health")
    assert res_v1_health.status_code == 200
    print("   [OK] GET /api/v1/health returned 200 OK.")

    # Version endpoint
    res_ver = client.get("/api/v1/version")
    assert res_ver.status_code == 200
    ver_data = res_ver.json()
    assert ver_data["problem_id"] == "SH-AGR-005"
    assert len(ver_data["data_source_adapters"]) == 3
    print("   [OK] GET /api/v1/version returned 200 OK (3 Ingestion Adapters configured).")

    print("\n==================================================")
    print("ALL PHASE A BACKEND TESTS PASSED CLEANLY (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
