"""
Test Suite: Official Command & Decision Center Security & Intelligence API
--------------------------------------------------------------------------
Verifies:
1. Server-side geographic authorization (State & District scoping enforcement).
2. Role-Based Access Control (ADMIN, STATE_OFFICIAL, DISTRICT_OFFICIAL, HYDROLOGIST_ANALYST, READ_ONLY_OFFICIAL allowed; FARMER blocked with 403).
3. Cross-region access attempts raise HTTP 403 Forbidden.
4. Official overview KPIs, GIS intelligence map layers, and simulation disclosures.
5. Explainable stress ("Why is this area stressed?"), Early Warning alerts, Risk Index ranking.
6. What-if scenario simulator disclaimers and AI analyst grounded responses.
7. Evidence Center provider statuses (NASA GRACE, Sentinel-1, Government API NOT_CONFIGURED).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.routers.auth import ACTIVE_SESSIONS, DEMO_USERS
from app.models.schemas import UserRoleEnum, UserProfile

client = TestClient(app)

# Session tokens for tests
ADMIN_TOKEN = "jalkrishi-jwt-token-admin-test"
STATE_OFFICIAL_TOKEN = "jalkrishi-jwt-token-state-test"
DISTRICT_OFFICIAL_TOKEN = "jalkrishi-jwt-token-district-test"
ANALYST_TOKEN = "jalkrishi-jwt-token-analyst-test"
OBSERVER_TOKEN = "jalkrishi-jwt-token-observer-test"
FARMER_TOKEN = "jalkrishi-jwt-token-farmer-test"


@pytest.fixture(autouse=True)
def setup_test_auth_sessions():
    ACTIVE_SESSIONS[ADMIN_TOKEN] = DEMO_USERS["admin@jalkrishi.gov.in"]
    ACTIVE_SESSIONS[STATE_OFFICIAL_TOKEN] = DEMO_USERS["officer@jalkrishi.gov.in"]
    ACTIVE_SESSIONS[DISTRICT_OFFICIAL_TOKEN] = DEMO_USERS["kvk@jalkrishi.gov.in"]
    ACTIVE_SESSIONS[ANALYST_TOKEN] = DEMO_USERS["analyst@jalkrishi.gov.in"]
    ACTIVE_SESSIONS[OBSERVER_TOKEN] = DEMO_USERS["observer@jalkrishi.gov.in"]
    ACTIVE_SESSIONS[FARMER_TOKEN] = DEMO_USERS["farmer@jalkrishi.in"]
    yield


def test_farmer_blocked_from_official_endpoints():
    """FARMER role must receive HTTP 403 Forbidden on all official endpoints."""
    headers = {"Authorization": f"Bearer {FARMER_TOKEN}"}
    endpoints = [
        "/api/v1/official/overview",
        "/api/v1/official/map",
        "/api/v1/official/alerts",
        "/api/v1/official/risk-ranking",
        "/api/v1/official/trends",
        "/api/v1/official/network",
        "/api/v1/official/interventions",
        "/api/v1/official/evidence",
    ]

    for ep in endpoints:
        res = client.get(ep, headers=headers)
        assert res.status_code == 403, f"Farmer should be blocked with 403 on {ep}, got {res.status_code}"
        assert "Access denied" in res.json()["detail"]


def test_state_official_cross_region_access_forbidden():
    """STATE_OFFICIAL (authorized for Punjab & Haryana) requesting forbidden state (e.g. Rajasthan) raises 403."""
    headers = {"Authorization": f"Bearer {STATE_OFFICIAL_TOKEN}"}
    
    # Authorized state query (Punjab)
    res_ok = client.get("/api/v1/official/map?target_region=Punjab", headers=headers)
    assert res_ok.status_code == 200

    # Cross-region unauthorized state query (Rajasthan)
    res_bad = client.get("/api/v1/official/map?target_region=Rajasthan", headers=headers)
    assert res_bad.status_code == 403
    assert "Geographic scope violation" in res_bad.json()["detail"]


def test_district_official_cross_region_access_forbidden():
    """DISTRICT_OFFICIAL (authorized for Sangrur) requesting forbidden district (e.g. Kolkata) raises 403."""
    headers = {"Authorization": f"Bearer {DISTRICT_OFFICIAL_TOKEN}"}

    # Authorized district query (Sangrur)
    res_ok = client.get("/api/v1/official/risk-ranking?target_region=Sangrur", headers=headers)
    assert res_ok.status_code == 200

    # Cross-region unauthorized district query (Kolkata)
    res_bad = client.get("/api/v1/official/risk-ranking?target_region=Kolkata", headers=headers)
    assert res_bad.status_code == 403
    assert "Geographic scope violation" in res_bad.json()["detail"]


def test_admin_and_analyst_pan_india_access():
    """ADMIN and HYDROLOGIST_ANALYST have full Pan-India access across any target region."""
    admin_headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    analyst_headers = {"Authorization": f"Bearer {ANALYST_TOKEN}"}

    for headers in [admin_headers, analyst_headers]:
        res1 = client.get("/api/v1/official/overview", headers=headers)
        assert res1.status_code == 200
        assert res1.json()["kpis"]["monitoring_stations"] > 0

        res2 = client.get("/api/v1/official/map?target_region=Karnataka", headers=headers)
        assert res2.status_code == 200

        res3 = client.get("/api/v1/official/map?target_region=Punjab", headers=headers)
        assert res3.status_code == 200


def test_official_overview_kpi_and_disclosures():
    """Verifies official overview metrics and simulation data disclosures."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    res = client.get("/api/v1/official/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()

    kpis = data["kpis"]
    assert kpis["monitoring_stations"] == 5260
    assert kpis["reporting_stations"] > 0
    assert 0 <= kpis["data_coverage_pct"] <= 100
    assert "Reference Simulation Dataset" in data["disclaimer"] or "Hydrogeological Decision Support" in data["disclaimer"]


