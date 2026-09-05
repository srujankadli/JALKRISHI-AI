import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def test_forecasting_pipeline():
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
    assert f_data["block"] is not None
    assert f_data["station_code"] is not None
    assert f_data["latitude"] is not None and f_data["longitude"] is not None
    assert f_data["horizon_days"] == 30
    assert len(f_data["forecast_points"]) == 5  # [0, 7, 15, 21, 30]
    assert f_data["data_mode"] == "DEMO_SIMULATION"
    assert f_data["projected_depth_30d"] is not None
    print("   [OK] 30-day forecast for DWLR-PB-001 returned 200 OK with station metadata.")

    # 1b. Distinct Station-Specific Forecast Contexts (PB-001 vs KA-004 vs MH-003)
    print("1b. Testing Distinct Station Contexts (PB-001 vs KA-004 vs MH-003)...")
    res_ka = client.get("/api/v1/forecast/DWLR-KA-004?days=30")
    res_mh = client.get("/api/v1/forecast/DWLR-MH-003?days=30")
    assert res_ka.status_code == 200 and res_mh.status_code == 200
    ka_data = res_ka.json()
    mh_data = res_mh.json()

    # Verify distinct identities
    assert f_data["station_id"] == "DWLR-PB-001" and f_data["district"] == "Sangrur" and f_data["state"] == "Punjab"
    assert ka_data["station_id"] == "DWLR-KA-004" and ka_data["district"] == "Kolar" and ka_data["state"] == "Karnataka"
    assert mh_data["station_id"] == "DWLR-MH-003" and mh_data["district"] == "Chhatrapati Sambhaji Nagar" and mh_data["state"] == "Maharashtra"

    # Verify distinct critical thresholds (station-specific, not hardcoded 25m)
    assert f_data["critical_threshold"] == 30.0
    assert ka_data["critical_threshold"] == 35.0
    assert mh_data["critical_threshold"] == 20.0

    # Verify distinct current depths & projected levels
    assert f_data["current_depth"] != ka_data["current_depth"]
    assert f_data["projected_depth_30d"] != ka_data["projected_depth_30d"]
    assert ka_data["projected_depth_30d"] != mh_data["projected_depth_30d"]

    # Verify distinct soils and aquifers
    assert f_data["soil_type"] != ka_data["soil_type"]
    assert ka_data["aquifer_type"] is not None and f_data["aquifer_type"] is not None

    print(f"   [OK] Verified distinct station contexts:")
    print(f"        - {f_data['station_id']}: {f_data['district']} | Soil: {f_data['soil_type']} | Crit: {f_data['critical_threshold']}m | 30d: {f_data['projected_depth_30d']}m")
    print(f"        - {ka_data['station_id']}: {ka_data['district']} | Soil: {ka_data['soil_type']} | Crit: {ka_data['critical_threshold']}m | 30d: {ka_data['projected_depth_30d']}m")
    print(f"        - {mh_data['station_id']}: {mh_data['district']} | Soil: {mh_data['soil_type']} | Crit: {mh_data['critical_threshold']}m | 30d: {mh_data['projected_depth_30d']}m")

    # 1c. Exact Uncertainty Envelope Formula Verification
    print("1c. Testing Mathematical Invariant of Uncertainty Envelope Formula...")
    import math
    for pt in f_data["forecast_points"]:
        t = pt["day_offset"]
        expected_uncertainty = round(0.04 + 0.015 * math.sqrt(t) + 0.008 * t, 2) if t > 0 else 0.0
        expected_lower = round(max(0.1, pt["predicted_depth"] - expected_uncertainty), 2)
        expected_upper = round(pt["predicted_depth"] + expected_uncertainty, 2)
        assert pt["lower_bound"] == expected_lower, f"Lower bound mismatch at t={t}: {pt['lower_bound']} != {expected_lower}"
        assert pt["upper_bound"] == expected_upper, f"Upper bound mismatch at t={t}: {pt['upper_bound']} != {expected_upper}"
    print("   [OK] Exact mathematical verification passed for formula: uncertainty = +(0.04 + 0.015*sqrt(t) + 0.008*t).")

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

    # 8. RBAC Guard on Official Forecast Endpoints
    print("8. Testing RBAC Security Guard on /api/v1/forecast/summary, /top-risk, /regional...")
    # Unauthenticated should receive 401 or 403
    res_unauth = client.get("/api/v1/forecast/summary")
    assert res_unauth.status_code in [401, 403], f"Expected 401/403 for unauth summary, got {res_unauth.status_code}"

    # Farmer role should receive 403
    res_farm_login = client.post("/api/v1/auth/login", json={"username_or_email": "farmer@jalkrishi.in", "password": "pass"})
    farm_token = res_farm_login.json()["access_token"]
    res_farm_blocked = client.get("/api/v1/forecast/summary", headers={"Authorization": f"Bearer {farm_token}"})
    assert res_farm_blocked.status_code == 403, f"Expected 403 for farmer summary, got {res_farm_blocked.status_code}"

    # Official role should receive 200
    res_adm_login = client.post("/api/v1/auth/login", json={"username_or_email": "admin@jalkrishi.gov.in", "password": "pass"})
    adm_token = res_adm_login.json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    res_sum = client.get("/api/v1/forecast/summary", headers=adm_headers)
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["total_stations"] == 5260
    assert sum_data["stations_with_forecast"] == 5260
    w = sum_data["stations_projected_worsening"]
    i = sum_data["stations_projected_improving"]
    s = sum_data["stations_projected_stable"]
    assert w + i + s == 5260, f"Sum {w+i+s} != 5260"
    print(f"   [OK] RBAC verified and forecast summary verified: {w} Worsening + {s} Stable + {i} Improving = 5260.")

    # 9. Top-Risk Forecast Ranking (Official only)
    print("9. Testing GET /api/v1/forecast/top-risk (limit=10) with official auth...")
    res_top = client.get("/api/v1/forecast/top-risk?limit=10&days=30", headers=adm_headers)
    assert res_top.status_code == 200
    top_data = res_top.json()
    assert len(top_data["rankings"]) == 10
    for idx, r in enumerate(top_data["rankings"], start=1):
        assert r["rank"] == idx
        assert r["days_to_critical"] is not None
    print(f"   [OK] Top 10 At-Risk stations ranked (Rank #1: {top_data['rankings'][0]['station_id']}, {top_data['rankings'][0]['state']} - {top_data['rankings'][0]['days_to_critical']} days).")

    # 10. Regional Forecast Endpoint (Official only)
    print("10. Testing GET /api/v1/forecast/regional (90d) with official auth...")
    res_reg = client.get("/api/v1/forecast/regional?days=90", headers=adm_headers)
    assert res_reg.status_code == 200
    reg_data = res_reg.json()
    assert reg_data["total_regions"] >= 13
    total_reg_stations = sum(r["station_count"] for r in reg_data["regions"])
    assert total_reg_stations == 5260
    print(f"   [OK] Regional 90-day forecast verified across {reg_data['total_regions']} states summing to 5,260 stations.")

    # 11. Location-Aware Farmer Forecast (Dynamic across distinct locations)
    print("11. Testing Dynamic Location-Aware Farmer Forecast (/api/v1/forecast/location)...")
    test_locations = ["Nashik", "Kochi", "Jaipur", "Ballari", "Bengaluru"]
    forecast_results = {}

    for loc in test_locations:
        res_loc = client.get(f"/api/v1/forecast/location?location={loc}&days=30&crop=Wheat&water_sources=Borewell")
        assert res_loc.status_code == 200, f"Failed for location {loc}: {res_loc.text}"
        loc_data = res_loc.json()
        assert loc_data["location_name"] is not None
        assert loc_data["latitude"] is not None and loc_data["longitude"] is not None
        assert loc_data["evidence_mode"] in ["DIRECT_DWLR", "REGIONAL_NEARBY_EVIDENCE", "SATELLITE_ASSISTED"]
        assert len(loc_data["forecast_points"]) == 5
        assert loc_data["current_depth"] is not None and loc_data["current_depth"] > 0
        forecast_results[loc] = loc_data

    # Ensure forecasts are dynamically distinct and not cloned/fallback
    depth_nashik = forecast_results["Nashik"]["current_depth"]
    depth_kochi = forecast_results["Kochi"]["current_depth"]
    depth_jaipur = forecast_results["Jaipur"]["current_depth"]
    depth_ballari = forecast_results["Ballari"]["current_depth"]

    assert depth_nashik != depth_kochi, "Nashik and Kochi forecasts must be dynamically different"
    assert depth_jaipur != depth_ballari, "Jaipur and Ballari forecasts must be dynamically different"
    print(f"   [OK] Dynamic Location Verification: Nashik ({depth_nashik}m) vs Kochi ({depth_kochi}m) vs Jaipur ({depth_jaipur}m) vs Ballari ({depth_ballari}m)")

    # 12. Profile Personalization in Location Forecast
    print("12. Testing Farm Profile Personalization in Location Forecast...")
    res_borewell = client.get("/api/v1/forecast/location?location=Nashik&days=30&water_sources=Borewell&groundwater_dependence=HIGH&crop=Grapes")
    res_canal = client.get("/api/v1/forecast/location?location=Nashik&days=30&water_sources=Canal&groundwater_dependence=LOW&crop=Rice")
    assert res_borewell.status_code == 200 and res_canal.status_code == 200
    bw_data = res_borewell.json()
    cn_data = res_canal.json()
    assert bw_data.get("personalized_profile_notes") is not None
    assert any("borewell" in n.lower() or "grapes" in n.lower() for n in bw_data["personalized_profile_notes"])
    print("   [OK] Farm profile personalization validated in location forecast output.")

    # 13. Strict Invalid Location Rejection (400)
    print("13. Testing Strict Invalid Location Rejection (400)...")
    invalid_locations = ["gbtrshy", "abcdef", "xyz123", "randomtown999", "randomvillage999"]
    for inv in invalid_locations:
        res_inv = client.get(f"/api/v1/forecast/location?location={inv}&days=30")
        assert res_inv.status_code == 400, f"Expected 400 for {inv}, got {res_inv.status_code}"
        assert "couldn't verify that location" in res_inv.json()["detail"].lower() or "not recognized" in res_inv.json()["detail"].lower()
    print("   [OK] Unresolvable locations strictly rejected with HTTP 400 (no fake forecast fallback).")

    print("\n==================================================")
    print("ALL PHASE D & LOCATION FORECASTING TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    test_forecasting_pipeline()
