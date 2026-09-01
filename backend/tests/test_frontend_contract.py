import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase G Frontend Contract Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Health Endpoint Contract
    print("1. Testing GET /api/v1/health...")
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    h_data = res.json()
    assert h_data["status"] == "healthy"
    assert h_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] Health contract verified.")

    # 2. Stations List & Detail Contracts
    print("2. Testing Stations Contracts (/stations, /{id}, /search, /summary)...")
    res_list = client.get("/api/v1/stations?limit=5")
    assert res_list.status_code == 200
    assert len(res_list.json()["stations"]) == 5

    res_st = client.get("/api/v1/stations/DWLR-PB-001")
    assert res_st.status_code == 200
    assert res_st.json()["id"] == "DWLR-PB-001"

    res_search = client.get("/api/v1/stations/search?q=kolar")
    assert res_search.status_code == 200
    assert res_search.json()["total_matches"] > 0

    res_sum = client.get("/api/v1/stations/summary")
    assert res_sum.status_code == 200
    assert res_sum.json()["totalStations"] == 5260
    print("   [OK] Stations endpoints contract verified.")

    # 3. Analytics Endpoints Contracts
    print("3. Testing Analytics Contracts (/summary, /states, /districts)...")
    res_a_sum = client.get("/api/v1/analytics/summary")
    assert res_a_sum.status_code == 200
    assert res_a_sum.json()["total_stations"] == 5260

    res_a_states = client.get("/api/v1/analytics/states")
    assert res_a_states.status_code == 200
    assert res_a_states.json()["total_states"] == 13

    res_a_dist = client.get("/api/v1/analytics/districts")
    assert res_a_dist.status_code == 200
    assert res_a_dist.json()["total_districts"] == 53
    print("   [OK] Analytics endpoints contract verified.")

    # 4. Forecast Endpoints Contracts
    print("4. Testing Forecast Contracts (/{id}, /summary, /top-risk, /regional)...")
    res_f = client.get("/api/v1/forecast/DWLR-PB-001?days=30")
    assert res_f.status_code == 200
    assert len(res_f.json()["forecast_points"]) == 5

    res_f_sum = client.get("/api/v1/forecast/summary")
    assert res_f_sum.status_code == 200
    assert res_f_sum.json()["total_stations"] == 5260

    res_f_top = client.get("/api/v1/forecast/top-risk?limit=10&days=30")
    assert res_f_top.status_code == 200
    assert len(res_f_top.json()["rankings"]) == 10

    res_f_reg = client.get("/api/v1/forecast/regional?days=90")
    assert res_f_reg.status_code == 200
    assert res_f_reg.json()["total_regions"] == 13
    print("   [OK] Forecast endpoints contract verified.")

    # 5. Anomalies Endpoints Contracts
    print("5. Testing Anomalies Contracts (/anomalies, /summary, /distribution, /states, /station/{id})...")
    res_anom = client.get("/api/v1/anomalies?limit=10")
    assert res_anom.status_code == 200
    assert len(res_anom.json()["anomalies"]) == 10

    res_anom_sum = client.get("/api/v1/anomalies/summary")
    assert res_anom_sum.status_code == 200
    assert res_anom_sum.json()["total_anomalies"] > 0

    res_anom_dist = client.get("/api/v1/anomalies/distribution")
    assert res_anom_dist.status_code == 200
    assert "by_category" in res_anom_dist.json()

    res_anom_states = client.get("/api/v1/anomalies/states")
    assert res_anom_states.status_code == 200

    res_anom_st = client.get("/api/v1/anomalies/station/DWLR-PB-001")
    assert res_anom_st.status_code == 200
    print("   [OK] Anomalies endpoints contract verified.")

    # 6. Crop Recommendation Endpoints Contracts
    print("6. Testing Crop Contracts (/recommend, /compare, /catalog, /methodology)...")
    crop_req = {
        "state": "Karnataka",
        "district": "Kolar",
        "soil_type": "Loamy",
        "season": "Rabi",
        "rainfall_condition": "Normal",
        "water_availability": "Limited",
        "farm_area_acres": 2.0,
    }
    res_c_rec = client.post("/api/v1/crops/recommend", json=crop_req)
    assert res_c_rec.status_code == 200
    c_rec_data = res_c_rec.json()
    assert len(c_rec_data["top_recommendations"]) == 3
    assert len(c_rec_data["not_recommended"]) > 0

    crop_cmp = {
        "state": "Karnataka",
        "district": "Kolar",
        "soil_type": "Loamy",
        "season": "Rabi",
        "rainfall_condition": "Normal",
        "water_availability": "Limited",
        "crop_ids": ["crop-chickpea", "crop-sugarcane"],
    }
    res_c_cmp = client.post("/api/v1/crops/compare", json=crop_cmp)
    assert res_c_cmp.status_code == 200
    assert len(res_c_cmp.json()["comparisons"]) == 2

    res_c_cat = client.get("/api/v1/crops/catalog")
    assert res_c_cat.status_code == 200

    res_c_meth = client.get("/api/v1/crops/methodology")
    assert res_c_meth.status_code == 200
    print("   [OK] Crop endpoints contract verified.")

    print("\n==================================================")
    print("ALL FRONTEND CONTRACT VERIFICATION TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
