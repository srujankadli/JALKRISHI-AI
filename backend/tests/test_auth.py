import sys
import os

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import UserRoleEnum

client = TestClient(app)


def test_auth_login_admin_official():
    """Test 1: Official Admin Authentication returns Bearer token & ADMIN system_role."""
    payload = {
        "username_or_email": "admin@jalkrishi.gov.in",
        "password": "password123",
        "role": "hydrogeologist",
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@jalkrishi.gov.in"
    assert data["user"]["name"] == "Dr. Rajesh Kumar Sharma"
    assert data["user"]["system_role"] == UserRoleEnum.ADMIN
    print("   [PASS] Test 1: Official Admin Login")


def test_auth_login_farmer():
    """Test 2: Farmer Authentication returns Bearer token & FARMER system_role."""
    payload = {
        "username_or_email": "farmer@jalkrishi.in",
        "password": "farmerpassword",
        "role": "farmer",
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["system_role"] == UserRoleEnum.FARMER
    assert data["user"]["preferred_language"] == "pa"
    print("   [PASS] Test 2: Farmer Account Login")


def test_auth_login_invalid_credentials():
    """Test 3: Invalid credentials (short password) returns HTTP 401."""
    payload = {
        "username_or_email": "admin@jalkrishi.gov.in",
        "password": "12",
        "role": "hydrogeologist",
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 401
    print("   [PASS] Test 3: Invalid Credentials (HTTP 401)")


def test_rbac_farmer_access_denied_on_admin_endpoint():
    """Test 4: Backend RBAC: Farmer attempting admin dataset upload receives HTTP 403 Forbidden."""
    # 1. Log in as Farmer
    res_farm = client.post("/api/v1/auth/login", json={"username_or_email": "farmer@jalkrishi.in", "password": "pass"})
    farm_token = res_farm.json()["access_token"]

    # 2. Attempt admin dataset upload with Farmer Bearer token
    headers = {"Authorization": f"Bearer {farm_token}"}
    res_forbidden = client.post(
        "/api/v1/providers/upload-dataset",
        data={"csv_text": "station_id,groundwater_level\nUP-01,10.0\n"},
        headers=headers,
    )
    assert res_forbidden.status_code == 403
    assert "Access denied" in res_forbidden.json()["detail"]
    print("   [PASS] Test 4: RBAC Security Enforcement (Farmer -> Admin Endpoint -> HTTP 403)")


def test_rbac_readonly_official_access_denied_on_admin_clear():
    """Test 5: Backend RBAC: Read-Only Official attempting clear-dataset receives HTTP 403 Forbidden."""
    # 1. Log in as Read-Only Official Observer
    res_obs = client.post("/api/v1/auth/login", json={"username_or_email": "observer@jalkrishi.gov.in", "password": "pass"})
    obs_token = res_obs.json()["access_token"]

    # 2. Attempt clear dataset with Observer Bearer token
    headers = {"Authorization": f"Bearer {obs_token}"}
    res_forbidden = client.post("/api/v1/providers/clear-dataset", headers=headers)
    assert res_forbidden.status_code == 403
    assert "Access denied" in res_forbidden.json()["detail"]
    print("   [PASS] Test 5: RBAC Security Enforcement (Read-Only Official -> Admin Clear -> HTTP 403)")


def test_rbac_authorized_admin_access():
    """Test 6: Backend RBAC: Authorized Admin Bearer token is allowed on administrative endpoints."""
    # 1. Log in as Admin
    res_adm = client.post("/api/v1/auth/login", json={"username_or_email": "admin@jalkrishi.gov.in", "password": "pass"})
    adm_token = res_adm.json()["access_token"]

    # 2. Call clear dataset with Admin Bearer token
    headers = {"Authorization": f"Bearer {adm_token}"}
    res_allowed = client.post("/api/v1/providers/clear-dataset", headers=headers)
    assert res_allowed.status_code == 200
    assert res_allowed.json()["status"] == "success"
    print("   [PASS] Test 6: RBAC Authorized Admin Access (Admin -> Clear Endpoint -> HTTP 200)")


def test_auth_me_profile_token_persistence():
    """Test 7: GET /api/v1/auth/me returns matching user session profile for valid token."""
    res_login = client.post("/api/v1/auth/login", json={"username_or_email": "officer@jalkrishi.gov.in", "password": "pass"})
    officer_token = res_login.json()["access_token"]

    headers = {"Authorization": f"Bearer {officer_token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["email"] == "officer@jalkrishi.gov.in"
    assert me_data["system_role"] == UserRoleEnum.STATE_OFFICIAL
    print("   [PASS] Test 7: GET /api/v1/auth/me Token Session Persistence")


def test_dynamic_login_security_policy():
    """Test 8: Dynamic registration assigns default FARMER role and prevents self-elevation to ADMIN."""
    res_dyn = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "newuser@example.com", "password": "password123", "role": "admin"},
    )
    assert res_dyn.status_code == 200
    dyn_data = res_dyn.json()
    # Unverified external accounts MUST NOT receive ADMIN system_role
    assert dyn_data["user"]["system_role"] != UserRoleEnum.ADMIN
    print("   [PASS] Test 8: Dynamic Sign-In Security Safeguard (No Self-Elevation to ADMIN)")


if __name__ == "__main__":
    print("\n==================================================")
    print("RUNNING ROLE-BASED AUTHENTICATION & SECURITY TESTS")
    print("==================================================")
    test_auth_login_admin_official()
    test_auth_login_farmer()
    test_auth_login_invalid_credentials()
    test_rbac_farmer_access_denied_on_admin_endpoint()
    test_rbac_readonly_official_access_denied_on_admin_clear()
    test_rbac_authorized_admin_access()
    test_auth_me_profile_token_persistence()
    test_dynamic_login_security_policy()
    print("==================================================")
    print("ALL AUTH & RBAC TESTS PASSED CLEANLY (8/8)!")
    print("==================================================\n")
