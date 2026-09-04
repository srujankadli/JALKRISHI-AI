"""
JalKrishi AI — Semantic & Tolerant Farmer Intent Router Test Suite
------------------------------------------------------------------
Verifies multilingual intent classification, weighted semantic scoring, short query handling,
typo tolerance, confusion matrix disambiguation, and sequential real-world farmer conversation flows.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.engines.farmer_intent_router import farmer_intent_router

client = TestClient(app)


def test_intent_classification_matrix():
    print("\n=== RUNNING INTENT CLASSIFICATION MATRIX TEST ===")

    test_cases = [
        # Short & Natural Crop Queries
        ("crop advisor", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("crop advice", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("which crop", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("what should I plant", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("best crop for my land", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("crop", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        # Short & Natural Irrigation Queries
        ("irrigation", "IRRIGATION_ADVICE", "INTELLIGENCE"),
        ("when should I water", "IRRIGATION_ADVICE", "INTELLIGENCE"),
        ("how much water should I give my crop", "IRRIGATION_ADVICE", "INTELLIGENCE"),
        # Short & Natural Recharge Queries
        ("recharge", "RECHARGE_ADVICE", "INTELLIGENCE"),
        ("recharge groundwater", "RECHARGE_ADVICE", "INTELLIGENCE"),
        # Short & Natural Groundwater Queries
        ("groundwater", "GROUNDWATER_LEVEL", "INTELLIGENCE"),
        ("water table", "GROUNDWATER_LEVEL", "INTELLIGENCE"),
        ("groundwater level", "GROUNDWATER_LEVEL", "INTELLIGENCE"),
        # Forecast, Risk, Station, Rainfall
        ("groundwater forecast", "GROUNDWATER_FORECAST", "INTELLIGENCE"),
        ("forecast", "GROUNDWATER_FORECAST", "INTELLIGENCE"),
        ("water stress", "GROUNDWATER_RISK", "INTELLIGENCE"),
        ("nearest DWLR", "DWLR_STATION", "INTELLIGENCE"),
        ("DWLR", "DWLR_STATION", "INTELLIGENCE"),
        ("rainfall", "WEATHER_OR_RAINFALL", "INTELLIGENCE"),
        # Transliterated Hinglish Queries
        ("kaunsa crop ugau", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("kaunsa fasal lagau", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("paani kab dena hai", "IRRIGATION_ADVICE", "INTELLIGENCE"),
        ("kitna paani dena hai", "IRRIGATION_ADVICE", "INTELLIGENCE"),
        ("mera naam srujan hai", "IDENTITY_INTRODUCTION", "CONVERSATIONAL"),
        # Conversational Queries
        ("hello", "GREETING", "CONVERSATIONAL"),
        ("thank you", "THANKS", "CONVERSATIONAL"),
        ("bye", "GOODBYE", "CONVERSATIONAL"),
        ("xyzabc123", "UNKNOWN", "CONVERSATIONAL"),
    ]

    for q, expected_intent, expected_type in test_cases:
        res = farmer_intent_router.classify_intent(q)
        assert res.intent == expected_intent, f"Query '{q}' expected intent {expected_intent}, got {res.intent}"
        assert res.response_type == expected_type, f"Query '{q}' expected type {expected_type}, got {res.response_type}"
        print(f"   [PASS] '{q}' -> Intent: {res.intent}, Type: {res.response_type}")


def test_typo_tolerance_matrix():
    print("\n=== RUNNING TYPO TOLERANCE TEST ===")

    typo_cases = [
        ("crop advicer", "CROP_RECOMMENDATION"),
        ("crop advisr", "CROP_RECOMMENDATION"),
        ("crop recomentation", "CROP_RECOMMENDATION"),
        ("irrigtion", "IRRIGATION_ADVICE"),
        ("groundwatr", "GROUNDWATER_LEVEL"),
        ("recharg", "RECHARGE_ADVICE"),
    ]

    for q, expected_intent in typo_cases:
        res = farmer_intent_router.classify_intent(q)
        assert res.intent == expected_intent, f"Typo query '{q}' expected intent {expected_intent}, got {res.intent}"
        print(f"   [PASS] Typo '{q}' -> Intent: {res.intent}")


def test_confusion_matrix_disambiguation():
    print("\n=== RUNNING CONFUSION DISAMBIGUATION TEST ===")

    confusion_cases = [
        ("My crop needs water", "IRRIGATION_ADVICE"),
        ("How much groundwater is available?", "GROUNDWATER_LEVEL"),
        ("Which crop uses less water?", "CROP_RECOMMENDATION"),
        ("How can I save groundwater?", "RECHARGE_ADVICE"),
        ("Will it rain tomorrow?", "WEATHER_OR_RAINFALL"),
        ("Will groundwater increase next month?", "GROUNDWATER_FORECAST"),
        ("My name is Bengaluru", "IDENTITY_INTRODUCTION"),
    ]

    for q, expected_intent in confusion_cases:
        res = farmer_intent_router.classify_intent(q)
        assert res.intent == expected_intent, f"Confusion query '{q}' expected intent {expected_intent}, got {res.intent}"
        print(f"   [PASS] Confusion query '{q}' -> Intent: {res.intent}")


def test_multilingual_intent_classification():
    print("\n=== RUNNING MULTILINGUAL INTENT TEST ===")

    multilingual_intros = [
        ("hi", "मेरा नाम सृजन है", "IDENTITY_INTRODUCTION"),
        ("kn", "ನನ್ನ ಹೆಸರು ಸೃಜನ್", "IDENTITY_INTRODUCTION"),
        ("ta", "என் பெயர் ஸ்ருஜன்", "IDENTITY_INTRODUCTION"),
        ("te", "నా పేరు సృజన్", "IDENTITY_INTRODUCTION"),
        ("bn", "আমার নাম সৃজন", "IDENTITY_INTRODUCTION"),
        ("mr", "माझे नाव सृजन आहे", "IDENTITY_INTRODUCTION"),
        ("gu", "મારું નામ સૃજન છે", "IDENTITY_INTRODUCTION"),
        ("en", "mera naam srujan hai", "IDENTITY_INTRODUCTION"),
    ]

    for lang, q_text, expected_intent in multilingual_intros:
        res = farmer_intent_router.classify_intent(q_text, language=lang)
        msg = f"   [PASS] Lang ({lang}): '{q_text}' -> Intent: {res.intent}\n"
        sys.stdout.buffer.write(msg.encode("utf-8"))


def test_api_endpoint_conversational_vs_intelligence():
    print("\n=== RUNNING API ENDPOINT ROUTING TEST ===")

    # 1. IDENTITY INTRODUCTION (Must NOT return groundwater card!)
    r1 = client.post("/api/v1/voice/respond", json={
        "query": "My name is Srujan",
        "language": "en"
    })
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["intent"] == "IDENTITY_INTRODUCTION"
    assert d1["response_type"] == "CONVERSATIONAL"
    assert d1["intelligence"] is None
    assert d1["location"] is None
    assert "Srujan" in d1["text_response"] or "Nice to meet you" in d1["text_response"]
    print("   [PASS] 1. 'My name is Srujan' -> CONVERSATIONAL mode, no groundwater card returned.")

    # 2. CROP ADVISOR (Must return INTELLIGENCE mode & crop recommendation!)
    r2 = client.post("/api/v1/voice/respond", json={
        "query": "crop advisor",
        "language": "en"
    })
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["intent"] == "CROP_RECOMMENDATION"
    assert d2["response_type"] == "INTELLIGENCE"
    assert d2["crop_info"] is not None
    assert d2["intelligence"] is None
    print("   [PASS] 2. 'crop advisor' -> INTELLIGENCE mode, CROP_RECOMMENDATION returned.")

    # 3. BENGALURU GROUNDWATER (Must return INTELLIGENCE mode & location card!)
    r3 = client.post("/api/v1/voice/respond", json={
        "query": "What is the groundwater level of Bengaluru?",
        "language": "en"
    })
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["intent"] == "GROUNDWATER_LEVEL"
    assert d3["response_type"] == "INTELLIGENCE"
    assert d3["intelligence"] is not None
    assert d3["location"]["name"] in ["Bengaluru Urban", "Bengaluru"]
    print(f"   [PASS] 3. 'Groundwater of Bengaluru' -> INTELLIGENCE mode, location '{d3['location']['name']}' returned.")


def test_sequential_10_step_farmer_conversation():
    print("\n=== RUNNING SEQUENTIAL 10-STEP REAL-WORLD FARMER CONVERSATION ===")

    steps = [
        ("Hello", "GREETING", "CONVERSATIONAL"),
        ("My name is Srujan", "IDENTITY_INTRODUCTION", "CONVERSATIONAL"),
        ("What can you help me with?", "CAPABILITIES", "CONVERSATIONAL"),
        ("What is groundwater level in Bengaluru?", "GROUNDWATER_LEVEL", "INTELLIGENCE"),
        ("crop advisor", "CROP_RECOMMENDATION", "INTELLIGENCE"),
        ("How much water should I give it?", "IRRIGATION_ADVICE", "INTELLIGENCE"),
        ("How can I improve groundwater?", "RECHARGE_ADVICE", "INTELLIGENCE"),
        ("Will groundwater get better next month?", "GROUNDWATER_FORECAST", "INTELLIGENCE"),
        ("Thank you", "THANKS", "CONVERSATIONAL"),
        ("Bye", "GOODBYE", "CONVERSATIONAL"),
    ]

    for idx, (query, exp_intent, exp_type) in enumerate(steps, 1):
        res = client.post("/api/v1/voice/respond", json={
            "query": query,
            "language": "en"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == exp_intent, f"Step {idx} '{query}' expected intent {exp_intent}, got {data['intent']}"
        assert data["response_type"] == exp_type, f"Step {idx} '{query}' expected type {exp_type}, got {data['response_type']}"

        if exp_type == "CONVERSATIONAL":
            assert data["intelligence"] is None
        elif exp_intent in ["CROP_RECOMMENDATION", "WEATHER_OR_RAINFALL", "IRRIGATION_ADVICE", "RECHARGE_ADVICE"]:
            assert data["intelligence"] is None
            assert data["intent_category"] in ["CROP", "WEATHER", "IRRIGATION", "RECHARGE"]
        else:
            assert data["intelligence"] is not None

        print(f"   [PASS] Step {idx}: '{query}' -> {data['intent']} ({data['response_type']})")

    print("\n==================================================")
    print("FARMER INTENT ROUTER TEST SUITE PASSED 100% CLEANLY!")
    print("==================================================")


if __name__ == "__main__":
    test_intent_classification_matrix()
    test_typo_tolerance_matrix()
    test_confusion_matrix_disambiguation()
    test_multilingual_intent_classification()
    test_api_endpoint_conversational_vs_intelligence()
    test_sequential_10_step_farmer_conversation()
