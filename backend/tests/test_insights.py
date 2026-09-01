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
from app.engines.insight_engine import insight_engine


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Executive Intelligence Engine Tests")
    print("==================================================")

    client = TestClient(app)

    # 1. Direct Engine Executive Summary
    print("1. Testing JalKrishiInsightEngine.get_executive_summary()...")
    summary = insight_engine.get_executive_summary()
    assert summary.confidence_level == "HIGH"
    assert summary.network_metrics["total_stations"] == 5260
    assert len(summary.top_priority_regions) >= 5
    assert len(summary.cross_system_links) >= 5
    print("   [OK] Engine executive summary generated successfully.")

    # 2. REST API GET /api/v1/insights/summary
    print("2. Testing REST API GET /api/v1/insights/summary...")
    res1 = client.get("/api/v1/insights/summary")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["confidence_level"] == "HIGH"
    assert d1["data_mode"] == "DEMO_SIMULATION"
    assert d1["network_metrics"]["total_stations"] == 5260
    print("   [OK] REST API insights summary endpoint verified.")

    # 3. Direct Engine Station Insight
    print("3. Testing JalKrishiInsightEngine.get_station_insight('DWLR-PB-001')...")
    st_insight = insight_engine.get_station_insight("DWLR-PB-001")
    assert st_insight.station_id == "DWLR-PB-001"
    assert st_insight.state == "Punjab"
    assert len(st_insight.recommended_crops) > 0
    print("   [OK] Engine station insight generated successfully.")

    # 4. REST API GET /api/v1/insights/station/DWLR-PB-001
    print("4. Testing REST API GET /api/v1/insights/station/DWLR-PB-001...")
    res2 = client.get("/api/v1/insights/station/DWLR-PB-001")
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["station_id"] == "DWLR-PB-001"
    assert d2["district"] == "Sangrur"
    assert d2["confidence_level"] == "HIGH"
    print("   [OK] REST API station insight endpoint verified.")

    # 5. Invalid Station ID Handling
    print("5. Testing Invalid Station ID -> 404...")
    res3 = client.get("/api/v1/insights/station/INVALID-WELL-9999")
    assert res3.status_code == 404
    print("   [OK] Invalid station ID handling verified.")

    print("\n==================================================")
    print("ALL INSIGHT ENGINE TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
