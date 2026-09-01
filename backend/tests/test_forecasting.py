import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase D Forecasting Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Station Forecast Endpoint (30 Days)
    print("1. Testing GET /api/v1/forecast/DWLR-PB-001 (30d)...")
    res = client.get("/api/v1/forecast/DWLR-PB-001?days=30")
    assert res.status_code == 200, f"Status {res.status_code}"
    f_data = res.json()
    assert f_data["station_id"] == "DWLR-PB-001"
    assert f_data["state"] == "Punjab"
    assert f_data["district"] == "Sangrur"
    assert f_data["horizon_days"] == 30
    assert len(f_data["forecast_points"]) == 5  # [0, 7, 15, 21, 30]
    assert f_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] 30-day forecast for DWLR-PB-001 returned 200 OK.")

    # 2. Multi-Horizon Support (7, 30, 60, 90 days)
    print("2. Testing Multi-Horizon Forecasts (7d, 30d, 60d, 90d)...")
    for h in [7, 30, 60, 90]:
        res_h = client.get(f"/api/v1/forecast/DWLR-PB-001?days={h}")
        assert res_h.status_code == 200, f"Failed on horizon {h}"
        h_data = res_h.json()
        assert h_data["horizon_days"] == h
        # Verify points are chronological
        pts = h_data["forecast_points"]
        for i in range(len(pts) - 1):
            assert pts[i]["day_offset"] < pts[i+1]["day_offset"]
    print("   [OK] All 4 forecast horizons (7, 30, 60, 90) validated with chronological points.")

    # 3. Invalid Horizon Rejection (422)
    print("3. Testing Invalid Horizon (days=45) Validation...")
    res_inv = client.get("/api/v1/forecast/DWLR-PB-001?days=45")
    assert res_inv.status_code == 422
    print("   [OK] Invalid horizon 45 properly rejected with HTTP 422.")

    # 4. Unknown Station 404
    print("4. Testing Unknown Station ID (404)...")
    res_404 = client.get("/api/v1/forecast/DWLR-NONEXISTENT-9999?days=30")
    assert res_404.status_code == 404
    print("   [OK] Unknown station returned 404 Not Found.")

    # 5. Invariant: Confidence Bounds Surround Predicted Depth
    print("5. Validating Uncertainty Envelope Invariants...")
    pts = f_data["forecast_points"]
    prev_span = 0.0
    for p in pts:
        lower = p["lower_bound"]
        pred = p["predicted_depth"]
        upper = p["upper_bound"]
        assert lower <= pred <= upper, f"Bound violation: {lower} <= {pred} <= {upper}"
        span = upper - lower
        if p["day_offset"] > 0:
            assert span >= prev_span, "Uncertainty interval must not shrink over time"
            prev_span = span
    print("   [OK] Invariant verified: lower_bound <= predicted_depth <= upper_bound and envelope widens monotonically.")

    # 6. Determinism: Identical Repeat Calls
    print("6. Validating Forecast Determinism...")
    res_repeat = client.get("/api/v1/forecast/DWLR-PB-001?days=30")
    assert res.json() == res_repeat.json(), "Forecast is not deterministic"
    print("   [OK] Deterministic repeatability confirmed (100% identical outputs).")

    # 7. Days-to-Critical Validity
    print("7. Testing Days-to-Critical Calculations...")
    assert f_data["days_to_critical"] is not None
    assert f_data["days_to_critical"] >= 0
    print(f"   [OK] Days-to-Critical for DWLR-PB-001: {f_data['days_to_critical']} days (Urgency: {f_data['days_to_critical_urgency']}).")

    # 8. Network Forecast Summary Endpoint
    print("8. Testing GET /api/v1/forecast/summary...")
    res_sum = client.get("/api/v1/forecast/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["total_stations"] == 5260
    assert sum_data["stations_with_forecast"] == 5260
    w = sum_data["stations_projected_worsening"]
    i = sum_data["stations_projected_improving"]
    s = sum_data["stations_projected_stable"]
    assert w + i + s == 5260, f"Sum {w+i+s} != 5260"
    print(f"   [OK] Forecast summary verified: {w} Worsening + {s} Stable + {i} Improving = 5260.")

    # 9. Top-Risk Forecast Ranking
    print("9. Testing GET /api/v1/forecast/top-risk (limit=10)...")
    res_top = client.get("/api/v1/forecast/top-risk?limit=10&days=30")
    assert res_top.status_code == 200
    top_data = res_top.json()
    assert len(top_data["rankings"]) == 10
    for idx, r in enumerate(top_data["rankings"], start=1):
        assert r["rank"] == idx
        assert r["days_to_critical"] is not None
    print(f"   [OK] Top 10 At-Risk stations ranked (Rank #1: {top_data['rankings'][0]['station_id']}, {top_data['rankings'][0]['state']} - {top_data['rankings'][0]['days_to_critical']} days).")

    # 10. Regional Forecast Endpoint
    print("10. Testing GET /api/v1/forecast/regional (90d)...")
    res_reg = client.get("/api/v1/forecast/regional?days=90")
    assert res_reg.status_code == 200
    reg_data = res_reg.json()
    assert reg_data["total_regions"] >= 13
    total_reg_stations = sum(r["station_count"] for r in reg_data["regions"])
    assert total_reg_stations == 5260
    print(f"   [OK] Regional 90-day forecast verified across {reg_data['total_regions']} states summing to 5,260 stations.")

    print("\n==================================================")
    print("ALL PHASE D FORECASTING TESTS PASSED CLEANLY (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
