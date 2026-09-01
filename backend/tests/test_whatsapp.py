import sys
import os

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase H WhatsApp Conversational Tests")
    print("==================================================")

    client = TestClient(app)

    # 1. Health Endpoint
    print("1. Testing GET /api/v1/whatsapp/health...")
    res_health = client.get("/api/v1/whatsapp/health")
    assert res_health.status_code == 200
    h_data = res_health.json()
    assert h_data["status"] == "healthy"
    assert h_data["data_mode"] == "DEMO_SIMULATION"
    print("   [OK] WhatsApp health check verified.")

    # 2. Greeting Intent
    print("2. Testing Greeting Intent (Bilingual)...")
    res_g_en = client.post("/api/v1/whatsapp/webhook", json={"message": "hello", "conversation_id": "test-conv-1"})
    assert res_g_en.status_code == 200
    assert res_g_en.json()["intent"] == "GREETING"
    assert res_g_en.json()["language"] == "en"

    res_g_hi = client.post("/api/v1/whatsapp/webhook", json={"message": "नमस्ते", "conversation_id": "test-conv-1"})
    assert res_g_hi.status_code == 200
    assert res_g_hi.json()["intent"] == "GREETING"
    assert res_g_hi.json()["language"] == "hi"
    print("   [OK] Greeting intents verified (Bilingual).")

    # 3. Help Intent
    print("3. Testing Help Intent...")
    res_help = client.post("/api/v1/whatsapp/webhook", json={"message": "help", "conversation_id": "test-conv-1"})
    assert res_help.status_code == 200
    assert res_help.json()["intent"] == "HELP"
    print("   [OK] Help intent verified.")

    # 4. Kolar Water Query
    print("4. Testing Water Status Query ('Kolar water')...")
    res_w_kolar = client.post("/api/v1/whatsapp/webhook", json={"message": "Kolar water", "conversation_id": "test-conv-1"})
    assert res_w_kolar.status_code == 200
    w_data = res_w_kolar.json()
    assert w_data["intent"] == "WATER_STATUS"
    assert "Kolar" in w_data["reply"]
    assert "mbgl" in w_data["reply"]
    print("   [OK] Kolar water query verified.")

    # 5. Sangrur Hindi Query
    print("5. Testing Sangrur Hindi Query...")
    res_w_hi = client.post("/api/v1/whatsapp/webhook", json={"message": "संगरूर पानी", "conversation_id": "test-conv-2"})
    assert res_w_hi.status_code == 200
    w_hi_data = res_w_hi.json()
    assert w_hi_data["intent"] == "WATER_STATUS"
    assert w_hi_data["language"] == "hi"
    assert "Sangrur" in w_hi_data["reply"] or "संगरूर" in w_hi_data["reply"]
    print("   [OK] Sangrur Hindi water query verified.")

    # 6. Station ID Query
    print("6. Testing Station ID Query ('DWLR-PB-001')...")
    res_st = client.post("/api/v1/whatsapp/webhook", json={"message": "DWLR-PB-001", "conversation_id": "test-conv-1"})
    assert res_st.status_code == 200
    st_data = res_st.json()
    assert st_data["intent"] == "STATION_DETAILS"
    assert "DWLR-PB-001" in st_data["reply"]
    print("   [OK] Station details query verified.")

    # 7. Forecast Query
    print("7. Testing Forecast Query ('Kolar forecast')...")
    res_fc = client.post("/api/v1/whatsapp/webhook", json={"message": "Kolar forecast", "conversation_id": "test-conv-1"})
    assert res_fc.status_code == 200
    fc_data = res_fc.json()
    assert fc_data["intent"] == "FORECAST"
    assert "30" in fc_data["reply"]
    print("   [OK] Forecast query verified.")

    # 8. Crop Recommendation Query
    print("8. Testing Crop Recommendation ('what crop should I grow')...")
    res_crop = client.post("/api/v1/whatsapp/webhook", json={"message": "what crop should I grow", "conversation_id": "test-conv-1"})
    assert res_crop.status_code == 200
    crop_data = res_crop.json()
    assert crop_data["intent"] == "CROP_RECOMMENDATION"
    assert "Score:" in crop_data["reply"] or "स्कोर:" in crop_data["reply"]
    print("   [OK] Crop recommendation query verified.")

    # 9. Alerts Query
    print("9. Testing Alerts Query ('any warnings')...")
    res_alt = client.post("/api/v1/whatsapp/webhook", json={"message": "any warnings", "conversation_id": "test-conv-1"})
    assert res_alt.status_code == 200
    alt_data = res_alt.json()
    assert alt_data["intent"] == "ANOMALIES"
    assert "Alert" in alt_data["reply"] or "चेतावनी" in alt_data["reply"]
    print("   [OK] Alerts query verified.")

    # 10. Unknown Query
    print("10. Testing Unknown Query ('qwerty unknown 999')...")
    res_unk = client.post("/api/v1/whatsapp/webhook", json={"message": "qwerty unknown 999", "conversation_id": "test-conv-1"})
    assert res_unk.status_code == 200
    unk_data = res_unk.json()
    assert unk_data["intent"] == "UNKNOWN"
    print("   [OK] Unknown query fallback verified.")

    # 11. Shortcuts 1, 2, 3, 4
    print("11. Testing Shortcuts ('1', '2', '3', '4')...")
    r1 = client.post("/api/v1/whatsapp/webhook", json={"message": "1", "conversation_id": "test-conv-1"})
    assert r1.json()["intent"] == "WATER_STATUS"

    r2 = client.post("/api/v1/whatsapp/webhook", json={"message": "2", "conversation_id": "test-conv-1"})
    assert r2.json()["intent"] == "FORECAST"

    r3 = client.post("/api/v1/whatsapp/webhook", json={"message": "3", "conversation_id": "test-conv-1"})
    assert r3.json()["intent"] == "CROP_RECOMMENDATION"

    r4 = client.post("/api/v1/whatsapp/webhook", json={"message": "4", "conversation_id": "test-conv-1"})
    assert r4.json()["intent"] == "ANOMALIES"
    print("   [OK] Shortcuts 1-4 verified.")

    # 12. Nearest Station with GPS
    print("12. Testing Nearest Station with GPS Coordinates...")
    res_near = client.post(
        "/api/v1/whatsapp/webhook",
        json={"message": "nearest station", "latitude": 13.13, "longitude": 78.13, "conversation_id": "test-conv-1"},
    )
    assert res_near.status_code == 200
    near_data = res_near.json()
    assert near_data["intent"] == "NEAREST_STATION"
    assert "km" in near_data["reply"] or "किमी" in near_data["reply"]
    print("   [OK] Nearest station GPS query verified.")

    # 13. Cautious Non-Accusatory Language Check
    print("13. Checking Cautious Language Invariant...")
    assert "illegal extraction" not in alt_data["reply"].lower()
    assert "broken sensor" not in alt_data["reply"].lower()
    print("   [OK] Non-accusatory language verified.")

    # 14. Deterministic Repeatability
    print("14. Validating Deterministic Repeatability...")
    r_repeat1 = client.post("/api/v1/whatsapp/webhook", json={"message": "Kolar water", "conversation_id": "test-repeat"})
    r_repeat2 = client.post("/api/v1/whatsapp/webhook", json={"message": "Kolar water", "conversation_id": "test-repeat"})
    assert r_repeat1.json()["reply"] == r_repeat2.json()["reply"]
    print("   [OK] Deterministic repeatability confirmed (100% identical).")

    print("\n==================================================")
    print("ALL PHASE H WHATSAPP CONVERSATIONAL TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
