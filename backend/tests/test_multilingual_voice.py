import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.speech.multilingual_service import (
    SUPPORTED_LANGUAGES,
    LanguageDetector,
    stt_provider,
    tts_provider,
    hydro_translator,
)
from app.engines.farmer_intelligence import farmer_intelligence_engine

client = TestClient(app)


def test_supported_languages_endpoint():
    """Test 1: GET /api/v1/voice/languages returns 13 supported Indian languages."""
    res = client.get("/api/v1/voice/languages")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 13
    codes = [l["language_code"] for l in data]
    assert "en" in codes
    assert "hi" in codes
    assert "te" in codes
    assert "kn" in codes
    assert "mr" in codes
    assert "ta" in codes
    assert "bn" in codes
    assert "ur" in codes
    print("   [PASS] Test 1: 13 Supported Languages Endpoint")


def test_language_detection_script_ranges():
    """Test 2: Automatic script-based language detection for Indian regional scripts."""
    assert LanguageDetector.detect_language("मेरे खेत में भूजल कैसा है?") == "hi"
    assert LanguageDetector.detect_language("నా పొలం వద్ద భూజలం ఎలా ఉంది?") == "te"
    assert LanguageDetector.detect_language("ನನ್ನ ಜಮೀನಿನ ಬಳಿ ಅಂತರ್ਜಲ ಹೇಗಿದೆ?") == "kn"
    assert LanguageDetector.detect_language("माझ्या शेतात पाणी कसे आहे?") == "mr"
    assert LanguageDetector.detect_language("நிலத்தடி நீர் நிலை எப்படி உள்ளது?") == "ta"
    assert LanguageDetector.detect_language("আমার জমিতে জল কেমন আছে?") == "bn"
    assert LanguageDetector.detect_language("How is groundwater in my farm?") == "en"
    print("   [PASS] Test 2: Automatic Script-Based Language Detection")


def test_unconfigured_stt_and_tts_provider_graceful_fallback():
    """Test 3: Speech/TTS providers report NOT_CONFIGURED safely without application collapse."""
    assert stt_provider.status == "NOT_CONFIGURED"
    assert tts_provider.status == "NOT_CONFIGURED"

    # Test /voice/transcribe endpoint fallback
    res_stt = client.post(
        "/api/v1/voice/transcribe",
        files={"file": ("sample.wav", b"dummy_audio", "audio/wav")},
    )
    assert res_stt.status_code == 200
    stt_data = res_stt.json()
    assert stt_data["stt_provider_status"] == "NOT_CONFIGURED"

    # Test /voice/synthesize endpoint fallback
    res_tts = client.post("/api/v1/voice/synthesize", json={"text": "Test speech", "language": "en"})
    assert res_tts.status_code == 200
    tts_data = res_tts.json()
    assert tts_data["status"] == "NOT_CONFIGURED"
    assert tts_data["audio_url"] is None
    print("   [PASS] Test 3: Unconfigured STT/TTS Provider Fallback (No Collapse)")


