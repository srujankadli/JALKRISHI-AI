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
from app.config import settings, Settings
from app.pipeline.dwlr_ingest import station_repo


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase K Production Setup Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Health & Readiness Verification
    print("1. Validating Production Health & Readiness Endpoints...")
    res_h = client.get("/health")
    assert res_h.status_code == 200
    assert res_h.json()["status"] == "healthy"

    res_r = client.get("/api/v1/ready")
    assert res_r.status_code == 200
    assert res_r.json()["ready"] is True
    assert res_r.json()["station_count"] == 5260
    print("   [OK] Production health & readiness endpoints verified.")

    # 2. System Status & Diagnostics Verification
    print("2. Validating System Status & Engine Diagnostics...")
    res_sys = client.get("/api/v1/system/status")
    assert res_sys.status_code == 200
    sys_data = res_sys.json()
    assert sys_data["status"] == "healthy"
    assert sys_data["data_mode"] == "DEMO_SIMULATION"
    assert sys_data["station_count"] == 5260
    assert sys_data["data_quality_score"] == 100.0
    assert sys_data["future_adapters"]["india_wris"] == "NOT_CONFIGURED"
    assert sys_data["future_adapters"]["cgwb"] == "NOT_CONFIGURED"
    assert sys_data["future_adapters"]["imd"] == "NOT_CONFIGURED"
    print("   [OK] System diagnostics & adapter states verified.")

    # 3. DEMO_SIMULATION Transparency Invariant
    print("3. Validating DEMO_SIMULATION Mode Invariant...")
    assert settings.DATA_MODE == "DEMO_SIMULATION"
    assert "Demo Simulation Mode" in settings.DEMO_DISCLAIMER
    print("   [OK] DEMO_SIMULATION transparency invariant confirmed.")

    # 4. CORS Origins Configuration Validation
    print("4. Testing Production CORS Origins Parsing...")
    parsed_cors = Settings.assemble_cors_origins("https://jalkrishi-ai.vercel.app, https://jalkrishi.gov.in")
    assert "https://jalkrishi-ai.vercel.app" in parsed_cors
    assert "https://jalkrishi.gov.in" in parsed_cors
    print("   [OK] Production CORS origin string parsing verified.")

    # 5. Core Microservice Endpoints Smoke Test
    print("5. Running Core Microservice Endpoints Smoke Test...")

    # A. Station Summary
    res_st = client.get("/api/v1/stations/summary")
    assert res_st.status_code == 200
    assert res_st.json()["totalStations"] == 5260

    # B. Station Filtering
    res_st_list = client.get("/api/v1/stations?limit=10")
    assert res_st_list.status_code == 200
    assert len(res_st_list.json()["stations"]) == 10

    # C. Station Details
    res_st_detail = client.get("/api/v1/stations/DWLR-PB-001")
    assert res_st_detail.status_code == 200
    assert res_st_detail.json()["district"] == "Sangrur"

    # D. Forecast Summary
    res_fc = client.get("/api/v1/forecast/summary")
    assert res_fc.status_code == 200
    assert res_fc.json()["total_stations"] == 5260

    # E. Station Forecast
    res_fc_st = client.get("/api/v1/forecast/DWLR-PB-001?days=30")
    assert res_fc_st.status_code == 200
    assert res_fc_st.json()["horizon_days"] == 30

    # F. Anomalies Feed
    res_anom = client.get("/api/v1/anomalies?limit=10")
    assert res_anom.status_code == 200
    assert res_anom.json()["total"] > 0

    # G. Crop Recommendation
    crop_req = {
        "state": "Karnataka",
        "district": "Kolar",
        "soil_type": "Loamy",
        "season": "Rabi",
        "rainfall_condition": "Normal",
        "water_availability": "Limited",
    }
    res_crop = client.post("/api/v1/crops/recommend", json=crop_req)
    assert res_crop.status_code == 200
    assert len(res_crop.json()["top_recommendations"]) > 0

    # H. Regional Analytics Summary
    res_an = client.get("/api/v1/analytics/summary")
    assert res_an.status_code == 200
    assert res_an.json()["total_stations"] == 5260

    # I. WhatsApp Webhook
    wa_req = {"message": "Kolar water", "language": "en"}
    res_wa = client.post("/api/v1/whatsapp/webhook", json=wa_req)
    assert res_wa.status_code == 200
    assert res_wa.json()["intent"] == "WATER_STATUS"

    # J. Data Status
    res_ds = client.get("/api/v1/data/status")
    assert res_ds.status_code == 200
    assert res_ds.json()["station_count"] == 5260

    print("   [OK] All 10 core API microservices verified with 200 OK.")

    print("\n==================================================")
    print("ALL PHASE K PRODUCTION SETUP TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
