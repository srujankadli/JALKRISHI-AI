"""
JalKrishi AI — Satellite Groundwater Test Suite (Phase N)
---------------------------------------------------------
Comprehensive tests covering coordinate validation, spatial coverage determination,
deterministic satellite-assisted groundwater estimates, indicator breakdown,
unconfigured adapter status, data transparency disclaimers, and health checks.
"""

import os
import sys

# Add backend directory to PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.engines.satellite_groundwater import satellite_groundwater_engine, haversine_distance_km

client = TestClient(app)


def test_haversine_distance_calculation():
    """Verify geodesic distance calculation between coordinates."""
    # Distance between Bangalore (12.9716, 77.5946) and Kolar (13.1367, 78.1292) ~ 61 km
    d = haversine_distance_km(12.9716, 77.5946, 13.1367, 78.1292)
    assert 55.0 <= d <= 70.0


def test_coordinate_validation():
    """Verify HTTP 400 response for invalid latitude/longitude."""
    res_lat = client.get("/api/v1/satellite-groundwater/estimate?latitude=120.0&longitude=78.21")
    assert res_lat.status_code == 400
    assert "Invalid latitude" in res_lat.json()["detail"]

    res_lon = client.get("/api/v1/satellite-groundwater/estimate?latitude=13.13&longitude=-200.0")
    assert res_lon.status_code == 400
    assert "Invalid longitude" in res_lon.json()["detail"]


def test_satellite_groundwater_estimate_endpoint():
    """Verify satellite-assisted groundwater estimate response schema and bounds."""
    response = client.get("/api/v1/satellite-groundwater/estimate?latitude=13.13&longitude=78.21")
    assert response.status_code == 200
    data = response.json()

    assert "latitude" in data
    assert "longitude" in data
    assert "dwlr_available" in data
    assert "nearest_station_distance_km" in data
    assert "estimation_mode" in data
    assert data["estimation_mode"] in ["DIRECT_DWLR", "SATELLITE_ASSISTED"]
    assert "groundwater_condition" in data
    assert data["groundwater_condition"] in ["LOW_STRESS", "MODERATE_STRESS", "HIGH_STRESS", "CRITICAL_STRESS"]

    # Stress score bounds
    assert 0.0 <= data["groundwater_stress_score"] <= 1.0
    # Confidence score bounds
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]

    # Indicators presence
    indicators = data["indicators"]
    assert "surface_temperature_signal" in indicators
    assert "vegetation_water_stress" in indicators
    assert "water_storage_anomaly" in indicators
    assert "ground_deformation_signal" in indicators
    assert "rainfall_signal" in indicators
    assert "nearby_dwlr_signal" in indicators

    # Transparency disclaimer check
    assert "Satellite-Assisted Estimate" in data["disclaimer"]
    assert "NOT a direct well-level" in data["disclaimer"]


def test_coverage_endpoint():
    """Verify DWLR vs Satellite Coverage classification."""
    response = client.get("/api/v1/satellite-groundwater/coverage?latitude=13.13&longitude=78.21&radius_km=15.0")
    assert response.status_code == 200
    data = response.json()

    assert "coverage_type" in data
    assert data["coverage_type"] in ["Direct Measurement", "Satellite-Assisted Estimate"]
    assert data["radius_km"] == 15.0
    assert "nearest_station_distance_km" in data


def test_indicators_endpoint():
    """Verify detailed indicator breakdown endpoint."""
    response = client.get("/api/v1/satellite-groundwater/indicators?latitude=15.31&longitude=75.71")
    assert response.status_code == 200
    indicators = response.json()

    assert "surface_temperature_signal" in indicators
    assert "vegetation_water_stress" in indicators
    assert indicators["vegetation_water_stress"]["source"] == "REMOTE_SENSING_SIMULATION"


def test_sources_and_unconfigured_adapters():
    """Verify registration status of data adapters including NOT_CONFIGURED stubs."""
    response = client.get("/api/v1/satellite-groundwater/sources")
    assert response.status_code == 200
    sources = response.json()

    assert len(sources) >= 4
    categories = [s["category"] for s in sources]
    assert "Terrestrial Water Storage" in categories
    assert "SAR Ground Deformation" in categories

    # Verify NOT_CONFIGURED status for unconfigured adapters
    grace_source = next(s for s in sources if s["category"] == "Terrestrial Water Storage")
    assert grace_source["status"] == "NOT_CONFIGURED"


def test_subsystem_health_endpoint():
    """Verify satellite groundwater subsystem health check."""
    response = client.get("/api/v1/satellite-groundwater/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "HEALTHY"
    assert data["subsystem"] == "Satellite-Assisted Groundwater Engine"
    assert "coverage_radius_km" in data


if __name__ == "__main__":
    print("Running test_satellite_groundwater.py...")
    test_haversine_distance_calculation()
    test_coordinate_validation()
    test_satellite_groundwater_estimate_endpoint()
    test_coverage_endpoint()
    test_indicators_endpoint()
    test_sources_and_unconfigured_adapters()
    test_subsystem_health_endpoint()
    print("ALL SATELLITE GROUNDWATER BACKEND TESTS PASSED CLEANLY!")
