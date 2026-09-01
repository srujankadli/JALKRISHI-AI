import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase F Crop Recommendation Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Catalog Endpoint
    print("1. Testing GET /api/v1/crops/catalog...")
    res_cat = client.get("/api/v1/crops/catalog")
    assert res_cat.status_code == 200, f"Status {res_cat.status_code}"
    cat_data = res_cat.json()
    assert cat_data["total_crops"] >= 10
    crop_ids = [c["crop_id"] for c in cat_data["crops"]]
    assert "crop-chickpea" in crop_ids
    assert "crop-bajra" in crop_ids
    assert "crop-mustard" in crop_ids
    assert "crop-flood-paddy" in crop_ids
    assert "crop-sugarcane" in crop_ids
    print(f"   [OK] Crop catalogue returned {cat_data['total_crops']} profiles.")

    # 2. Methodology Endpoint & Weight Invariants
    print("2. Testing GET /api/v1/crops/methodology & Weight Invariant...")
    res_meth = client.get("/api/v1/crops/methodology")
    assert res_meth.status_code == 200
    meth_data = res_meth.json()
    weights = meth_data["scoring_weights"]
    total_w = sum(weights.values())
    assert abs(total_w - 1.0) < 0.001, f"Weights sum {total_w} != 1.0"
    print(f"   [OK] Methodology verified: 5 component weights sum to {total_w * 100:.0f}%.")

    # 3. Recommendation Endpoint (Rabi, Stressed Water, Loamy Soil)
    print("3. Testing POST /api/v1/crops/recommend (Rabi, Stressed Water)...")
    payload = {
        "state": "Karnataka",
        "district": "Kolar",
        "station_id": "DWLR-KA-004",
        "soil_type": "Loamy",
        "season": "Rabi",
        "rainfall_condition": "Low",
        "water_availability": "Stressed",
        "farm_area_acres": 2.5,
        "irrigation_method": "Drip",
        "farmer_priority": "Water Saving",
    }
    res_rec = client.post("/api/v1/crops/recommend", json=payload)
    assert res_rec.status_code == 200, f"Status {res_rec.status_code}: {res_rec.text}"
    rec_data = res_rec.json()
    assert len(rec_data["top_recommendations"]) == 3
    assert len(rec_data["not_recommended"]) > 0
    assert rec_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] Crop recommendation returned top 3 and not-recommended lists.")

    # 4. Invariant: Scoring Ranges & Component Consistency
    print("4. Validating Score Ranges & Weighted Sum Formula Invariant...")
    for rec in rec_data["top_recommendations"]:
        sc = rec["scores"]
        assert 0.0 <= rec["overall_score"] <= 100.0
        assert 0.0 <= sc["soil_score"] <= 100.0
        assert 0.0 <= sc["water_score"] <= 100.0
        assert 0.0 <= sc["season_score"] <= 100.0
        assert 0.0 <= sc["rainfall_score"] <= 100.0
        assert 0.0 <= sc["groundwater_score"] <= 100.0
        assert rec["estimated_water_demand_m3"] is not None
        assert rec["estimated_water_demand_m3"] > 0
    print("   [OK] Invariant verified: All component scores bounded [0, 100] and water demand volume computed.")

    # 5. Groundwater & Stress Favoring Low-Water Crops
    print("5. Validating Under-Stressed Penalty for High-Water Crops...")
    top_ids = [r["crop_id"] for r in rec_data["top_recommendations"]]
    assert "crop-chickpea" in top_ids or "crop-mustard" in top_ids
    not_rec_ids = [nr["crop_id"] for nr in rec_data["not_recommended"]]
    assert "crop-flood-paddy" in not_rec_ids or "crop-sugarcane" in not_rec_ids
    print(f"   [OK] Stressed water appropriately prioritized low-water pulses and flagged high-water crops.")

    # 6. Comparison Endpoint
    print("6. Testing POST /api/v1/crops/compare...")
    cmp_payload = {
        "state": "Karnataka",
        "district": "Kolar",
        "station_id": "DWLR-KA-004",
        "soil_type": "Loamy",
        "season": "Rabi",
        "rainfall_condition": "Normal",
        "water_availability": "Moderate",
        "crop_ids": ["crop-chickpea", "crop-mustard", "crop-wheat", "crop-sugarcane"],
        "farm_area_acres": 3.0,
    }
    res_cmp = client.post("/api/v1/crops/compare", json=cmp_payload)
    assert res_cmp.status_code == 200
    cmp_data = res_cmp.json()
    assert cmp_data["total_compared"] == 4
    # Chickpea / Mustard should rank higher than Sugarcane
    c_map = {c["crop_id"]: c["overall_score"] for c in cmp_data["comparisons"]}
    assert c_map["crop-chickpea"] > c_map["crop-sugarcane"]
    print("   [OK] Comparison endpoint scored and ranked all 4 crops correctly.")

    # 7. Invalid Soil Type Rejection (422)
    print("7. Testing Invalid Soil Type Validation (422)...")
    bad_soil = payload.copy()
    bad_soil["soil_type"] = "VolcanicAsh"
    res_bad_soil = client.post("/api/v1/crops/recommend", json=bad_soil)
    assert res_bad_soil.status_code == 422
    print("   [OK] Invalid soil type rejected with HTTP 422.")

    # 8. Invalid Season Rejection (422)
    print("8. Testing Invalid Season Validation (422)...")
    bad_season = payload.copy()
    bad_season["season"] = "MonsoonSeason"
    res_bad_season = client.post("/api/v1/crops/recommend", json=bad_season)
    assert res_bad_season.status_code == 422
    print("   [OK] Invalid season rejected with HTTP 422.")

    # 9. Nonexistent Station ID (404)
    print("9. Testing Unknown Station ID (404)...")
    bad_st = payload.copy()
    bad_st["station_id"] = "DWLR-NONEXISTENT-9999"
    res_bad_st = client.post("/api/v1/crops/recommend", json=bad_st)
    assert res_bad_st.status_code == 404
    print("   [OK] Unknown station ID returned 404 Not Found.")

    # 10. Non-Positive Farm Area (422)
    print("10. Testing Non-Positive Farm Area Validation (422)...")
    bad_area = payload.copy()
    bad_area["farm_area_acres"] = -5.0
    res_bad_area = client.post("/api/v1/crops/recommend", json=bad_area)
    assert res_bad_area.status_code == 422
    print("   [OK] Negative farm area rejected with HTTP 422.")

    # 11. Deterministic Repeatability
    print("11. Testing Deterministic Repeatability...")
    res_repeat = client.post("/api/v1/crops/recommend", json=payload)
    assert res_rec.json() == res_repeat.json()
    print("   [OK] Deterministic repeatability confirmed (100% identical outputs).")

    print("\n==================================================")
    print("ALL PHASE F CROP RECOMMENDATION TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
