import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.pipeline.dwlr_ingest import station_repo


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase C Analytics Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Network Summary Endpoint
    print("1. Testing GET /api/v1/analytics/summary...")
    res_sum = client.get("/api/v1/analytics/summary")
    assert res_sum.status_code == 200, f"Status {res_sum.status_code}"
    sum_data = res_sum.json()
    assert sum_data["total_stations"] == 5260, f"Expected 5260, got {sum_data['total_stations']}"
    assert sum_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] Analytics summary returned 200 with 5,260 total stations.")

    # 2. Invariant: Status Counts Sum to Total
    print("2. Validating Status Counts Consistency...")
    h = sum_data["healthy_stations"]
    m = sum_data["moderate_stations"]
    w = sum_data["warning_stations"]
    c = sum_data["critical_stations"]
    assert h + m + w + c == 5260, f"Status sum {h+m+w+c} != 5260"
    print(f"   [OK] Status counts sum: {h} Healthy + {m} Moderate + {w} Warning + {c} Critical = 5260.")

    # 3. Invariant: Trend Counts Sum to Total
    print("3. Validating Trend Counts Consistency...")
    f_cnt = sum_data["falling_trend_count"]
    s_cnt = sum_data["stable_trend_count"]
    r_cnt = sum_data["rising_trend_count"]
    assert f_cnt + s_cnt + r_cnt == 5260, f"Trend sum {f_cnt+s_cnt+r_cnt} != 5260"
    print(f"   [OK] Trend counts sum: {f_cnt} Falling + {s_cnt} Stable + {r_cnt} Rising = 5260.")

    # 4. Cross-Check with Station Repository Summary
    print("4. Cross-checking Analytics Summary with Stations Summary...")
    st_sum_res = client.get("/api/v1/stations/summary")
    st_sum_data = st_sum_res.json()
    assert sum_data["healthy_stations"] == st_sum_data["healthyCount"]
    assert sum_data["moderate_stations"] == st_sum_data["moderateCount"]
    assert sum_data["warning_stations"] == st_sum_data["warningCount"]
    assert sum_data["critical_stations"] == st_sum_data["criticalCount"]
    print("   [OK] Analytics summary matches Stations summary 100%.")

    # 5. State Analytics Endpoint
    print("5. Testing GET /api/v1/analytics/states...")
    res_states = client.get("/api/v1/analytics/states")
    assert res_states.status_code == 200
    states_data = res_states.json()
    assert states_data["total_states"] >= 13
    total_state_stations = sum(st["station_count"] for st in states_data["states"])
    assert total_state_stations == 5260, f"State stations sum {total_state_stations} != 5260"
    print(f"   [OK] State aggregation returned {states_data['total_states']} states summing to 5,260 stations.")

    # 6. State Filter Verification
    print("6. Testing State Filter in State Analytics...")
    res_ka = client.get("/api/v1/analytics/states?state=Karnataka")
    assert res_ka.status_code == 200
    ka_data = res_ka.json()
    assert ka_data["total_states"] == 1
    assert ka_data["states"][0]["state"] == "Karnataka"
    assert ka_data["states"][0]["station_count"] == 540
    print("   [OK] Filtered state analytics for Karnataka returned 540 stations.")

    # 7. State Risk Ranking
    print("7. Testing GET /api/v1/analytics/states/risk-ranking...")
    res_rank = client.get("/api/v1/analytics/states/risk-ranking")
    assert res_rank.status_code == 200
    rank_data = res_rank.json()
    rankings = rank_data["rankings"]
    assert len(rankings) == states_data["total_states"]
    for i in range(len(rankings) - 1):
        assert rankings[i]["risk_score"] >= rankings[i+1]["risk_score"], "Risk ranking not sorted descending"
        assert rankings[i]["rank"] == i + 1
    print(f"   [OK] State risk ranking verified. Top risk state: {rankings[0]['state']} (Score: {rankings[0]['risk_score']}).")

    # 8. District Analytics Endpoint
    print("8. Testing GET /api/v1/analytics/districts...")
    res_dist = client.get("/api/v1/analytics/districts")
    assert res_dist.status_code == 200
    dist_data = res_dist.json()
    assert dist_data["total_districts"] > 0
    total_dist_stations = sum(d["station_count"] for d in dist_data["districts"])
    assert total_dist_stations == 5260, f"District stations sum {total_dist_stations} != 5260"
    print(f"   [OK] District aggregation returned {dist_data['total_districts']} districts summing to 5,260 stations.")

    # 9. District Filter by State
    print("9. Testing District Filter (state=Karnataka)...")
    res_ka_dist = client.get("/api/v1/analytics/districts?state=Karnataka")
    assert res_ka_dist.status_code == 200
    ka_dist_data = res_ka_dist.json()
    for d in ka_dist_data["districts"]:
        assert d["state"] == "Karnataka"
    print(f"   [OK] Returned {ka_dist_data['total_districts']} districts for Karnataka.")

    # 10. District Risk Ranking
    print("10. Testing GET /api/v1/analytics/districts/risk-ranking (limit=5)...")
    res_d_rank = client.get("/api/v1/analytics/districts/risk-ranking?limit=5")
    assert res_d_rank.status_code == 200
    d_rank_data = res_d_rank.json()
    assert len(d_rank_data["rankings"]) == 5
    for i in range(len(d_rank_data["rankings"]) - 1):
        assert d_rank_data["rankings"][i]["risk_score"] >= d_rank_data["rankings"][i+1]["risk_score"]
    print(f"   [OK] Top 5 At-Risk districts correctly ranked (Rank #1: {d_rank_data['rankings'][0]['district']}, {d_rank_data['rankings'][0]['state']}).")

    # 11. Groundwater Trend Summary (7, 30, 90 days)
    print("11. Testing GET /api/v1/analytics/trend...")
    for period in [7, 30, 90]:
        res_trend = client.get(f"/api/v1/analytics/trend?days={period}")
        assert res_trend.status_code == 200, f"Failed for {period} days"
        t_data = res_trend.json()
        assert t_data["period_days"] == period
        assert t_data["station_count"] == 5260
        assert t_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] Observed trend summary verified for 7d, 30d, and 90d periods.")

    # 12. Invalid Trend Period Validation
    print("12. Testing 422 Error on Invalid Trend Period (days=45)...")
    res_invalid = client.get("/api/v1/analytics/trend?days=45")
    assert res_invalid.status_code == 422
    print("   [OK] Invalid period 45 properly rejected with HTTP 422.")

    # 13. Empty Filter Safe Handling
    print("13. Testing Nonexistent Filter Handling...")
    res_empty = client.get("/api/v1/analytics/summary?state=Atlantis")
    assert res_empty.status_code == 200
    empty_data = res_empty.json()
    assert empty_data["total_stations"] == 0
    assert empty_data["average_groundwater_depth"] == 0.0
    print("   [OK] Nonexistent filter returned empty summary safely without error.")

    print("\n==================================================")
    print("ALL PHASE C ANALYTICS TESTS PASSED CLEANLY (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
