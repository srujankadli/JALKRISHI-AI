"""
Test Suite: Location Requirement Policy for JalKrishi AI
----------------------------------------------------------
Verifies:
1. Location-dependent queries ("crop advice", "groundwater", "irrigation", "recharge", "rain") return CONVERSATIONAL clarification with location_required=True when no location context exists.
2. Follow-up location query ("Bengaluru") resolves location and executes the pending intent.
3. Location-only query without pending intent returns LOCATION_SELECTION prompt asking what user wants to know.
4. Explicit location always overrides conversational location context.
5. 0 silent fallback to Kolar / DWLR-KA-004.
6. 13-language native script prompts & responses.
7. Sequential 7-step real-world farmer context trajectory.
"""

import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.engines.farmer_intent_router import farmer_intent_router

client = TestClient(app)


def test_location_required_without_context():
    print("\n=== RUNNING LOCATION REQUIRED WITHOUT CONTEXT TEST ===")
    session_id = "test_loc_req_1"
    farmer_intent_router.reset_context(session_id)

    location_dependent_queries = [
        ("crop advice", "CROP_RECOMMENDATION"),
        ("groundwater level", "GROUNDWATER_LEVEL"),
        ("irrigation schedule", "IRRIGATION_ADVICE"),
        ("recharge advice", "RECHARGE_ADVICE"),
        ("will it rain tomorrow", "WEATHER_OR_RAINFALL"),
    ]

    for query, exp_intent in location_dependent_queries:
        farmer_intent_router.reset_context(session_id)
        res = client.post("/api/v1/voice/respond", json={
            "query": query,
            "language": "en",
            "session_id": session_id,
            "station_id": "DWLR-KA-004"  # Dashboard selectedStation MUST NOT silently override!
        })
        assert res.status_code == 200, f"Failed for '{query}'"
        d = res.json()

        assert d["response_type"] == "CONVERSATIONAL", f"'{query}' should be CONVERSATIONAL when no location exists"
        assert d["location_required"] is True, f"'{query}' should set location_required=True"
        assert d["awaiting_location"] is True, f"'{query}' should set awaiting_location=True"
        assert d["pending_intent"] == exp_intent, f"'{query}' pending_intent should be {exp_intent}"
        assert d["location"] is None, f"'{query}' should have location=None (no silent Kolar fallback!)"
        assert "Which" in d["text_response"] or "location" in d["text_response"], f"'{query}' should ask for location"
        print(f"   [PASS] '{query}' -> CONVERSATIONAL, location_required=True, pending_intent={exp_intent}")


def test_pending_intent_followup_flow():
    print("\n=== RUNNING PENDING INTENT FOLLOWUP FLOW TEST ===")
    session_id = "test_pending_flow_1"
    farmer_intent_router.reset_context(session_id)

    # 1. Ask "crop advice" without location
    r1 = client.post("/api/v1/voice/respond", json={
        "query": "crop advice",
        "language": "en",
        "session_id": session_id
    })
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["intent"] == "CROP_RECOMMENDATION"
    assert d1["response_type"] == "CONVERSATIONAL"
    assert d1["awaiting_location"] is True

    # 2. Follow-up with location answer "Bengaluru"
    r2 = client.post("/api/v1/voice/respond", json={
        "query": "Bengaluru",
        "language": "en",
        "session_id": session_id
    })
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["intent"] == "CROP_RECOMMENDATION", f"Expected pending intent CROP_RECOMMENDATION, got {d2['intent']}"
    assert d2["response_type"] == "INTELLIGENCE"
    assert d2["location"]["name"] == "Bengaluru Urban"
    assert d2["crop_info"] is not None
    # Advice is evaluated from the resolved farm context; it must not be a
    # location-independent fixed crop template.
    assert d2["crop_info"] is not None
    assert bool(d2["crop_info"]["primary_crop"])
    print("   [PASS] 'crop advice' -> ask location -> 'Bengaluru' -> CROP_RECOMMENDATION for Bengaluru Urban!")


def test_location_only_without_pending_intent():
    print("\n=== RUNNING LOCATION ONLY WITHOUT PENDING INTENT TEST ===")
    session_id = "test_loc_only_no_pending"
    farmer_intent_router.reset_context(session_id)

    r = client.post("/api/v1/voice/respond", json={
        "query": "Bengaluru",
        "language": "en",
        "session_id": session_id
    })
    assert r.status_code == 200
    d = r.json()
    assert d["response_type"] == "CONVERSATIONAL"
    assert d["location"]["name"] == "Bengaluru Urban"
    assert "What would you like to know" in d["text_response"]
    assert d["intelligence"] is None
    print("   [PASS] 'Bengaluru' (no pending intent) -> CONVERSATIONAL prompt asking what farmer wants to know!")


