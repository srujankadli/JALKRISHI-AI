"""
JalKrishi AI — Dynamic Location Groundwater Intelligence Test Suite
-------------------------------------------------------------------
Verifies location resolution, coverage mode selection (DIRECT_DWLR vs SATELLITE_ASSISTED),
scientific data honesty, distance threshold (15 km), structured contracts, and multilingual place queries.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_scenario_a_explicit_station_id():
    """TEST A: Explicit station_id (e.g. DWLR-KA-004) -> DIRECT_DWLR mode."""
    res = client.post("/api/v1/voice/respond", json={
        "query": "What is my groundwater level in Kolar?",
        "location_query": "Kolar",
        "station_id": "DWLR-KA-004",
        "language": "en"
    })
    assert res.status_code == 200
    data = res.json()

    assert data["coverage"]["mode"] == "DIRECT_DWLR"
    assert data["coverage"]["nearest_station_id"] == "DWLR-KA-004"
    assert data["groundwater"]["is_direct_measurement"] is True
    assert data["groundwater"]["level_value"] is not None
    assert "Direct DWLR Measurement" in data["text_response"]
    print("   [PASS] Scenario A: Explicit station_id -> DIRECT_DWLR")


def test_scenario_b_named_location_with_dwlr():
    """TEST B: Named location with DWLR (e.g. Kolar) -> distance <= 15km -> DIRECT_DWLR."""
    res = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level in Kolar?",
        "location_query": "Kolar",
        "language": "en"
    })
    assert res.status_code == 200
    data = res.json()

    assert data["location"]["name"] == "Kolar"
    assert data["location"]["state"] == "Karnataka"
    assert data["coverage"]["mode"] == "DIRECT_DWLR"
    assert data["coverage"]["distance_km"] <= 15.0
    assert data["groundwater"]["is_direct_measurement"] is True
    assert "Direct DWLR Measurement" in data["text_response"]
    print(f"   [PASS] Scenario B: Named location with DWLR (Kolar, dist={data['coverage']['distance_km']}km) -> DIRECT_DWLR")


def test_scenario_c_named_location_without_dwlr():
    """TEST C: Named location without DWLR (e.g. Leh, Ladakh) -> distance > 15km -> SATELLITE_ASSISTED."""
    res = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level in Leh?",
        "location_query": "Leh",
        "language": "en"
    })
    assert res.status_code == 200
    data = res.json()

    assert data["location"]["name"] == "Leh"
    assert data["location"]["state"] == "Ladakh"
    assert data["coverage"]["mode"] == "SATELLITE_ASSISTED"
    assert data["coverage"]["distance_km"] > 15.0
    assert data["groundwater"]["is_direct_measurement"] is False
    assert data["groundwater"]["level_min"] is not None
    assert data["groundwater"]["level_max"] is not None
    assert "Satellite-Assisted" in data["text_response"] or "satellite" in data["text_response"].lower()
    assert "Model-derived estimate" in data["intelligence"]["disclaimer"] or "satellite" in data["intelligence"]["disclaimer"].lower()
    print(f"   [PASS] Scenario C: Named location without DWLR (Leh, dist={data['coverage']['distance_km']}km) -> SATELLITE_ASSISTED")


def test_scenario_d_unresolvable_location():
    """TEST D: Unknown/unresolvable location query."""
    from app.pipeline.location_resolver import resolve_location
    res = resolve_location(location_query="NonExistentCity12345")
    assert res.is_resolved is False
    assert "Location could not be resolved" in res.error_message
    print("   [PASS] Scenario D: Unresolvable location handled with limitation message")


def test_scenario_e_multilingual_location_queries():
    """TEST E: Multilingual location resolution across 6 Indian regional scripts."""
    multilingual_queries = [
        ("en", "What is the groundwater level in Kolar?", "Kolar"),
        ("hi", "कोलार में भूजल का स्तर कितना है?", "Kolar"),
        ("kn", "ಕೋಲಾರದಲ್ಲಿ ಅಂತರ್ಜಲ ಮಟ್ಟ ಎಷ್ಟಿದೆ?", "Kolar"),
        ("bn", "কোলারে ভূগর্ভস্থ জলের স্তর কত?", "Kolar"),
        ("ta", "தஞ்சாவூரில் நிலத்தடி நீர் மட்டம் என்ன?", "Thanjavur"),
        ("te", "కోలార్లో భూగర్భ జల మట్టం ఎంత?", "Kolar"),
    ]

    for lang, q_text, expected_place in multilingual_queries:
        res = client.post("/api/v1/voice/respond", json={
            "query": q_text,
            "language": lang
        })
        assert res.status_code == 200
        data = res.json()
        assert data["location"] is not None
        assert expected_place in data["location"]["name"] or data["location"]["name"] in expected_place
        msg = f"   [PASS] Multilingual ({lang}): '{q_text}' -> Resolved '{data['location']['name']}'\n"
        sys.stdout.buffer.write(msg.encode("utf-8"))


if __name__ == "__main__":
    print("=== RUNNING DYNAMIC LOCATION TEST SUITE ===")
    test_scenario_a_explicit_station_id()
    test_scenario_b_named_location_with_dwlr()
    test_scenario_c_named_location_without_dwlr()
    test_scenario_d_unresolvable_location()
    test_scenario_e_multilingual_location_queries()
    print("\n==================================================")
    print("ALL DYNAMIC LOCATION TESTS PASSED 100% CLEANLY!")
    print("==================================================")
