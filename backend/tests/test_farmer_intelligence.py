"""
JalKrishi AI — Phase O Unified Farmer Intelligence Test Suite
--------------------------------------------------------------
Tests both Mode A (Direct DWLR) and Mode B (Satellite-Assisted) pipelines,
crop recommendation without DWLR, farmer advice generation, WhatsApp assistant,
uncertainty propagation, and deterministic output.
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.engines.farmer_intelligence import farmer_intelligence_engine
from app.models.schemas import GroundwaterIntelligenceSchema

client = TestClient(app)


def test_mode_a_location_with_dwlr():
    """Test A: Location with DWLR well (Kolar station coordinates ~13.13, 78.13)."""
    lat, lon = 13.13, 78.13
    intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(lat, lon, radius_km=15.0)

    assert isinstance(intel, GroundwaterIntelligenceSchema)
    assert intel.estimation_mode == "DIRECT_DWLR"
    assert intel.coverage_type == "Direct DWLR Measurement"
    assert intel.confidence == "HIGH"
    assert intel.nearest_station_distance_km <= 15.0
    assert len(intel.recommended_crops) > 0
    assert len(intel.farmer_recommendations) >= 3
    print("   [PASS] Test A: Mode A Location with Direct DWLR")


def test_mode_b_location_without_dwlr():
    """Test B: Location without DWLR station (Remote location 20.50, 78.50)."""
    lat, lon = 20.50, 78.50
    intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(lat, lon, radius_km=15.0)

    assert isinstance(intel, GroundwaterIntelligenceSchema)
    assert intel.estimation_mode == "SATELLITE_ASSISTED"
    assert intel.coverage_type == "Satellite-Assisted Estimate"
    assert intel.confidence in ["MEDIUM", "LOW"]
    assert "Satellite-Assisted" in intel.forecast_summary
    assert intel.estimated_depth_range is not None
    assert "Model-derived estimate" in intel.estimated_depth_range
    assert len(intel.recommended_crops) > 0
    assert len(intel.farmer_recommendations) >= 3
    print("   [PASS] Test B: Mode B Location without DWLR Station (Range & Model-Derived Label Verified)")


def test_confidence_propagation():
    """Test C: Uncertainty propagation for low/medium confidence locations."""
    # Very remote coordinate (28.00, 70.00)
    lat, lon = 28.00, 70.00
    intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(lat, lon, radius_km=15.0)

    assert intel.confidence == intel.forecast_confidence
    assert intel.confidence_score <= 0.85
    assert "Confidence Level" in intel.farmer_recommendations[-1]
    print("   [PASS] Test C: Confidence Propagation Across Pipeline")


def test_crop_recommendation_without_dwlr():
    """Test D: Crop recommendation without DWLR station returns valid water-smart crops."""
    response = client.get("/api/v1/intelligence/crop-advice?latitude=21.15&longitude=79.08")
    assert response.status_code == 200
    data = response.json()

    assert "coverage_type" in data
    assert "recommended_crops" in data
    assert len(data["recommended_crops"]) >= 2
    assert "crop_implications" in data
    print("   [PASS] Test D: Crop Recommendation without DWLR Station")


def test_farmer_advice_without_dwlr():
    """Test E: Irrigation & farmer advice endpoints work for remote coordinates."""
    response = client.get("/api/v1/intelligence/irrigation-advice?latitude=15.50&longitude=75.50")
    assert response.status_code == 200
    data = response.json()

    assert "irrigation_implications" in data
    assert "rainfall_signal" in data
    assert data["coverage_type"] in ["Direct DWLR Measurement", "Satellite-Assisted Estimate"]
    print("   [PASS] Test E: Irrigation & Farmer Advice without DWLR Station")


def test_whatsapp_location_without_dwlr():
    """Test F: WhatsApp assistant handles locations without direct DWLR station gracefully."""
    # Query for a district without direct stations
    req_body = {
        "conversation_id": "test-remote-farmer-01",
        "message": "Water status for Remote District",
        "language": "en"
    }
    response = client.post("/api/v1/whatsapp/webhook", json=req_body)
    assert response.status_code == 200
    res_data = response.json()

    assert "reply" in res_data
    # Must NOT say simply "No station found" or "Feature unavailable"
    assert "satellite-assisted" in res_data["reply"].lower() or "jalkrishi" in res_data["reply"].lower()
    print("   [PASS] Test F: WhatsApp Location Query without DWLR")


def test_deterministic_output():
    """Test G: Same coordinates produce identical unified output."""
    lat, lon = 17.3850, 78.4867
    intel1 = farmer_intelligence_engine.get_unified_groundwater_intelligence(lat, lon)
    intel2 = farmer_intelligence_engine.get_unified_groundwater_intelligence(lat, lon)

    assert intel1.estimation_mode == intel2.estimation_mode
    assert intel1.stress_score == intel2.stress_score
    assert intel1.confidence_score == intel2.confidence_score
    assert intel1.recommended_crops == intel2.recommended_crops
    print("   [PASS] Test G: Deterministic Output Verification")


if __name__ == "__main__":
    print("\n==================================================")
    print("RUNNING PHASE O UNIFIED FARMER INTELLIGENCE TESTS")
    print("==================================================")
    test_mode_a_location_with_dwlr()
    test_mode_b_location_without_dwlr()
    test_confidence_propagation()
    test_crop_recommendation_without_dwlr()
    test_farmer_advice_without_dwlr()
    test_whatsapp_location_without_dwlr()
    test_deterministic_output()
    print("==================================================")
    print("ALL PHASE O TESTS PASSED CLEANLY (7/7)!")
    print("==================================================\n")
