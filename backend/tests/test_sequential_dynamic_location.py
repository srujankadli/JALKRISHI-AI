"""
JalKrishi AI — Sequential Dynamic Location Regression Test Suite
----------------------------------------------------------------
Verifies that sequential queries for different locations (Kolar -> Thanjavur -> Leh)
genuinely update location, coverage mode, groundwater levels, stations, and farmer advice,
and that background station_id (e.g. DWLR-KA-004) NEVER forces Kolar on subsequent queries.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_sequential_location_switch():
    print("\n=== RUNNING SEQUENTIAL DYNAMIC LOCATION TEST ===")

    # --------------------------------------------------------------------------
    # REQUEST 1: Kolar Query
    # --------------------------------------------------------------------------
    res1 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level in Kolar?",
        "location_query": "What is the groundwater level in Kolar?",
        "station_id": "DWLR-KA-004",  # Background station context
        "language": "en"
    })
    assert res1.status_code == 200
    data1 = res1.json()

    assert data1["location"]["name"] == "Kolar"
    assert data1["location"]["state"] == "Karnataka"
    assert data1["coverage"]["mode"] == "DIRECT_DWLR"
    assert data1["coverage"]["nearest_station_id"] == "DWLR-KA-004"
    assert data1["groundwater"]["is_direct_measurement"] is True

    print("   [PASS] Request 1 (Kolar): Resolved 'Kolar', DWLR station DWLR-KA-004")

    # --------------------------------------------------------------------------
    # REQUEST 2: Thanjavur Query (with background selectedStation DWLR-KA-004 lingering!)
    # --------------------------------------------------------------------------
    res2 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level in Thanjavur?",
        "location_query": "What is the groundwater level in Thanjavur?",
        "station_id": "DWLR-KA-004",  # Background selectedStation MUST BE OVERRIDDEN BY TEXT LOCATION!
        "language": "en"
    })
    assert res2.status_code == 200
    data2 = res2.json()

    assert data2["location"]["name"] == "Thanjavur"
    assert data2["location"]["name"] != "Kolar"
    assert data2["location"]["state"] == "Tamil Nadu"
    assert data2["coverage"]["mode"] == "DIRECT_DWLR"
    assert data2["coverage"]["nearest_station_id"] != "DWLR-KA-004"
    assert data2["coverage"]["nearest_station_id"] == "DWLR-TN-006"
    assert data2["groundwater"]["is_direct_measurement"] is True
    assert "Thanjavur" in data2["text_response"]

    print(f"   [PASS] Request 2 (Thanjavur): Resolved '{data2['location']['name']}', Station '{data2['coverage']['nearest_station_id']}' (Kolar background station overridden!)")

    # --------------------------------------------------------------------------
    # REQUEST 3: Leh Query (Remote location without DWLR)
    # --------------------------------------------------------------------------
    res3 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level in Leh?",
        "location_query": "What is the groundwater level in Leh?",
        "station_id": "DWLR-KA-004",  # Background selectedStation MUST BE OVERRIDDEN BY TEXT LOCATION!
        "language": "en"
    })
    assert res3.status_code == 200
    data3 = res3.json()

    assert data3["location"]["name"] == "Leh"
    assert data3["location"]["name"] != "Thanjavur"
    assert data3["location"]["state"] == "Ladakh"
    assert data3["coverage"]["mode"] == "SATELLITE_ASSISTED"
    assert data3["coverage"]["distance_km"] > 15.0
    assert data3["groundwater"]["is_direct_measurement"] is False
    assert data3["groundwater"]["level_min"] is not None
    assert data3["groundwater"]["level_max"] is not None
    assert "Satellite-Assisted" in data3["text_response"] or "satellite" in data3["text_response"].lower()

    print(f"   [PASS] Request 3 (Leh): Resolved '{data3['location']['name']}', Mode SATELLITE_ASSISTED, Depth Range {data3['groundwater']['level_min']}–{data3['groundwater']['level_max']} m bgl")

    print("\n==================================================")
    print("SEQUENTIAL DYNAMIC LOCATION TEST PASSED 100% CLEANLY!")
    print("==================================================")


def test_multilingual_sequential_flow():
    print("\n=== RUNNING MULTILINGUAL SEQUENTIAL FLOW ===")
    langs_and_queries = [
        ("hi", "थंजावुर में भूजल का स्तर कितना है?", "Thanjavur"),
        ("kn", "ತಂಜಾವೂರಿನಲ್ಲಿ ಅಂತರ್ಜಲ ಮಟ್ಟ ಎಷ್ಟಿದೆ?", "Thanjavur"),
        ("bn", "থাঞ্জাভুরে ভূগর্ভস্থ জলের স্তর কত?", "Thanjavur"),
        ("ta", "தஞ்சாவூரில் நிலத்தடி நீர் மட்டம் என்ன?", "Thanjavur"),
        ("te", "తంజావూరులో భూగర్భ జల మట్టం ఎంత?", "Thanjavur"),
    ]

    for lang, q_text, expected_place in langs_and_queries:
        res = client.post("/api/v1/voice/respond", json={
            "query": q_text,
            "location_query": q_text,
            "station_id": "DWLR-KA-004",  # Background station ID
            "language": lang
        })
        assert res.status_code == 200
        data = res.json()
        assert data["location"]["name"] == expected_place
        assert data["location"]["name"] != "Kolar"
        msg = f"   [PASS] Multilingual ({lang}): Query resolved '{data['location']['name']}' (Kolar overridden!)\n"
        sys.stdout.buffer.write(msg.encode("utf-8"))


if __name__ == "__main__":
    test_sequential_location_switch()
    test_multilingual_sequential_flow()
