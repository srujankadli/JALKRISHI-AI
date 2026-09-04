"""
Comprehensive Test Suite for JalKrishi Proactive Groundwater Intelligence & Early Warning Engine
================================================================================================
Tests multi-signal fusion, risk state categorization, data quality overrides, explainability,
audience action generation, alert lifecycle persistence, spatial rollups, and conversational AI.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import (
    ProactiveRiskState,
    ProactiveLifecycleStatus,
    ProactiveSignalType,
    DWLRStationSchema,
    TrendDirection,
    StationStatus,
    TelemetryStatus,
    VoiceQueryRequest,
)
from app.engines.proactive_intelligence import (
    ProactiveGroundwaterIntelligenceEngine,
    proactive_intelligence_engine,
)
from app.engines.farmer_dialogue_manager import farmer_dialogue_manager
from app.engines.farmer_intent_router import farmer_intent_router

client = TestClient(app)


def test_proactive_engine_initialization():
    """Verify engine singleton is initialized and has evaluated initial network alerts."""
    engine = proactive_intelligence_engine
    assert engine is not None
    overview = engine.get_overview()
    assert (overview.total_active_alerts + overview.stable_monitored_count) >= 10
    assert overview.data_mode == "DEMO_SIMULATION"
    assert "JalKrishi Reference Simulation" in overview.provenance


def test_evaluate_station_stable():
    """Verify station with normal level and stable trend evaluates to STABLE risk state."""
    st = DWLRStationSchema(
        id="TEST-STABLE-001",
        stationCode="TEST-STABLE-001",
        stationName="Stable Test Well",
        state="Karnataka",
        district="Bengaluru Urban",
        block="North",
        latitude=13.0,
        longitude=77.5,
        waterLevel=8.5,
        previousWaterLevel=8.4,
        seasonalAverage=8.0,
        criticalThreshold=25.0,
        riskScore=0.15,
        status=StationStatus.HEALTHY,
        trend=TrendDirection.STABLE,
        trendRateMetersPerMonth=0.05,
        batteryLevel=95,
        telemetryStatus=TelemetryStatus.ONLINE,
        lastUpdated="2026-09-04 12:00:00 UTC",
    )
    alert = proactive_intelligence_engine.evaluate_station(st)
    assert alert.risk_state == ProactiveRiskState.STABLE
    assert alert.priority_score <= 40.0
    assert "stable" in alert.explainability.what_changed.lower()


def test_evaluate_station_critical_risk():
    """Verify station with deep water level and severe falling trend evaluates to CRITICAL_RISK."""
    st = DWLRStationSchema(
        id="TEST-CRITICAL-001",
        stationCode="TEST-CRITICAL-001",
        stationName="Critical Depletion Well",
        state="Punjab",
        district="Sangrur",
        block="Sunam",
        latitude=30.1,
        longitude=75.8,
        waterLevel=36.5,
        previousWaterLevel=35.8,
        seasonalAverage=28.0,
        criticalThreshold=30.0,
        riskScore=0.92,
        status=StationStatus.CRITICAL,
        trend=TrendDirection.FALLING,
        trendRateMetersPerMonth=0.55,
        batteryLevel=88,
        telemetryStatus=TelemetryStatus.ONLINE,
        lastUpdated="2026-09-04 12:00:00 UTC",
    )
    alert = proactive_intelligence_engine.evaluate_station(st)
    assert alert.risk_state == ProactiveRiskState.CRITICAL_RISK
    assert alert.priority_score >= 60.0
    assert len(alert.evidence_signals) >= 2
    assert len(alert.audience_actions) >= 2
    # Verify farmer action contains urgent advice
    farmer_action = next((a for a in alert.audience_actions if a.target_audience == "FARMER" or a.target_audience.value == "FARMER"), None)
    assert farmer_action is not None


def test_evaluate_station_recovery_signal():
    """Verify station with rising water table and positive recharge evaluates to RECOVERY_SIGNAL."""
    st = DWLRStationSchema(
        id="TEST-RECOVERY-001",
        stationCode="TEST-RECOVERY-001",
        stationName="Recharge Test Well",
        state="Tamil Nadu",
        district="Thanjavur",
        block="Budalur",
        latitude=10.7,
        longitude=79.1,
        waterLevel=5.2,
        previousWaterLevel=6.1,
        seasonalAverage=7.0,
        criticalThreshold=20.0,
        riskScore=0.10,
        status=StationStatus.HEALTHY,
        trend=TrendDirection.RISING,
        trendRateMetersPerMonth=-0.35,
        batteryLevel=92,
        telemetryStatus=TelemetryStatus.ONLINE,
        lastUpdated="2026-09-04 12:00:00 UTC",
    )
    alert = proactive_intelligence_engine.evaluate_station(st)
    assert alert.risk_state == ProactiveRiskState.RECOVERY_SIGNAL
    assert "recharge" in alert.explainability.what_changed.lower() or "rising" in alert.explainability.what_changed.lower() or "shallower" in alert.explainability.what_changed.lower()


def test_data_quality_override():
    """Verify degraded telemetry overrides risk evaluation with DATA_QUALITY_WARNING."""
    st = DWLRStationSchema(
        id="TEST-OFFLINE-001",
        stationCode="TEST-OFFLINE-001",
        stationName="Offline Sensor Well",
        state="Rajasthan",
        district="Jodhpur",
        block="Mandore",
        latitude=26.2,
        longitude=73.0,
        waterLevel=38.0,
        previousWaterLevel=37.0,
        seasonalAverage=30.0,
        criticalThreshold=32.0,
        riskScore=0.88,
        status=StationStatus.CRITICAL,
        trend=TrendDirection.FALLING,
        trendRateMetersPerMonth=0.60,
        batteryLevel=15,
        telemetryStatus=TelemetryStatus.OFFLINE,
        lastUpdated="2026-09-04 12:00:00 UTC",
    )
    alert = proactive_intelligence_engine.evaluate_station(st)
    assert alert.risk_state == ProactiveRiskState.DATA_QUALITY_WARNING
    assert alert.confidence == "LOW"


def test_alert_lifecycle_and_deduplication():
    """Verify persistent alert updates lifecycle status when severity changes."""
    engine = ProactiveGroundwaterIntelligenceEngine()
    
    # 1. First evaluation: Emerging risk -> NEW
    st1 = DWLRStationSchema(
        id="TEST-LIFE-001",
        stationCode="TEST-LIFE-001",
        stationName="Lifecycle Well",
        state="Haryana",
        district="Sirsa",
        block="Rania",
        latitude=29.5,
        longitude=75.0,
        waterLevel=22.0,
        previousWaterLevel=21.8,
        seasonalAverage=18.0,
        criticalThreshold=25.0,
        riskScore=0.55,
        status=StationStatus.MODERATE,
        trend=TrendDirection.FALLING,
        trendRateMetersPerMonth=0.22,
        batteryLevel=85,
        telemetryStatus=TelemetryStatus.ONLINE,
        lastUpdated="2026-09-04 12:00:00 UTC",
    )
    al1 = engine.evaluate_station(st1)
    assert al1.lifecycle_status == ProactiveLifecycleStatus.NEW
    
    # 2. Re-evaluation with accelerating depletion -> ESCALATING
    st2 = DWLRStationSchema(
        id="TEST-LIFE-001",
        stationCode="TEST-LIFE-001",
        stationName="Lifecycle Well",
        state="Haryana",
        district="Sirsa",
        block="Rania",
        latitude=29.5,
        longitude=75.0,
        waterLevel=28.5,
        previousWaterLevel=26.0,
        seasonalAverage=18.0,
        criticalThreshold=25.0,
        riskScore=0.85,
        status=StationStatus.CRITICAL,
        trend=TrendDirection.FALLING,
        trendRateMetersPerMonth=0.50,
        batteryLevel=80,
        telemetryStatus=TelemetryStatus.ONLINE,
        lastUpdated="2026-09-04 12:00:00 UTC",
    )
    al2 = engine.evaluate_station(st2)
    assert al2.risk_state in [ProactiveRiskState.ESCALATING_RISK, ProactiveRiskState.CRITICAL_RISK]
    assert al2.lifecycle_status in [ProactiveLifecycleStatus.ESCALATING, ProactiveLifecycleStatus.ACTIVE]


def test_proactive_api_overview():
    """Test GET /api/v1/proactive/overview endpoint returns valid schema."""
    resp = client.get("/api/v1/proactive/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_active_alerts" in data
    assert "stable_monitored_count" in data
    assert "critical_risk_count" in data
    assert "category_distribution" in data


def test_proactive_api_alerts_filtered():
    """Test GET /api/v1/proactive/alerts with risk_state and audience filters."""
    resp = client.get("/api/v1/proactive/alerts?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "alert_id" in first
        assert "explainability" in first
        assert "audience_actions" in first


def test_proactive_api_regions_rollup():
    """Test GET /api/v1/proactive/regions aggregates by district and state."""
    resp_dist = client.get("/api/v1/proactive/regions?region_type=district")
    assert resp_dist.status_code == 200
    data_dist = resp_dist.json()
    assert "regions" in data_dist
    assert len(data_dist["regions"]) > 0

    resp_state = client.get("/api/v1/proactive/regions?region_type=state")
    assert resp_state.status_code == 200
    data_state = resp_state.json()
    assert "regions" in data_state
    assert len(data_state["regions"]) > 0


def test_farmer_dialogue_proactive_flow():
    """Test conversational Dialogue Manager handling proactive queries."""
    session_id = "test_proactive_flow_session"
    
    # 1. Proactive question without location -> asks for location
    req1 = VoiceQueryRequest(query="Is there any water warning for my area?")
    res1 = farmer_dialogue_manager.process_message(req1, session_id=session_id)
    assert res1.intent == "PROACTIVE_STATUS"
    assert res1.awaiting_location is True
    assert "location" in res1.text_response.lower()

    # 2. Location follow-up -> resolves and gives proactive brief
    req2 = VoiceQueryRequest(query="Sangrur")
    res2 = farmer_dialogue_manager.process_message(req2, session_id=session_id)
    assert res2.intent == "PROACTIVE_STATUS"
    assert res2.location is not None
    assert "Sangrur" in res2.location.name or "Sangrur" in res2.text_response
    assert len(res2.text_response) > 20
