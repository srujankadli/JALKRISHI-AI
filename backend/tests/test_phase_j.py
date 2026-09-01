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
from app.pipeline.dwlr_ingest import station_repo


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase J Production Hardening Tests")
    print("==================================================")

    client = TestClient(app)

    # 1. Test GET /health (Root Health)
    print("1. Testing GET /health...")
    res1 = client.get("/health")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["status"] == "healthy"
    assert d1["data_mode"] == "DEMO_SIMULATION"
    assert d1["station_count"] == 5260
    print("   [OK] Root health check verified.")

    # 2. Test GET /api/v1/health
    print("2. Testing GET /api/v1/health...")
    res2 = client.get("/api/v1/health")
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["status"] == "healthy"
    assert d2["active_source"] == "DEMO_SIMULATION"
    print("   [OK] API v1 health check verified.")

    # 3. Test GET /api/v1/ready (Readiness Probe)
    print("3. Testing GET /api/v1/ready...")
    res3 = client.get("/api/v1/ready")
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["ready"] is True
    assert d3["station_count"] == 5260
    print("   [OK] Readiness probe verified.")

    # 4. Test GET /api/v1/system/status (Full System Status & Diagnostics)
    print("4. Testing GET /api/v1/system/status...")
    res4 = client.get("/api/v1/system/status")
    assert res4.status_code == 200
    d4 = res4.json()
    assert d4["status"] == "healthy"
    assert d4["data_mode"] == "DEMO_SIMULATION"
    assert d4["station_count"] == 5260
    assert d4["data_quality_score"] == 100.0
    assert d4["engines"]["analytics"] == "available"
    assert d4["engines"]["forecasting"] == "available"
    assert d4["engines"]["anomaly_detection"] == "available"
    assert d4["engines"]["crop_recommender"] == "available"
    assert d4["engines"]["whatsapp"] == "available"
    assert d4["future_adapters"]["india_wris"] == "NOT_CONFIGURED"
    assert d4["future_adapters"]["cgwb"] == "NOT_CONFIGURED"
    assert d4["future_adapters"]["imd"] == "NOT_CONFIGURED"
    print("   [OK] System diagnostics & engine status verified.")

    # 5. DEMO_SIMULATION Transparency Invariant
    print("5. Checking DEMO_SIMULATION Mode Invariant...")
    assert settings.DATA_MODE == "DEMO_SIMULATION"
    assert "Demo Simulation Mode" in settings.DEMO_DISCLAIMER
    print("   [OK] DEMO_SIMULATION mode invariant confirmed.")

    # 6. Station Count Invariant
    print("6. Validating Station Repository (Exactly 5,260 Nodes)...")
    stations = station_repo.get_all()
    assert len(stations) == 5260
    print("   [OK] Exactly 5,260 station repository count verified.")

    # 7. Invalid Station Query -> 404 Error Response Format
    print("7. Testing Invalid Station ID -> 404 Error Format...")
    res7 = client.get("/api/v1/stations/DWLR-NONEXISTENT-9999")
    assert res7.status_code == 404
    d7 = res7.json()
    assert d7["status_code"] == 404
    assert "DWLR Station" in d7["detail"]
    assert "request_id" in d7
    assert "timestamp" in d7
    print("   [OK] Structured 404 error response verified.")

    # 8. Invalid Forecast Horizon -> 422 Error Response
    print("8. Testing Invalid Forecast Horizon (days=45) -> 422 Error Format...")
    res8 = client.get("/api/v1/forecast/DWLR-PB-001?days=45")
    assert res8.status_code == 422
    d8 = res8.json()
    assert d8["status_code"] == 422
    assert "days" in d8["detail"].lower() or "horizon" in d8["detail"].lower()
    print("   [OK] Structured 422 error response verified.")

    # 9. Invalid Crop Input -> 422 Error
    print("9. Testing Invalid Crop Recommendation Input (farm_area_acres = -5.0)...")
    res9 = client.post("/api/v1/crops/recommend", json={"farm_area_acres": -5.0, "state": "Punjab", "district": "Sangrur", "soil_type": "Alluvial", "season": "Rabi", "rainfall_condition": "Normal", "water_availability": "Limited"})
    assert res9.status_code == 422
    d9 = res9.json()
    assert d9["status_code"] == 422
    assert "greater than" in str(d9).lower()
    print("   [OK] Crop validation error response verified.")

    # 10. Invalid Analytics Parameters
    print("10. Testing Invalid Analytics Parameters...")
    res10 = client.get("/api/v1/analytics/trend?days=-10")
    assert res10.status_code == 422
    d10 = res10.json()
    assert d10["status_code"] == 422
    print("   [OK] Analytics parameter validation verified.")

    # 11. Malformed Request Payload Handling
    print("11. Testing Malformed JSON Request Handling...")
    res11 = client.post(
        "/api/v1/crops/recommend",
        content="NOT_VALID_JSON{{{",
        headers={"Content-Type": "application/json"},
    )
    assert res11.status_code == 422
    d11 = res11.json()
    assert d11["error"] == "Validation Error"
    assert "request_id" in d11
    print("   [OK] Malformed JSON error handling verified.")

    # 12. CSV Payload Size Protection Check
    print("12. Testing CSV Payload Size Protection...")
    huge_csv = "station_id,name\n" + ("x" * (settings.CSV_MAX_SIZE_BYTES + 1000))
    res12 = client.post(
        "/api/v1/data/validate-csv",
        json={"csv_content": huge_csv},
        headers={"Content-Length": str(len(huge_csv) + 100)},
    )
    assert res12.status_code == 413
    d12 = res12.json()
    assert "Payload Too Large" in d12["error"]
    print("   [OK] Payload size limit (413) verified.")

    # 13. Pagination Limits Check
    print("13. Testing Pagination Parameters & Bounds...")
    res13 = client.get("/api/v1/stations?limit=5&offset=0")
    assert res13.status_code == 200
    assert len(res13.json()["stations"]) == 5
    print("   [OK] Station pagination parameters verified.")

    # 14. Structured Error Headers Check (X-Request-ID & X-Process-Time)
    print("14. Testing Response Timing & Request ID Headers...")
    res14 = client.get("/api/v1/stations/summary")
    assert res14.status_code == 200
    assert "X-Request-ID" in res14.headers
    assert "X-Process-Time" in res14.headers
    print("   [OK] Request-ID and Process-Time headers verified.")

    # 15. Deterministic System Status Repeatability
    print("15. Testing System Status Deterministic Repeatability...")
    s1 = client.get("/api/v1/system/status").json()
    s2 = client.get("/api/v1/system/status").json()
    assert s1["station_count"] == s2["station_count"] == 5260
    assert s1["data_quality_score"] == s2["data_quality_score"] == 100.0
    print("   [OK] Deterministic system status confirmed.")

    # 16. Existing CORS Configuration Check
    print("16. Verifying CORS Origins Setup...")
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert "http://127.0.0.1:5173" in settings.CORS_ORIGINS
    print("   [OK] CORS configuration verified.")

    # 17. Engine Availability Matrix Verification
    print("17. Verifying Engine Availability Matrix...")
    assert d4["engines"]["analytics"] == "available"
    assert d4["engines"]["forecasting"] == "available"
    assert d4["engines"]["anomaly_detection"] == "available"
    assert d4["engines"]["crop_recommender"] == "available"
    assert d4["engines"]["whatsapp"] == "available"
    print("   [OK] Engine availability matrix verified.")

    # 18. Data Quality Score Reporting Check
    print("18. Verifying Data Quality Reporting (100.0%)...")
    assert d4["data_quality_score"] == 100.0
    print("   [OK] Data quality reporting verified.")

    print("\n==================================================")
    print("ALL PHASE J PRODUCTION HARDENING TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