def test_explain_area_stress():
    """Verifies 'Why is this area stressed?' evidence breakdown."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    res = client.get("/api/v1/official/explain-stress?area_id=DWLR-PB-001", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["area_id"] == "DWLR-PB-001"
    assert len(data["primary_contributors"]) >= 3
    assert any("Decline" in c["factor"] for c in data["primary_contributors"])
    assert len(data["supporting_evidence"]) >= 3
    assert data["confidence"] in ["HIGH", "MEDIUM"]


def test_early_warning_alerts():
    """Verifies early warning system alerts with severity ratings."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    res = client.get("/api/v1/official/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["total_alerts"] > 0
    alert = data["alerts"][0]
    assert alert["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert len(alert["evidence"]) >= 2
    assert "suggested_official_action" in alert


def test_transparent_risk_index_ranking():
    """Verifies 5-component transparent risk ranking leaderboard."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    res = client.get("/api/v1/official/risk-ranking?sort_by=risk_score", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "Composite Risk Index" in data["methodology"]
    assert len(data["rankings"]) > 0
    top = data["rankings"][0]
    assert top["rank"] == 1
    assert len(top["components"]) == 5
    comp_names = [c["name"] for c in top["components"]]
    assert "Groundwater Stress" in comp_names
    assert "Declining Trend" in comp_names
    assert "Rainfall Signal" in comp_names


def test_what_if_scenario_simulator_disclosures():
    """Verifies scenario simulator output and mandatory simulation disclosures."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    payload = {
        "rainfall_pct_change": -15.0,
        "crop_demand_pct_change": 10.0,
        "recharge_intervention_level": "Medium",
        "target_region": "Kolar"
    }
    res = client.post("/api/v1/official/scenario", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["target_region"] == "Kolar"
    assert "simulated_stress_score" in data
    assert len(data["simulated_forecast_trajectory"]) == 3
    assert "Scenario Simulation" in data["disclaimer"]
    assert "not an operational forecast" in data["disclaimer"].lower()


def test_ai_intelligence_analyst_grounded_response():
    """Verifies Official AI Analyst returns grounded evidence without hallucination."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

    # Query 1: Risk question
    res1 = client.post("/api/v1/official/analyst", json={"query": "Which districts have the highest groundwater risk?"}, headers=headers)
    assert res1.status_code == 200
    d1 = res1.json()
    assert "groundwater risk" in d1["answer"].lower()
    assert len(d1["evidence"]) >= 2

    # Query 2: Unknown/insufficient evidence query
    res2 = client.post("/api/v1/official/analyst", json={"query": "What is the secret underground alien base count?"}, headers=headers)
    assert res2.status_code == 200
    d2 = res2.json()
    assert "don't have sufficient evidence" in d2["answer"].lower()


def test_evidence_center_provider_statuses():
    """Verifies Evidence Center provider status reporting (NASA GRACE, Sentinel-1, Government API NOT_CONFIGURED)."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    res = client.get("/api/v1/official/evidence", headers=headers)
    assert res.status_code == 200
    data = res.json()

    providers = {p["provider_name"]: p["status"] for p in data["providers"]}
    assert providers["JalKrishi Reference Simulation Dataset"] == "ACTIVE_SIMULATION"
    assert providers["Government Central Ground Water Board (CGWB) API"] == "NOT_CONFIGURED"
    assert providers["NASA GRACE Gravity Recovery Satellite Feed"] == "NOT_CONFIGURED"
    assert providers["Copernicus Sentinel-1 / InSAR Subsidence Feed"] == "NOT_CONFIGURED"


def test_region_comparison():
    """Verifies side-by-side region comparison API."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    payload = {"region_a": "Sangrur", "region_b": "Kolar"}
    res = client.post("/api/v1/official/compare", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["region_a"]["name"] == "Sangrur"
    assert data["region_b"]["name"] == "Kolar"
    assert "comparative_interpretation" in data


def test_read_only_official_read_access():
    """READ_ONLY_OFFICIAL role can access official read and analytical endpoints."""
    headers = {"Authorization": f"Bearer {OBSERVER_TOKEN}"}
    res = client.get("/api/v1/official/overview", headers=headers)
    assert res.status_code == 200
    assert res.json()["user_role"] in ["READ_ONLY_OFFICIAL", "Observer"]

    res_net = client.get("/api/v1/official/network", headers=headers)
    assert res_net.status_code == 200
    assert "missing_pings_count" in res_net.json()


def test_network_health_pagination_and_search():
    """Verifies server-side pagination, search queries, and multi-field filters on /official/network."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

    # Page 1 vs Page 2 differentiation
    res1 = client.get("/api/v1/official/network?page=1&page_size=10", headers=headers)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["page"] == 1
    assert d1["page_size"] == 10
    assert len(d1["stations"]) == 10
    assert d1["total_stations"] == 5260

    res2 = client.get("/api/v1/official/network?page=2&page_size=10", headers=headers)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["page"] == 2
    assert d2["page_size"] == 10
    assert len(d2["stations"]) == 10

    # Ensure page 1 and page 2 stations are distinct
    p1_ids = [s["station_id"] for s in d1["stations"]]
    p2_ids = [s["station_id"] for s in d2["stations"]]
    assert set(p1_ids).isdisjoint(set(p2_ids))

    # Search filter
    res_search = client.get("/api/v1/official/network?search=Sangrur", headers=headers)
    assert res_search.status_code == 200
    d_search = res_search.json()
    assert all("sangrur" in s["district"].lower() or "sangrur" in s["station_name"].lower() for s in d_search["stations"])

    # Multi-field filtering
    res_filter = client.get("/api/v1/official/network?risk=critical&telemetry_status=online", headers=headers)
    assert res_filter.status_code == 200
    d_filter = res_filter.json()
    for st in d_filter["stations"]:
        assert st["data_quality_status"] == "critical"
        assert st["telemetry_status"] == "online"


def test_risk_ranking_pagination_and_level():
    """Verifies server-side pagination and level (district vs state) on /official/risk-ranking."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

    # District level paginated
    res_dist = client.get("/api/v1/official/risk-ranking?level=district&page=1&page_size=10", headers=headers)
    assert res_dist.status_code == 200
    d_dist = res_dist.json()
    assert d_dist["page"] == 1
    assert d_dist["page_size"] == 10
    assert len(d_dist["rankings"]) <= 10
    assert d_dist["total_items"] > 0

    # State level paginated
    res_state = client.get("/api/v1/official/risk-ranking?level=state&page=1&page_size=10", headers=headers)
    assert res_state.status_code == 200
    d_state = res_state.json()
    assert d_state["page"] == 1
    assert len(d_state["rankings"]) > 0
    assert d_state["rankings"][0]["parent_region"] == "India"


def test_map_features_count_and_role_scoping():
    """Verifies official intelligence map returns complete 5,260 station features for ADMIN."""
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    res = client.get("/api/v1/official/map", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["features"]) == 5260
    assert data["features"][0]["type"] == "station"



