"""
JalKrishi AI — Farmer Intelligence Dispatcher Test Suite
--------------------------------------------------------
Verifies intent-specific dispatcher routing:
- Weather queries return Weather & Rainfall Outlook (NOT Groundwater Assessment)
- Crop queries return Crop Recommendation (NOT Groundwater Assessment)
- Irrigation queries return Irrigation Guidance (NOT Groundwater Assessment)
- Recharge queries return Recharge Guidance (NOT Groundwater Assessment)
- Groundwater queries return Groundwater Assessment
- Sequential cross-intent queries dynamically update intent & response mode every step
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_weather_it_will_rain_dispatcher():
    print("\n=== RUNNING 'WEATHER IT WILL RAIN' DISPATCHER TEST ===")

    # 1. "weather it will rain" (No location in query)
    res1 = client.post("/api/v1/voice/respond", json={
        "query": "weather it will rain",
        "language": "en"
    })
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["intent"] == "WEATHER_OR_RAINFALL"
    assert d1["intent_category"] == "WEATHER"
    assert d1["response_type"] == "INTELLIGENCE"
    assert d1["intelligence"] is None
    assert d1["groundwater"] is None
    assert d1["weather_info"] is not None
    assert "precipitation_mm" in d1["weather_info"] or "monsoon_status" in d1["weather_info"]
    print("   [PASS] 1. 'weather it will rain' -> WEATHER_OR_RAINFALL (NOT groundwater!).")

    # 2. "will it rain tomorrow"
    res2 = client.post("/api/v1/voice/respond", json={
        "query": "will it rain tomorrow",
        "language": "en"
    })
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["intent"] == "WEATHER_OR_RAINFALL"
    assert d2["intent_category"] == "WEATHER"
    assert d2["intelligence"] is None
    print("   [PASS] 2. 'will it rain tomorrow' -> WEATHER_OR_RAINFALL (NOT groundwater!).")

    # 3. "weather in Bengaluru"
    res3 = client.post("/api/v1/voice/respond", json={
        "query": "weather in Bengaluru",
        "language": "en"
    })
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["intent"] == "WEATHER_OR_RAINFALL"
    assert d3["intent_category"] == "WEATHER"
    assert d3["location"]["name"] in ["Bengaluru Urban", "Bengaluru"]
    print(f"   [PASS] 3. 'weather in Bengaluru' -> WEATHER_OR_RAINFALL (Location: {d3['location']['name']}).")

    # 4. "rainfall in Thanjavur"
    res4 = client.post("/api/v1/voice/respond", json={
        "query": "rainfall in Thanjavur",
        "language": "en"
    })
    assert res4.status_code == 200
    d4 = res4.json()
    assert d4["intent"] == "WEATHER_OR_RAINFALL"
    assert d4["intent_category"] == "WEATHER"
    assert d4["location"]["name"] == "Thanjavur"
    print("   [PASS] 4. 'rainfall in Thanjavur' -> WEATHER_OR_RAINFALL (Location: Thanjavur).")


def test_intent_specific_domain_dispatcher():
    print("\n=== RUNNING DOMAIN-SPECIFIC DISPATCHER TEST ===")

    # Crop Advisor
    r_crop = client.post("/api/v1/voice/respond", json={"query": "crop advisor", "language": "en"})
    assert r_crop.status_code == 200
    d_crop = r_crop.json()
    assert d_crop["intent"] == "CROP_RECOMMENDATION"
    assert d_crop["intent_category"] == "CROP"
    assert d_crop["intelligence"] is None
    assert d_crop["crop_info"] is not None
    print("   [PASS] 'crop advisor' -> CROP_RECOMMENDATION (crop_info returned, NOT groundwater!).")

    # Irrigation Guidance
    r_irr = client.post("/api/v1/voice/respond", json={"query": "irrigation advice", "language": "en"})
    assert r_irr.status_code == 200
    d_irr = r_irr.json()
    assert d_irr["intent"] == "IRRIGATION_ADVICE"
    assert d_irr["intent_category"] == "IRRIGATION"
    assert d_irr["intelligence"] is None
    assert d_irr["irrigation_info"] is not None
    print("   [PASS] 'irrigation advice' -> IRRIGATION_ADVICE (irrigation_info returned, NOT groundwater!).")

    # Recharge Guidance
    r_rec = client.post("/api/v1/voice/respond", json={"query": "how can I recharge groundwater", "language": "en"})
    assert r_rec.status_code == 200
    d_rec = r_rec.json()
    assert d_rec["intent"] == "RECHARGE_ADVICE"
    assert d_rec["intent_category"] == "RECHARGE"
    assert d_rec["intelligence"] is None
    assert d_rec["recharge_info"] is not None
    print("   [PASS] 'recharge' -> RECHARGE_ADVICE (recharge_info returned, NOT groundwater!).")

    # Groundwater Level
    r_gw = client.post("/api/v1/voice/respond", json={"query": "groundwater level in Bengaluru", "language": "en"})
    assert r_gw.status_code == 200
    d_gw = r_gw.json()
    assert d_gw["intent"] == "GROUNDWATER_LEVEL"
    assert d_gw["intent_category"] == "GROUNDWATER"
    assert d_gw["intelligence"] is not None
    assert d_gw["groundwater"] is not None
    print("   [PASS] 'groundwater level' -> GROUNDWATER_LEVEL (groundwater intelligence returned).")


def test_sequential_cross_intent_conversation():
    print("\n=== RUNNING SEQUENTIAL CROSS-INTENT CONVERSATION TEST ===")

    sequence = [
        ("Groundwater level in Kolar", "GROUNDWATER_LEVEL", "GROUNDWATER", True),
        ("Will it rain tomorrow?", "WEATHER_OR_RAINFALL", "WEATHER", False),
        ("Which crop should I grow?", "CROP_RECOMMENDATION", "CROP", False),
        ("How much water should I give it?", "IRRIGATION_ADVICE", "IRRIGATION", False),
        ("How can I recharge groundwater?", "RECHARGE_ADVICE", "RECHARGE", False),
        ("Will groundwater improve next month?", "GROUNDWATER_FORECAST", "FORECAST", True),
        ("Where is the nearest DWLR?", "DWLR_STATION", "DWLR", True),
        ("Hello", "GREETING", "CONVERSATIONAL", False),
    ]

    for idx, (q, exp_intent, exp_category, exp_has_intel) in enumerate(sequence, 1):
        res = client.post("/api/v1/voice/respond", json={"query": q, "language": "en"})
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == exp_intent, f"Step {idx} '{q}' expected intent {exp_intent}, got {data['intent']}"
        assert data["intent_category"] == exp_category, f"Step {idx} '{q}' expected category {exp_category}, got {data['intent_category']}"

        if exp_has_intel:
            assert data["intelligence"] is not None
        else:
            assert data["intelligence"] is None

        print(f"   [PASS] Step {idx}: '{q}' -> Intent: {data['intent']}, Category: {data['intent_category']}")

    print("\n==================================================")
    print("FARMER INTELLIGENCE DISPATCHER TEST SUITE PASSED 100% CLEANLY!")
    print("==================================================")


if __name__ == "__main__":
    test_weather_it_will_rain_dispatcher()
    test_intent_specific_domain_dispatcher()
    test_sequential_cross_intent_conversation()
