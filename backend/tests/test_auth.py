import sys
import os

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_login_success():
    payload = {
        "username_or_email": "admin@jalkrishi.gov.in",
        "password": "password123",
        "role": "hydrogeologist",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@jalkrishi.gov.in"
    assert data["user"]["name"] == "Dr. Rajesh Kumar Sharma"
    assert data["user"]["role"] == "Chief Hydrogeologist"
    assert data["data_mode"] == "DEMO_SIMULATION"


def test_auth_login_invalid_password():
    payload = {
        "username_or_email": "admin@jalkrishi.gov.in",
        "password": "12",
        "role": "hydrogeologist",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401


def test_auth_me():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "role" in data


if __name__ == "__main__":
    print("==================================================")
    print("Testing JalKrishi AI Authentication Router...")
    print("==================================================")
    test_auth_login_success()
    print("   [OK] Successful authentication verified.")
    test_auth_login_invalid_password()
    print("   [OK] Invalid password rejection verified.")
    test_auth_me()
    print("   [OK] Active user session probe verified.")
    print("==================================================")
    print("ALL AUTHENTICATION TESTS PASSED (100%)")
    print("==================================================")