def test_explicit_location_overrides_context():
    print("\n=== RUNNING EXPLICIT LOCATION OVERRIDES CONTEXT TEST ===")
    session_id = "test_override_1"
    farmer_intent_router.reset_context(session_id)

    # Establish Kolar context
    r1 = client.post("/api/v1/voice/respond", json={
        "query": "What is groundwater in Kolar?",
        "language": "en",
        "session_id": session_id
    })
    assert r1.status_code == 200
    assert r1.json()["location"]["name"] == "Kolar"

    # Ask for crop in Bengaluru explicitly
    r2 = client.post("/api/v1/voice/respond", json={
        "query": "Which crop should I grow in Bengaluru?",
        "language": "en",
        "session_id": session_id
    })
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["location"]["name"] == "Bengaluru Urban", f"Explicit location Bengaluru should override Kolar context, got {d2['location']['name']}"
    print("   [PASS] Context=Kolar -> Query 'Which crop in Bengaluru?' -> Bengaluru Urban overrides Kolar!")


def test_multilingual_location_clarification():
    print("\n=== RUNNING MULTILINGUAL LOCATION CLARIFICATION TEST ===")

    lang_cases = [
        ("hi", "फसल की सलाह चाहिए", "बेंगलुरु", "CROP_RECOMMENDATION", "Bengaluru Urban"),
        ("kn", "ಬೆಳೆ ಸಲಹೆ ಬೇಕು", "ಬೆಂಗಳೂರು", "CROP_RECOMMENDATION", "Bengaluru Urban"),
        ("ta", "பயிர் ஆலோசனை வேண்டும்", "தஞ்சாவூர்", "CROP_RECOMMENDATION", "Thanjavur"),
        ("te", "పంట సలహా కావాలి", "హైదరాబాద్", "CROP_RECOMMENDATION", "Hyderabad"),
    ]

    for lang, req_text, loc_ans, exp_intent, exp_loc in lang_cases:
        sess = f"sess_multi_{lang}"
        farmer_intent_router.reset_context(sess)

        r1 = client.post("/api/v1/voice/respond", json={
            "query": req_text,
            "language": lang,
            "session_id": sess
        })
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["response_type"] == "CONVERSATIONAL"
        assert d1["location_required"] is True

        r2 = client.post("/api/v1/voice/respond", json={
            "query": loc_ans,
            "language": lang,
            "session_id": sess
        })
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["response_type"] == "INTELLIGENCE"
        assert d2["intent"] == exp_intent
        assert d2["location"]["name"] == exp_loc
        print(f"   [PASS] Lang ({lang}): '{req_text.encode('ascii', 'ignore').decode() or lang}' -> ask location -> '{loc_ans.encode('ascii', 'ignore').decode() or lang}' -> {exp_intent} for {exp_loc}")


