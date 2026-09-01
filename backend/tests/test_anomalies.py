import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase E Anomaly Detection Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Anomaly Feed Endpoint
    print("1. Testing GET /api/v1/anomalies...")
    res = client.get("/api/v1/anomalies?limit=25")
    assert res.status_code == 200, f"Status {res.status_code}"
    feed_data = res.json()
    assert feed_data["total"] > 0
    assert len(feed_data["anomalies"]) == 25
    assert feed_data["data_mode"] == "DEMO_SIMULATION"
    print(f"   [OK] Anomaly feed returned 200 OK with {feed_data['total']} total anomalies.")

    # 2. Anomaly Summary Endpoint & Invariants
    print("2. Testing GET /api/v1/anomalies/summary & Category Invariants...")
    res_sum = client.get("/api/v1/anomalies/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    total = sum_data["total_anomalies"]
    assert total > 0

    # Severity sum invariant
    sev_sum = sum_data["critical_count"] + sum_data["high_count"] + sum_data["warning_count"] + sum_data["info_count"]
    assert sev_sum == total, f"Severity sum {sev_sum} != total {total}"

    # Category sum invariant (all 5 categories)
    cat_sum = (
        sum_data["sudden_drop_count"]
        + sum_data["sudden_rise_count"]
        + sum_data["possible_extraction_count"]
        + sum_data["missing_data_count"]
        + sum_data["sensor_error_count"]
    )
    assert cat_sum == total, f"Category sum {cat_sum} != total {total}"
    assert sum_data["stations_affected"] > 0
    print(f"   [OK] Summary invariant verified: {total} total anomalies across {sum_data['stations_affected']} affected wells.")

    # 3. Distribution Endpoint
    print("3. Testing GET /api/v1/anomalies/distribution...")
    res_dist = client.get("/api/v1/anomalies/distribution")
    assert res_dist.status_code == 200
    dist_data = res_dist.json()
    assert dist_data["total"] == total
    assert sum(dist_data["by_category"].values()) == total
    assert sum(dist_data["by_severity"].values()) == total
    print("   [OK] Distribution categories and severities match summary totals 100%.")

    # 4. State Summary Endpoint
    print("4. Testing GET /api/v1/anomalies/states...")
    res_states = client.get("/api/v1/anomalies/states")
    assert res_states.status_code == 200
    states_data = res_states.json()
    assert states_data["total_states"] >= 10
    total_state_anoms = sum(s["total_anomalies"] for s in states_data["states"])
    assert total_state_anoms == total
    print(f"   [OK] State anomaly breakdown verified across {states_data['total_states']} states summing to {total} anomalies.")

    # 5. Category Filtering (Sudden Drop)
    print("5. Testing Category Filter (category=Sudden Groundwater Drop)...")
    res_cat = client.get("/api/v1/anomalies?category=Sudden Groundwater Drop&limit=100")
    assert res_cat.status_code == 200
    cat_data = res_cat.json()
    assert cat_data["total"] > 0
    for a in cat_data["anomalies"]:
        assert a["category"] == "Sudden Groundwater Drop"
    print(f"   [OK] Category filter returned {cat_data['total']} sudden drop anomalies.")

    # 6. Severity Filtering (Critical)
    print("6. Testing Severity Filter (severity=Critical)...")
    res_sev = client.get("/api/v1/anomalies?severity=Critical&limit=100")
    assert res_sev.status_code == 200
    sev_data = res_sev.json()
    assert sev_data["total"] > 0
    for a in sev_data["anomalies"]:
        assert a["severity"] == "Critical"
    print(f"   [OK] Severity filter returned {sev_data['total']} critical anomalies.")

    # 7. Station Anomalies Endpoint
    print("7. Testing GET /api/v1/anomalies/station/DWLR-PB-001...")
    res_st = client.get("/api/v1/anomalies/station/DWLR-PB-001")
    assert res_st.status_code == 200
    st_anoms = res_st.json()
    assert len(st_anoms) >= 1
    assert st_anoms[0]["station_id"] == "DWLR-PB-001"
    print(f"   [OK] Found {len(st_anoms)} anomalies for station DWLR-PB-001.")

    # 8. Unknown Station 404
    print("8. Testing Unknown Station ID (404)...")
    res_404 = client.get("/api/v1/anomalies/station/DWLR-NONEXISTENT-9999")
    assert res_404.status_code == 404
    print("   [OK] Unknown station returned 404 Not Found.")

    # 9. Cautious & Non-Judgmental Verification Language
    print("9. Validating Cautious Language in Extraction and Sensor Anomalies...")
    for a in feed_data["anomalies"]:
        if a["category"] == "Possible Abnormal Extraction":
            assert "requires verification" in a["description"].lower() or a["verification_status"] == "Requires Verification"
            assert "illegal pumping" not in a["description"].lower()
            assert "illegal extraction" not in a["description"].lower()
        if a["category"] == "Potential Sensor Error":
            assert "requires verification" in a["description"].lower() or a["verification_status"] == "Requires Verification"
            assert "confirmed failure" not in a["description"].lower()
    print("   [OK] Cautious language validated: zero illegal pumping claims, non-judgmental wording throughout.")

    # 10. Deterministic Repeatability
    print("10. Testing Deterministic Repeatability...")
    res_repeat = client.get("/api/v1/anomalies?limit=25")
    assert res.json() == res_repeat.json()
    print("   [OK] Deterministic repeatability confirmed (100% identical outputs).")

    print("\n==================================================")
    print("ALL PHASE E ANOMALY TESTS PASSED CLEANLY (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
