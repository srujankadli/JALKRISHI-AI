import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase L Final Presentation Suite")
    print("==================================================")

    client = TestClient(app)

    # 1. Health Probe Verification
    print("1. Testing Health & Readiness Probes...")
    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"

    res_r = client.get("/api/v1/ready")
    assert res_r.status_code == 200
    assert res_r.json()["ready"] is True
    print("   [OK] Health & readiness probes verified.")

    # 2. AI Executive Summary Endpoint
    print("2. Testing GET /api/v1/insights/summary...")
    res_s = client.get("/api/v1/insights/summary")
    assert res_s.status_code == 200
    d_s = res_s.json()
    assert d_s["confidence_level"] in ["HIGH", "MODERATE", "LIMITED"]
    assert "current_situation" in d_s
    assert "top_priority_region" in d_s
    assert "why_it_matters" in d_s
    assert "forecast_outlook" in d_s
    assert "recommended_farmer_action" in d_s
    assert len(d_s["top_priority_regions"]) >= 5
    assert len(d_s["cross_system_links"]) >= 5
    print("   [OK] Executive AI brief endpoint verified.")

    # 3. Station Intelligence Brief Endpoint
    print("3. Testing GET /api/v1/insights/station/DWLR-PB-001...")
    res_st = client.get("/api/v1/insights/station/DWLR-PB-001")
    assert res_st.status_code == 200
    d_st = res_st.json()
    assert d_st["station_id"] == "DWLR-PB-001"
    assert d_st["district"] == "Sangrur"
    assert d_st["state"] == "Punjab"
    assert len(d_st["recommended_crops"]) > 0
    print("   [OK] Station AI brief endpoint verified.")

    # 4. Cross-Module Links Validity
    print("4. Validating Cross-Module Link Targets...")
    links = d_s["cross_system_links"]
    valid_paths = ["/map", "/forecast", "/anomalies", "/crops", "/whatsapp"]
    for link in links:
        assert link["path"] in valid_paths
    print("   [OK] All cross-module intelligence links target valid routes.")

    # 5. DEMO_SIMULATION Mode Invariant
    print("5. Validating DEMO_SIMULATION Transparency Invariant...")
    assert settings.DATA_MODE == "DEMO_SIMULATION"
    assert d_s["data_mode"] == "DEMO_SIMULATION"
    assert d_st["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] DEMO_SIMULATION transparency invariant confirmed.")

    print("\n==================================================")
    print("ALL PHASE L VERIFICATION TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
