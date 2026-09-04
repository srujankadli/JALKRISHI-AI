"""
JalKrishi AI — Comprehensive Test Suite for Farmer Dialogue Manager
-------------------------------------------------------------------
Tests multi-turn context slots, slot understanding, strict location priority,
pending intent resolution, minimum-question policy, pronoun resolution,
new farmer-problem intents, and data provenance safeguards.
"""

import pytest
from app.engines.farmer_dialogue_manager import farmer_dialogue_manager, ConversationContext
from app.models.schemas import VoiceQueryRequest


@pytest.fixture(autouse=True)
def clean_sessions():
    """Reset test sessions before every test."""
    for s_id in ["test_sess_1", "test_sess_2", "default", "multi_turn_sess"]:
        farmer_dialogue_manager.reset_context(s_id)
    yield
    for s_id in ["test_sess_1", "test_sess_2", "default", "multi_turn_sess"]:
        farmer_dialogue_manager.reset_context(s_id)


# 1. Greeting does not trigger intelligence
def test_greeting_does_not_trigger_intelligence():
    req = VoiceQueryRequest(query="Hello", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "GREETING"
    assert res.response_type == "CONVERSATIONAL"
    assert res.intelligence is None
    assert res.location is None
    assert "JalKrishi" in res.text_response or "help" in res.text_response.lower()


# 2. Identity introduction stores farmer name
def test_identity_introduction_stores_name():
    req = VoiceQueryRequest(query="My name is Srujan", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "IDENTITY_INTRODUCTION"
    assert res.farmer_name == "Srujan"
    assert res.response_type == "CONVERSATIONAL"
    assert res.intelligence is None
    ctx = farmer_dialogue_manager.get_context("test_sess_1")
    assert ctx.farmer_name == "Srujan"


# 3. Explicit location stored without triggering groundwater automatically
def test_explicit_location_stored():
    req = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "LOCATION_SELECTION"
    assert res.response_type == "CONVERSATIONAL"
    assert res.location is not None
    assert "Bengaluru" in res.location.name
    assert res.intelligence is None
    ctx = farmer_dialogue_manager.get_context("test_sess_1")
    assert ctx.location is not None
    assert "Bengaluru" in ctx.location.name


# 4. Location-only message sets context without triggering groundwater
def test_location_only_message_does_not_trigger_groundwater():
    req = VoiceQueryRequest(query="Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "LOCATION_SELECTION"
    assert res.response_type == "CONVERSATIONAL"
    assert res.intelligence is None
    assert res.location is not None


# 5. Pending crop intent + location resolves correctly (Scenario E)
def test_pending_crop_intent_plus_location_resolves():
    req1 = VoiceQueryRequest(query="Crop advice", session_id="test_sess_1")
    res1 = farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")
    assert res1.location_required is True
    assert res1.awaiting_location is True

    req2 = VoiceQueryRequest(query="Bengaluru", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "CROP_RECOMMENDATION"
    assert res2.crop_info is not None or (res2.intelligence and len(res2.intelligence.recommended_crops) > 0)
    assert "Bengaluru" in res2.location.name


# 6. Pending groundwater intent + location resolves correctly (Scenario F)
def test_pending_groundwater_intent_plus_location_resolves():
    req1 = VoiceQueryRequest(query="Groundwater level", session_id="test_sess_1")
    res1 = farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")
    assert res1.location_required is True
    assert res1.awaiting_location is True

    req2 = VoiceQueryRequest(query="Bengaluru", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "GROUNDWATER_LEVEL"
    assert res2.coverage is not None
    assert res2.coverage.mode == "SATELLITE_ASSISTED"
    assert res2.coverage.nearest_station_id is None


# 7. Existing location reused across subsequent turns (Scenario C)
def test_existing_location_reused():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="Which crop should I grow?", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "CROP_RECOMMENDATION"
    assert res2.location is not None
    assert "Bengaluru" in res2.location.name


# 8. Explicit new location overrides old location (Scenario I / H)
def test_explicit_new_location_overrides_old_location():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="What about Thanjavur?", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert "Thanjavur" in res2.location.name

    req3 = VoiceQueryRequest(query="Groundwater level", session_id="test_sess_1")
    res3 = farmer_dialogue_manager.process_message(req3, session_id="test_sess_1")
    assert "Thanjavur" in res3.location.name
    assert res3.coverage.mode == "DIRECT_DWLR"
    assert res3.coverage.nearest_station_id == "DWLR-TN-006"


# 9. Crop context persists across follow-up queries
def test_crop_context_persists():
    req1 = VoiceQueryRequest(query="I am growing tomato in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")
    ctx = farmer_dialogue_manager.get_context("test_sess_1")
    assert ctx.crop.lower() in ["tomato", "tomatoes"]


# 10. Crop replacement updates context
def test_crop_replacement_updates_context():
    req1 = VoiceQueryRequest(query="I am growing tomato in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="I switched to rice", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    ctx = farmer_dialogue_manager.get_context("test_sess_1")
    assert ctx.crop.lower() in ["rice", "paddy"]


# 11. Pronoun / reference follow-up uses prior crop (Scenario D / H)
def test_pronoun_reference_followup():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="Which crop should I grow?", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")

    req3 = VoiceQueryRequest(query="How much water does it need?", session_id="test_sess_1")
    res3 = farmer_dialogue_manager.process_message(req3, session_id="test_sess_1")
    assert res3.intent in ["IRRIGATION_ADVICE", "CROP_WATER_REQUIREMENT", "FARM_WATER_MANAGEMENT"]
    assert res3.location is not None
    assert "Bengaluru" in res3.location.name


# 12. Missing location asks clarification
def test_missing_location_asks_clarification():
    req = VoiceQueryRequest(query="Groundwater level", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.location_required is True
    assert res.awaiting_location is True
    assert "location" in res.text_response.lower() or "place" in res.text_response.lower() or "स्थान" in res.text_response


# 13. Missing crop asks clarification
def test_missing_crop_asks_clarification():
    req = VoiceQueryRequest(query="How much water should I give?", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.location_required is True or "crop" in res.text_response.lower()


# 14. Minimum question policy does not interrogate farmer
def test_minimum_question_policy():
    req = VoiceQueryRequest(query="Which crop should I grow?", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert "soil type" not in res.text_response.lower()
    assert "farm size" not in res.text_response.lower()
    assert "crop history" not in res.text_response.lower()


# 15. Unknown query does not fabricate intelligence
def test_unknown_query_does_not_fabricate_intelligence():
    req = VoiceQueryRequest(query="xyzqwerty random gibberish", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "UNKNOWN"
    assert res.intelligence is None
    assert res.groundwater is None


# 16. Crop health problem asks for useful context cautiously (Scenario G)
def test_crop_health_problem_asks_for_context():
    req = VoiceQueryRequest(query="My crop leaves are yellow", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "CROP_HEALTH_PROBLEM"
    assert "nitrogen deficiency" not in res.text_response.lower()
    assert "crop" in res.text_response.lower() or "stage" in res.text_response.lower()


# 17. Water shortage uses location context (Scenario J)
def test_water_shortage_uses_location():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="My well is drying", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "WATER_SHORTAGE"
    assert "Bengaluru" in res2.text_response or res2.location is not None


# 18. Weather query uses conversational location
def test_weather_uses_conversational_location():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="Will it rain tomorrow?", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "WEATHER_OR_RAINFALL"
    assert "Bengaluru" in res2.location.name


# 19. Multilingual context handling in Hindi
def test_multilingual_context_handling_hindi():
    req1 = VoiceQueryRequest(query="मेरा खेत बेंगलुरु में है", language="hi", session_id="test_sess_1")
    res1 = farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")
    assert "बेंगलुरु" in res1.text_response or "Bengaluru" in res1.text_response

    req2 = VoiceQueryRequest(query="मुझे कौन सी फसल उगानी चाहिए?", language="hi", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "CROP_RECOMMENDATION"
    assert res2.farmer_response_language == "hi"


# 20. Multilingual context handling in Kannada
def test_multilingual_context_handling_kannada():
    req1 = VoiceQueryRequest(query="ನನ್ನ ಫಾರ್ಮ್ ಬೆಂಗಳೂರು", language="kn", session_id="test_sess_1")
    res1 = farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")
    assert res1.farmer_response_language == "kn"

    req2 = VoiceQueryRequest(query="ಬೆಳೆ ಸಲಹೆ", language="kn", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "CROP_RECOMMENDATION"
    assert res2.farmer_response_language == "kn"


# 21. Transliterated farmer query support
def test_transliterated_farmer_query():
    req = VoiceQueryRequest(query="crop advice chahiye", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "CROP_RECOMMENDATION"


# 22. Conversation reset clears context
def test_conversation_reset():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="Reset conversation", session_id="test_sess_1")
    res2 = farmer_dialogue_manager.process_message(req2, session_id="test_sess_1")
    assert res2.intent == "RESET_CONTEXT"

    req3 = VoiceQueryRequest(query="Groundwater level", session_id="test_sess_1")
    res3 = farmer_dialogue_manager.process_message(req3, session_id="test_sess_1")
    assert res3.location_required is True
    assert res3.awaiting_location is True


# 23. Session isolation ensures no context bleeding
def test_session_isolation():
    req1 = VoiceQueryRequest(query="My farm is in Bengaluru", session_id="test_sess_1")
    farmer_dialogue_manager.process_message(req1, session_id="test_sess_1")

    req2 = VoiceQueryRequest(query="My farm is in Thanjavur", session_id="test_sess_2")
    farmer_dialogue_manager.process_message(req2, session_id="test_sess_2")

    ctx1 = farmer_dialogue_manager.get_context("test_sess_1")
    ctx2 = farmer_dialogue_manager.get_context("test_sess_2")
    assert "Bengaluru" in ctx1.location.name
    assert "Thanjavur" in ctx2.location.name


# 24. Dispatcher compatibility returns valid schema
def test_dispatcher_compatibility():
    req = VoiceQueryRequest(query="Groundwater level in Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.query_text is not None
    assert res.intent == "GROUNDWATER_LEVEL"
    assert res.response_type == "INTELLIGENCE"


# 25. Location-first behavior intact
def test_location_first_behavior_intact():
    req = VoiceQueryRequest(query="groundwater level of Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.location is not None
    assert "Bengaluru" in res.location.name
    assert res.coverage.mode == "SATELLITE_ASSISTED"


# 26. Bengaluru satellite assisted mode verified
def test_bengaluru_satellite_assisted_mode():
    req = VoiceQueryRequest(query="Groundwater in Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.coverage.mode == "SATELLITE_ASSISTED"
    assert res.coverage.nearest_station_id is None
    assert res.groundwater.level_min is not None
    assert res.groundwater.level_max is not None
    assert res.groundwater.is_direct_measurement is False


# 27. Thanjavur direct DWLR mode verified
def test_thanjavur_direct_dwlr_mode():
    req = VoiceQueryRequest(query="Groundwater in Thanjavur", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.coverage.mode == "DIRECT_DWLR"
    assert res.coverage.nearest_station_id == "DWLR-TN-006"
    assert res.groundwater.level_value == 7.1


# 28. No unrelated DWLR IDs appear
def test_no_unrelated_dwlr_ids():
    req = VoiceQueryRequest(query="Groundwater in Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.coverage.nearest_station_id is None
    assert "Kolar" not in res.text_response
    assert "DWLR-KA-001" not in (res.coverage.nearest_station_id or "")


# 29. Provenance survives conversational responses
def test_provenance_survives_conversational_response():
    req = VoiceQueryRequest(query="Groundwater in Bengaluru", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.provenance is not None
    assert "SATELLITE" in res.provenance.primary_source.upper() or "MODEL" in res.provenance.primary_source.upper() or "REMOTE" in res.provenance.primary_source.upper()


# 30. Farm water management intent
def test_farm_water_management_intent():
    req = VoiceQueryRequest(query="How can I save water?", session_id="test_sess_1")
    res = farmer_dialogue_manager.process_message(req, session_id="test_sess_1")
    assert res.intent == "FARM_WATER_MANAGEMENT"
    assert "drip" in res.text_response.lower() or "mulch" in res.text_response.lower()