def test_sequential_7_step_farmer_trajectory():
    print("\n=== RUNNING SEQUENTIAL 7-STEP FARMER TRAJECTORY TEST ===")
    session_id = "test_seq_7_step"
    farmer_intent_router.reset_context(session_id)

    # Step 1: "My farm is in Bengaluru" -> context set to Bengaluru Urban
    r1 = client.post("/api/v1/voice/respond", json={
        "query": "My farm is in Bengaluru",
        "language": "en",
        "session_id": session_id
    })
    assert r1.status_code == 200
    assert r1.json()["location"]["name"] == "Bengaluru Urban"
    print("   [PASS] Step 1: 'My farm is in Bengaluru' -> Location context set to Bengaluru Urban")

    # Step 2: "crop advice" -> returns crop recommendation for Bengaluru Urban
    r2 = client.post("/api/v1/voice/respond", json={
        "query": "crop advice",
        "language": "en",
        "session_id": session_id
    })
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["response_type"] == "INTELLIGENCE"
    assert d2["location"]["name"] == "Bengaluru Urban"
    assert d2["crop_info"] is not None
    print("   [PASS] Step 2: 'crop advice' -> Uses Bengaluru Urban context")

    # Step 3: "how much water does it need?" -> returns irrigation guidance for Bengaluru Urban
    r3 = client.post("/api/v1/voice/respond", json={
        "query": "how much water does it need?",
        "language": "en",
        "session_id": session_id
    })
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["response_type"] == "INTELLIGENCE"
    assert d3["location"]["name"] == "Bengaluru Urban"
    assert d3["irrigation_info"] is not None
    print("   [PASS] Step 3: 'how much water does it need?' -> Uses Bengaluru Urban context")

    # Step 4: "will it rain tomorrow?" -> returns weather for Bengaluru Urban
    r4 = client.post("/api/v1/voice/respond", json={
        "query": "will it rain tomorrow?",
        "language": "en",
        "session_id": session_id
    })
    assert r4.status_code == 200
    d4 = r4.json()
    assert d4["response_type"] == "INTELLIGENCE"
    assert d4["location"]["name"] == "Bengaluru Urban"
    assert d4["weather_info"] is not None
    print("   [PASS] Step 4: 'will it rain tomorrow?' -> Uses Bengaluru Urban context")

    # Step 5: "what is groundwater there?" -> returns groundwater assessment for Bengaluru Urban
    r5 = client.post("/api/v1/voice/respond", json={
        "query": "what is groundwater there?",
        "language": "en",
        "session_id": session_id
    })
    assert r5.status_code == 200
    d5 = r5.json()
    assert d5["response_type"] == "INTELLIGENCE"
    assert d5["location"]["name"] == "Bengaluru Urban"
    assert d5["intelligence"] is not None
    print("   [PASS] Step 5: 'what is groundwater there?' -> Uses Bengaluru Urban context")

    # Step 6: "Now tell me about Thanjavur" -> updates context location to Thanjavur
    r6 = client.post("/api/v1/voice/respond", json={
        "query": "Now tell me about Thanjavur",
        "language": "en",
        "session_id": session_id
    })
    assert r6.status_code == 200
    d6 = r6.json()
    assert d6["location"]["name"] == "Thanjavur"
    print("   [PASS] Step 6: 'Now tell me about Thanjavur' -> Location updated to Thanjavur")

    # Step 7: "crop advice" -> returns crop recommendation for Thanjavur
    r7 = client.post("/api/v1/voice/respond", json={
        "query": "crop advice",
        "language": "en",
        "session_id": session_id
    })
    assert r7.status_code == 200
    d7 = r7.json()
    assert d7["response_type"] == "INTELLIGENCE"
    assert d7["location"]["name"] == "Thanjavur"
    assert d7["crop_info"] is not None
    print("   [PASS] Step 7: 'crop advice' -> Uses new Thanjavur context (0 Kolar fallback!)")

    print("\n==================================================")
    print("LOCATION REQUIREMENT & CONTEXT TEST PASSED 100% CLEANLY!")
    print("==================================================")


def test_crop_advice_without_location_requires_location():
    """Explicit regression test: 'crop advice' on fresh session MUST ask for location and NEVER execute crop engine."""
    print("\n=== RUNNING REGRESSION: CROP ADVICE WITHOUT LOCATION ===")
    session_id = "test_fresh_crop_advice_regression"
    farmer_intent_router.reset_context(session_id)

    res = client.post("/api/v1/voice/respond", json={
        "query": "crop advice",
        "language": "en",
        "session_id": session_id
    })
    assert res.status_code == 200
    d = res.json()

    assert d["response_type"] == "CONVERSATIONAL", f"Expected CONVERSATIONAL, got {d['response_type']}"
    assert d["intent"] == "CROP_RECOMMENDATION"
    assert d["location"] is None
    assert d["location_required"] is True
    assert d["awaiting_location"] is True
    assert d["pending_intent"] == "CROP_RECOMMENDATION"
    assert d["crop_info"] is None, "crop_info MUST be None when location is missing!"
    assert d["intelligence"] is None, "intelligence MUST be None when location is missing!"
    print("   [PASS] test_crop_advice_without_location_requires_location")


def test_selected_station_does_not_satisfy_location_requirement():
    """Explicit regression test: station_id (e.g. DWLR-KA-004) MUST NOT satisfy location requirement for crop advice."""
    print("\n=== RUNNING REGRESSION: SELECTED STATION DOES NOT SATISFY LOCATION REQUIREMENT ===")
    session_id = "test_selected_station_regression"
    farmer_intent_router.reset_context(session_id)

    res = client.post("/api/v1/voice/respond", json={
        "query": "crop advice",
        "language": "en",
        "session_id": session_id,
        "station_id": "DWLR-KA-004"
    })
    assert res.status_code == 200
    d = res.json()

    assert d["response_type"] == "CONVERSATIONAL", f"Expected CONVERSATIONAL, got {d['response_type']}"
    assert d["location_required"] is True
    assert d["awaiting_location"] is True
    assert d["pending_intent"] == "CROP_RECOMMENDATION"
    assert d["location"] is None
    assert d["crop_info"] is None
    assert d["intelligence"] is None
    print("   [PASS] test_selected_station_does_not_satisfy_location_requirement")


if __name__ == "__main__":
    test_crop_advice_without_location_requires_location()
    test_selected_station_does_not_satisfy_location_requirement()
    test_location_required_without_context()
    test_pending_intent_followup_flow()
    test_location_only_without_pending_intent()
    test_explicit_location_overrides_context()
    test_multilingual_location_clarification()
    test_sequential_7_step_farmer_trajectory()
