"""
JalKrishi AI — Location-First Groundwater Intelligence Sequential Regression Test Suite
--------------------------------------------------------------------------------------
Verifies location-first behavior across sequential queries:
Kolar -> Bengaluru -> Thanjavur -> Leh -> Mumbai

Asserts:
- Requested place is the primary target (location-first, not station-first).
- Background dashboard station (DWLR-KA-004 / Kolar) NEVER overrides an explicit location query.
- Mode A (DIRECT_DWLR) is selected when DWLR <= 15 km.
- Mode B (SATELLITE_ASSISTED) is selected when DWLR > 15 km (nearest_station_id is None, is_direct_measurement=False, model range returned).
- Multilingual location queries across 6 scripts resolve to requested places.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_location_first_five_city_sequential_flow():
    print("\n=== RUNNING LOCATION-FIRST 5-CITY SEQUENTIAL TEST ===")
    bg_station = "DWLR-KA-004"  # Background Kolar station selected on dashboard

    # 1. KOLAR QUERY
    r1 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level of Kolar?",
        "location_query": "What is the groundwater level of Kolar?",
        "station_id": bg_station,
        "language": "en"
    })
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["location"]["name"] == "Kolar"
    assert d1["location"]["state"] == "Karnataka"
    assert d1["coverage"]["mode"] == "DIRECT_DWLR"
    assert d1["coverage"]["nearest_station_id"] == "DWLR-KA-004"
    assert d1["groundwater"]["is_direct_measurement"] is True
    print("   [PASS] 1. Kolar: Resolved 'Kolar', DWLR-KA-004 (Direct DWLR)")

    # 2. BENGALURU QUERY (with background DWLR-KA-004 lingering!)
    r2 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level of Bengaluru?",
        "location_query": "What is the groundwater level of Bengaluru?",
        "station_id": bg_station,
        "language": "en"
    })
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["location"]["name"] == "Bengaluru Urban" or d2["location"]["name"] == "Bengaluru"
    assert d2["location"]["name"] != "Kolar"
    assert d2["location"]["state"] == "Karnataka"
    assert d2["coverage"]["mode"] == "SATELLITE_ASSISTED"
    assert d2["coverage"]["nearest_station_id"] is None
    assert d2["groundwater"]["is_direct_measurement"] is False
    assert d2["groundwater"]["level_min"] is not None
    assert d2["groundwater"]["level_max"] is not None
    print(f"   [PASS] 2. Bengaluru: Resolved '{d2['location']['name']}', Mode SATELLITE_ASSISTED, Depth Range {d2['groundwater']['level_min']}–{d2['groundwater']['level_max']} m bgl (Kolar background station overridden!)")

    # 3. THANJAVUR QUERY (with background DWLR-KA-004 lingering!)
    r3 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level of Thanjavur?",
        "location_query": "What is the groundwater level of Thanjavur?",
        "station_id": bg_station,
        "language": "en"
    })
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["location"]["name"] == "Thanjavur"
    assert d3["location"]["name"] != "Bengaluru Urban"
    assert d3["location"]["state"] == "Tamil Nadu"
    assert d3["coverage"]["mode"] == "DIRECT_DWLR"
    assert d3["coverage"]["nearest_station_id"] == "DWLR-TN-006"
    assert d3["groundwater"]["is_direct_measurement"] is True
    print(f"   [PASS] 3. Thanjavur: Resolved '{d3['location']['name']}', Station '{d3['coverage']['nearest_station_id']}' (Direct DWLR)")

    # 4. LEH QUERY (with background DWLR-KA-004 lingering!)
    r4 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level of Leh?",
        "location_query": "What is the groundwater level of Leh?",
        "station_id": bg_station,
        "language": "en"
    })
    assert r4.status_code == 200
    d4 = r4.json()
    assert d4["location"]["name"] == "Leh"
    assert d4["location"]["name"] != "Thanjavur"
    assert d4["location"]["state"] == "Ladakh"
    assert d4["coverage"]["mode"] == "SATELLITE_ASSISTED"
    assert d4["coverage"]["nearest_station_id"] is None
    assert d4["groundwater"]["is_direct_measurement"] is False
    print(f"   [PASS] 4. Leh: Resolved '{d4['location']['name']}', Mode SATELLITE_ASSISTED, Range {d4['groundwater']['level_min']}–{d4['groundwater']['level_max']} m bgl")

    # 5. MUMBAI QUERY (with background DWLR-KA-004 lingering!)
    r5 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level of Mumbai?",
        "location_query": "What is the groundwater level of Mumbai?",
        "station_id": bg_station,
        "language": "en"
    })
    assert r5.status_code == 200
    d5 = r5.json()
    assert d5["location"]["name"] == "Mumbai"
    assert d5["location"]["name"] != "Leh"
    assert d5["location"]["state"] == "Maharashtra"
    assert d5["coverage"]["mode"] == "SATELLITE_ASSISTED"
    assert d5["coverage"]["nearest_station_id"] is None
    assert d5["groundwater"]["is_direct_measurement"] is False
    print(f"   [PASS] 5. Mumbai: Resolved '{d5['location']['name']}', Mode SATELLITE_ASSISTED, Range {d5['groundwater']['level_min']}–{d5['groundwater']['level_max']} m bgl")

    print("\n==================================================")
    print("5-CITY LOCATION-FIRST SEQUENTIAL TEST PASSED 100% CLEANLY!")
    print("==================================================")


def test_bengaluru_multilingual_queries():
    print("\n=== RUNNING BENGALURU MULTILINGUAL LOCATION-FIRST TEST ===")
    queries = [
        ("en", "What is the groundwater level of Bengaluru?", "Bengaluru"),
        ("hi", "बेंगलुरु में भूजल का स्तर कितना है?", "Bengaluru"),
        ("kn", "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಅಂತರ್ಜಲ ಮಟ್ಟ ಎಷ್ಟಿದೆ?", "Bengaluru"),
        ("ta", "பெங்களூரில் நிலத்தடி நீர் மட்டம் என்ன?", "Bengaluru"),
        ("te", "బెంగళూరులో భూగర్భ జల మట్టం ఎంత?", "Bengaluru"),
        ("bn", "বেঙ্গালুরুতে ভূগর্ভস্থ জলের স্তর কত?", "Bengaluru"),
    ]

    for lang, q_text, expected in queries:
        res = client.post("/api/v1/voice/respond", json={
            "query": q_text,
            "location_query": q_text,
            "station_id": "DWLR-KA-004",  # Background station ID
            "language": lang
        })
        assert res.status_code == 200
        data = res.json()
        assert expected in data["location"]["name"] or data["location"]["name"] in ["Bengaluru Urban", "Bengaluru"]
        assert data["location"]["name"] != "Kolar"
        msg = f"   [PASS] Multilingual ({lang}): Query resolved '{data['location']['name']}' (Kolar background station overridden!)\n"
        sys.stdout.buffer.write(msg.encode("utf-8"))


if __name__ == "__main__":
    test_location_first_five_city_sequential_flow()
    test_bengaluru_multilingual_queries()
