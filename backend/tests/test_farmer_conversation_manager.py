import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engines.farmer_conversation_manager import farmer_conversation_manager, FarmerSessionState

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_conversation_sessions():
    """Reset session state before each test."""
    farmer_conversation_manager._sessions.clear()
    yield
    farmer_conversation_manager._sessions.clear()

def test_scenario_a_greeting():
    """A. GREETING: 'hello' -> friendly greeting, response_type CONVERSATIONAL, awaiting_location false."""
    response = client.post("/api/v1/voice/respond", json={"query": "hello", "session_id": "test-session-a"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "GREETING"
    assert data["response_type"] == "CONVERSATIONAL"
    assert data["awaiting_location"] is False
    assert any(w in data["text_response"] for w in ["Namaste", "Hello", "assist", "welcome", "JalKrishi"])

def test_scenario_b_identity():
    """B. IDENTITY: 'who are you' -> explains JalKrishi AI assistant capabilities."""
    response = client.post("/api/v1/voice/respond", json={"query": "who are you", "session_id": "test-session-b"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] in ["ASSISTANT_IDENTITY", "CAPABILITIES"]
    assert data["response_type"] == "CONVERSATIONAL"
    assert "JalKrishi" in data["text_response"]

def test_scenario_c_crop_advice_without_location():
    """C. CROP ADVICE WITHOUT LOCATION: 'crop advice' -> intent CROP_RECOMMENDATION, asks location, pending_intent CROP_RECOMMENDATION."""
    response = client.post("/api/v1/voice/respond", json={"query": "crop advice", "session_id": "test-session-c"})
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "CROP_RECOMMENDATION"
    assert data["response_type"] == "CONVERSATIONAL"
    assert data["awaiting_location"] is True
    assert data["pending_intent"] == "CROP_RECOMMENDATION"

def test_scenario_d_pending_location_followup():
    """D. PENDING LOCATION FOLLOWUP: 'crop advice' -> ask location -> 'Bengaluru' -> executes crop advice for Bengaluru."""
    # Step 1: ask advice
    res1 = client.post("/api/v1/voice/respond", json={"query": "crop advice", "session_id": "test-session-d"})
    assert res1.json()["awaiting_location"] is True

    # Step 2: reply with location
    res2 = client.post("/api/v1/voice/respond", json={"query": "Bengaluru", "session_id": "test-session-d"})
    assert res2.status_code == 200
    data = res2.json()
    assert data["location"] is not None
    assert "bengaluru" in data["location"]["name"].lower()
    assert data["response_type"] == "INTELLIGENCE"

def test_scenario_e_crop_health_3_step_flow():
    """E. CROP HEALTH 3-STEP FLOW:
       1. 'my yellow leaves problem' -> asks crop
       2. 'tomato' -> asks location
       3. 'Kolar' -> executes health problem advice for tomato in Kolar.
    """
    session = "test-session-e"
    # Step 1
    res1 = client.post("/api/v1/voice/respond", json={"query": "my yellow leaves problem", "session_id": session})
    d1 = res1.json()
    assert d1["intent"] == "CROP_HEALTH_PROBLEM"
    assert d1["response_type"] == "CONVERSATIONAL"

    # Step 2
    res2 = client.post("/api/v1/voice/respond", json={"query": "tomato", "session_id": session})
    d2 = res2.json()
    assert d2["crop"] == "tomato"
    assert d2["awaiting_location"] is True

    # Step 3
    res3 = client.post("/api/v1/voice/respond", json={"query": "Kolar", "session_id": session})
    d3 = res3.json()
    assert d3["location"] is not None
    assert "kolar" in d3["location"]["name"].lower()
    assert d3["response_type"] == "INTELLIGENCE"

def test_scenario_f_context_carryover():
    """F. CONTEXT CARRYOVER: 'water requirement' in session after Kolar is set -> reuses Kolar automatically."""
    session = "test-session-f"
    # Establish location context
    client.post("/api/v1/voice/respond", json={"query": "weather in Mandya", "session_id": session})

    # Subsequent query without explicit location
    res = client.post("/api/v1/voice/respond", json={"query": "crop advice", "session_id": session})
    data = res.json()
    assert data["location"] is not None
    assert "mandya" in data["location"]["name"].lower()
    assert data["response_type"] == "INTELLIGENCE"

def test_scenario_g_context_override():
    """G. CONTEXT OVERRIDE: explicit new location 'weather in Mysore' replaces existing location."""
    session = "test-session-g"
    # Establish location context Mandya
    client.post("/api/v1/voice/respond", json={"query": "weather in Mandya", "session_id": session})

    # Explicit new location Mysore
    res = client.post("/api/v1/voice/respond", json={"query": "weather in Mysore", "session_id": session})
    data = res.json()
    assert data["location"] is not None
    assert any(m in data["location"]["name"].lower() for m in ["mysore", "mysuru"])

def test_scenario_h_weather_with_and_without_context():
    """H. WEATHER:
       - fresh session 'will it rain?' -> asks location.
       - with context 'Bengaluru' -> provides rainfall/weather intelligence.
    """
    session = "test-session-h"
    res1 = client.post("/api/v1/voice/respond", json={"query": "will it rain?", "session_id": session})
    assert res1.json()["awaiting_location"] is True

    res2 = client.post("/api/v1/voice/respond", json={"query": "Bengaluru", "session_id": session})
    d2 = res2.json()
    assert d2["intent"] in ["RAINFALL_FORECAST", "WEATHER", "WEATHER_OR_RAINFALL"]
    assert d2["location"] is not None
    assert d2["response_type"] == "INTELLIGENCE"

def test_scenario_i_groundwater_without_location():
    """I. GROUNDWATER WITHOUT LOCATION: 'groundwater level' -> asks location, does not silently use Kolar."""
    session = "test-session-i"
    res = client.post("/api/v1/voice/respond", json={"query": "groundwater level", "session_id": session})
    data = res.json()
    assert data["intent"] == "GROUNDWATER_LEVEL"
    assert data["awaiting_location"] is True
    assert data["location"] is None

def test_scenario_j_unknown_query():
    """J. UNKNOWN QUERY: 'xyz123abc' -> polite clarification asking what farmer needs."""
    session = "test-session-j"
    res = client.post("/api/v1/voice/respond", json={"query": "xyz123abc", "session_id": session})
    data = res.json()
    assert data["intent"] == "UNKNOWN"
    assert data["response_type"] == "CONVERSATIONAL"

def test_scenario_k_dashboard_station_isolation():
    """K. DASHBOARD ISOLATION: fresh session with station_id parameter -> enforces location requirement policy."""
    session = "test-session-k"
    # Pass query with explicit station_id
    res = client.post("/api/v1/voice/respond", json={
        "query": "groundwater level",
        "session_id": session,
        "station_id": "DWLR-KA-004"
    })
    data = res.json()
    assert data["awaiting_location"] is True
    assert data["location"] is None

def test_scenario_l_multilingual_flow():
    """L. MULTILINGUAL: Hindi query 'फसल की सलाह' (crop advice) -> responds in Hindi asking location."""
    session = "test-session-l"
    res = client.post("/api/v1/voice/respond", json={"query": "फसल की सलाह", "language": "hi", "session_id": session})
    data = res.json()
    assert data["intent"] == "CROP_RECOMMENDATION"
    assert data["farmer_response_language"] == "hi"
    assert data["awaiting_location"] is True
    assert any(w in data["text_response"] for w in ["स्थान", "शहर", "जिले", "आप", "कृषि", "फसल"])

def test_scenario_m_reset_context():
    """M. CONTEXT RESET: 'start over' or 'reset' clears context slots."""
    session = "test-session-m"
    # Set context
    client.post("/api/v1/voice/respond", json={"query": "weather in Mandya", "session_id": session})
    # Reset
    res = client.post("/api/v1/voice/respond", json={"query": "reset conversation", "session_id": session})
    assert res.json()["intent"] == "RESET_CONTEXT"
    
    # Check that location was cleared by querying crop advice
    res_crop = client.post("/api/v1/voice/respond", json={"query": "crop advice", "session_id": session})
    assert res_crop.json()["awaiting_location"] is True

def test_scenario_n_10_turn_conversation_trajectory():
    """N. 10-TURN REAL CONVERSATION TRAJECTORY:
       1. 'hello' -> Greeting
       2. 'who are you' -> Identity
       3. 'crop advice' -> Asks location
       4. 'Bengaluru' -> Returns crop recommendations
       5. 'how much water does finger millet need' -> Crop water requirement
       6. 'will it rain next week' -> Weather forecast (reuses Bengaluru)
       7. 'what about groundwater level' -> Groundwater level (reuses Bengaluru)
       8. 'water shortage problem' -> Water shortage advice (reuses Bengaluru)
       9. 'weather in Hassan' -> Replaces location with Hassan
       10. 'reset' -> Clears context
    """
    session = "test-session-n"

    # Turn 1
    t1 = client.post("/api/v1/voice/respond", json={"query": "hello", "session_id": session}).json()
    assert t1["intent"] == "GREETING"

    # Turn 2
    t2 = client.post("/api/v1/voice/respond", json={"query": "who are you", "session_id": session}).json()
    assert t2["intent"] in ["ASSISTANT_IDENTITY", "CAPABILITIES"]

    # Turn 3
    t3 = client.post("/api/v1/voice/respond", json={"query": "crop advice", "session_id": session}).json()
    assert t3["intent"] == "CROP_RECOMMENDATION"
    assert t3["awaiting_location"] is True

    # Turn 4
    t4 = client.post("/api/v1/voice/respond", json={"query": "Bengaluru", "session_id": session}).json()
    assert t4["intent"] == "CROP_RECOMMENDATION"
    assert t4["response_type"] == "INTELLIGENCE"

    # Turn 5
    t5 = client.post("/api/v1/voice/respond", json={"query": "how much water does finger millet need", "session_id": session}).json()
    assert t5["intent"] in ["CROP_WATER_REQUIREMENT", "IRRIGATION_ADVICE", "CROP_RECOMMENDATION"]

    # Turn 6
    t6 = client.post("/api/v1/voice/respond", json={"query": "will it rain next week", "session_id": session}).json()
    assert t6["intent"] in ["RAINFALL_FORECAST", "WEATHER", "WEATHER_OR_RAINFALL"]
    assert "bengaluru" in t6["location"]["name"].lower()

    # Turn 7
    t7 = client.post("/api/v1/voice/respond", json={"query": "what about groundwater level", "session_id": session}).json()
    assert t7["intent"] == "GROUNDWATER_LEVEL"
    assert "bengaluru" in t7["location"]["name"].lower()

    # Turn 8
    t8 = client.post("/api/v1/voice/respond", json={"query": "water shortage problem", "session_id": session}).json()
    assert t8["intent"] == "WATER_SHORTAGE"

    # Turn 9
    t9 = client.post("/api/v1/voice/respond", json={"query": "weather in Hassan", "session_id": session}).json()
    assert "hassan" in t9["location"]["name"].lower()

    # Turn 10
    t10 = client.post("/api/v1/voice/respond", json={"query": "reset context", "session_id": session}).json()
    assert t10["intent"] == "RESET_CONTEXT"