def test_voice_query_routes_to_unified_farmer_intelligence_dwlr_location():
    """Test 4: Voice query at DWLR location invokes Unified Farmer Intelligence (Mode A Direct DWLR)."""
    payload = {
        "session_id": "test_hi_dwlr_session",
        "query": "मेरे खेत के पास भूजल की स्थिति कैसी है?",
        "latitude": 13.1367,
        "longitude": 78.1291,
        "language": "hi",
    }
    res = client.post("/api/v1/voice/respond", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["detected_language"] == "hi"
    assert data["farmer_response_language"] == "hi"
    assert data["intelligence"]["estimation_mode"] == "DIRECT_DWLR"
    assert "प्रत्यक्ष DWLR माप" in data["text_response"] or "जलकृषि" in data["text_response"]
    assert data["stt_provider_status"] == "NOT_CONFIGURED"
    assert data["tts_provider_status"] == "NOT_CONFIGURED"
    assert data["translation_provider_status"] == "LOCAL_CORE_TRANSLATIONS"
    print("   [PASS] Test 4: Voice Query -> Unified Farmer Intelligence (Mode A Direct DWLR)")


def test_voice_query_routes_to_unified_farmer_intelligence_no_dwlr_location():
    """Test 5: Voice query at No-DWLR location invokes Unified Farmer Intelligence (Mode B Satellite-Assisted)."""
    payload = {
        "query": "నా పొలం వద్ద భూజలం అంచనా ఎలా ఉంది?",
        "latitude": 10.0,
        "longitude": 72.0,
        "language": "te",
    }
    res = client.post("/api/v1/voice/respond", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["detected_language"] == "te"
    assert data["farmer_response_language"] == "te"
    assert data["intelligence"]["estimation_mode"] == "SATELLITE_ASSISTED"
    assert "సాటిలైట్ ఆధారిత భూజల అంచనా" in data["text_response"] or "జల్​కృషి" in data["text_response"]
    assert "NOT a direct" in data["intelligence"]["disclaimer"]
    print("   [PASS] Test 5: Voice Query -> Unified Farmer Intelligence (Mode B Satellite-Assisted)")


def test_data_honesty_scientific_terminology_preservation_across_languages():
    """Test 6: Data-honesty scientific terminology is preserved accurately across translated responses."""
    intel_dwlr = farmer_intelligence_engine.get_unified_groundwater_intelligence(13.1367, 78.1291)
    intel_sat = farmer_intelligence_engine.get_unified_groundwater_intelligence(10.0, 72.0)

    # Hindi
    hi_dwlr = hydro_translator.format_farmer_response(intel_dwlr, "hi")
    hi_sat = hydro_translator.format_farmer_response(intel_sat, "hi")
    assert "प्रत्यक्ष DWLR माप" in hi_dwlr
    assert "उपग्रह-सहायता प्राप्त भूजल अनुमान" in hi_sat
    assert "मॉडल-व्युत्पन्न अनुमान; प्रत्यक्ष कुएं का माप नहीं है।" in hi_sat

    # Kannada
    kn_dwlr = hydro_translator.format_farmer_response(intel_dwlr, "kn")
    kn_sat = hydro_translator.format_farmer_response(intel_sat, "kn")
    assert "ನೇರ DWLR ಅಳತೆ" in kn_dwlr
    assert "ಉಪಗ್ರಹ-ಸಹಾಯಿತ ಅಂತರ್ಜಲ ಅಂದಾಜು" in kn_sat

    # Tamil
    ta_sat = hydro_translator.format_farmer_response(intel_sat, "ta")
    assert "சாட்டிலைட் உதவியுடனான நிலத்தடி நீர் மதிப்பீடு" in ta_sat

    # Marathi
    mr_sat = hydro_translator.format_farmer_response(intel_sat, "mr")
    assert "उपग्रह-साहाय्यित भूजल अंदाज" in mr_sat

    print("   [PASS] Test 6: Data-Honesty Scientific Terminology Preservation Across Languages")


def test_multilingual_whatsapp_webhook_integration():
    """Test 7: WhatsApp webhook handles Hindi and regional queries with Unified Farmer Intelligence."""
    payload = {
        "message": "मेरे खेत के लिए फसल सलाह दें",
        "conversation_id": "wa-test-hi",
    }
    res = client.post("/api/v1/whatsapp/webhook", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "CROP_RECOMMENDATION"
    print("   [PASS] Test 7: Multilingual WhatsApp Webhook Integration")


if __name__ == "__main__":
    print("\n==================================================")
    print("RUNNING MULTILINGUAL VOICE ASSISTANT TEST SUITE (PHASE P)")
    print("==================================================")
    test_supported_languages_endpoint()
    test_language_detection_script_ranges()
    test_unconfigured_stt_and_tts_provider_graceful_fallback()
    test_voice_query_routes_to_unified_farmer_intelligence_dwlr_location()
    test_voice_query_routes_to_unified_farmer_intelligence_no_dwlr_location()
    test_data_honesty_scientific_terminology_preservation_across_languages()
    test_multilingual_whatsapp_webhook_integration()
    print("==================================================")
    print("ALL PHASE P MULTILINGUAL VOICE TESTS PASSED CLEANLY (7/7)!")
    print("==================================================\n")
