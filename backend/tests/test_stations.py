import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.pipeline.dwlr_ingest import station_repo


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase B Stations API Validation")
    print("==================================================")
    
    client = TestClient(app)

    # 1. Dataset Loading & Count
    print("1. Testing Dataset Ingestion & Cache...")
    all_stations = station_repo.get_all()
    assert len(all_stations) == 5260, f"Expected 5260 stations, found {len(all_stations)}"
    print(f"   [OK] Loaded exactly {len(all_stations)} stations.")

    # 2. Station ID Uniqueness
    print("2. Testing Station ID Uniqueness...")
    unique_ids = set(s.id for s in all_stations)
    assert len(unique_ids) == 5260, f"Duplicate station IDs found: {5260 - len(unique_ids)} duplicates"
    print("   [OK] All 5,260 station IDs are unique.")

    # 3. Coordinate & Metric Validity
    print("3. Validating Coordinates, Depths, and Risk Ranges...")
    for s in all_stations:
        assert 6.0 <= s.latitude <= 38.0, f"Invalid latitude: {s.latitude} for {s.id}"
        assert 68.0 <= s.longitude <= 98.0, f"Invalid longitude: {s.longitude} for {s.id}"
        assert s.waterLevel >= 0.0, f"Invalid water level: {s.waterLevel} for {s.id}"
        assert 0.0 <= s.riskScore <= 1.0, f"Invalid risk score: {s.riskScore} for {s.id}"
    print("   [OK] All 5,260 station coordinates and metrics are valid.")

    # 4. Anchor Station Consistency Check
    print("4. Testing Anchor Station Data Integrity...")
    pb_station = station_repo.get_by_id("DWLR-PB-001")
    assert pb_station is not None, "Anchor DWLR-PB-001 not found"
    assert pb_station.district == "Sangrur"
    assert pb_station.waterLevel == 28.4
    assert pb_station.status == "critical"
    assert pb_station.trend == "falling"
    assert len(pb_station.historicalData) == 6
    print("   [OK] Anchor station DWLR-PB-001 matches frontend specification.")

    # 5. GET /api/v1/stations Endpoint & Pagination
    print("5. Testing GET /api/v1/stations with Pagination...")
    res = client.get("/api/v1/stations?limit=25&offset=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 5260
    assert len(data["stations"]) == 25
    assert data["limit"] == 25
    assert data["offset"] == 50
    assert data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] GET /api/v1/stations pagination validated (returned 25 of 5260).")

    # 6. State Filter
    print("6. Testing State Filter (Karnataka)...")
    res_ka = client.get("/api/v1/stations?state=Karnataka&limit=500")
    assert res_ka.status_code == 200
    data_ka = res_ka.json()
    assert data_ka["total"] > 0
    for st in data_ka["stations"]:
        assert st["state"] == "Karnataka"
    print(f"   [OK] State filter returned {data_ka['total']} Karnataka stations.")

    # 7. District Filter
    print("7. Testing District Filter (Kolar)...")
    res_kol = client.get("/api/v1/stations?district=Kolar")
    assert res_kol.status_code == 200
    data_kol = res_kol.json()
    assert data_kol["total"] > 0
    for st in data_kol["stations"]:
        assert st["district"] == "Kolar"
    print(f"   [OK] District filter returned {data_kol['total']} Kolar stations.")

    # 8. Status Filter
    print("8. Testing Status Filter (Critical)...")
    res_crit = client.get("/api/v1/stations?status=critical&limit=100")
    assert res_crit.status_code == 200
    data_crit = res_crit.json()
    assert data_crit["total"] > 0
    for st in data_crit["stations"]:
        assert st["status"] == "critical"
    print(f"   [OK] Status filter returned {data_crit['total']} critical stations.")

    # 9. Trend Filter
    print("9. Testing Trend Filter (Falling)...")
    res_fall = client.get("/api/v1/stations?trend=falling&limit=100")
    assert res_fall.status_code == 200
    data_fall = res_fall.json()
    assert data_fall["total"] > 0
    for st in data_fall["stations"]:
        assert st["trend"] == "falling"
    print(f"   [OK] Trend filter returned {data_fall['total']} falling stations.")

    # 10. Risk Filter
    print("10. Testing Risk Filter (Critical >= 0.8)...")
    res_risk = client.get("/api/v1/stations?risk=critical&limit=100")
    assert res_risk.status_code == 200
    data_risk = res_risk.json()
    assert data_risk["total"] > 0
    for st in data_risk["stations"]:
        assert st["riskScore"] >= 0.8
    print(f"   [OK] Risk filter returned {data_risk['total']} high-risk stations.")

    # 11. Search Endpoint
    print("11. Testing Search Endpoint (q=kolar)...")
    res_search = client.get("/api/v1/stations/search?q=kolar&limit=20")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total_matches"] > 0
    assert data_search["query"] == "kolar"
    print(f"   [OK] Search returned {data_search['total_matches']} matches for 'kolar'.")

    # 12. Station Detail Endpoint
    print("12. Testing GET /api/v1/stations/{station_id}...")
    res_detail = client.get("/api/v1/stations/DWLR-PB-001")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == "DWLR-PB-001"
    assert detail["district"] == "Sangrur"
    assert "farmerSummary" in detail
    assert "actionableAdvice" in detail
    print("   [OK] GET /api/v1/stations/DWLR-PB-001 returned full station details.")

    # 13. Nonexistent Station 404
    print("13. Testing 404 for Nonexistent Station...")
    res_404 = client.get("/api/v1/stations/DWLR-NONEXISTENT-9999")
    assert res_404.status_code == 404
    print("   [OK] Nonexistent station returned 404 Not Found.")

    # 14. Station Summary Endpoint
    print("14. Testing GET /api/v1/stations/summary...")
    res_sum = client.get("/api/v1/stations/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["totalStations"] == 5260
    assert sum_data["healthyCount"] + sum_data["moderateCount"] + sum_data["warningCount"] + sum_data["criticalCount"] == 5260
    assert sum_data["avgDepthMbgl"] > 0
    assert sum_data["avgRiskScore"] > 0
    assert sum_data["statesCount"] >= 13
    assert sum_data["data_mode"] == "DEMO_SIMULATION"
    print(f"   [OK] Network Summary verified: {sum_data['healthyCount']} Healthy, {sum_data['moderateCount']} Moderate, {sum_data['warningCount']} Warning, {sum_data['criticalCount']} Critical.")

    print("\n==================================================")
    print("ALL PHASE B STATION TESTS PASSED CLEANLY (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
