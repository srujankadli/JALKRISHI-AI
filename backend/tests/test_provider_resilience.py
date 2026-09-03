"""
JalKrishi AI — Data Provider Resilience Layer Test Suite
--------------------------------------------------------
Tests provider-agnostic resolution, Government DWLR API adapter (NOT_CONFIGURED),
Dataset Upload Provider, Reference Simulation Provider, provider switching, and
data-honesty safeguards.
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.pipeline.provider_resilience import provider_registry, DatasetUploadProvider
from app.models.schemas import ProviderStatusEnum, ProviderTypeEnum, NormalizedDWLRObservation

client = TestClient(app)


def test_government_adapter_unconfigured():
    """Test A: Government DWLR API adapter is NOT_CONFIGURED and handled safely."""
    gov = provider_registry.government_adapter
    meta = gov.get_metadata()

    assert meta.status == ProviderStatusEnum.NOT_CONFIGURED
    assert meta.provider_type == ProviderTypeEnum.GOVERNMENT_API
    assert not gov.is_available()
    assert len(gov.get_observations()) == 0
    print("   [PASS] Test A: Government DWLR API Adapter Unconfigured & Handled Safely")


def test_reference_simulation_provider():
    """Test B: Reference Simulation Provider is active and returns normalized data."""
    sim = provider_registry.reference_simulation_provider
    meta = sim.get_metadata()

    assert meta.status == ProviderStatusEnum.ACTIVE_SIMULATION
    assert sim.is_available()
    obs = sim.get_observations()
    assert len(obs) >= 5000
    assert isinstance(obs[0], NormalizedDWLRObservation)
    assert obs[0].provider_source == "JalKrishi Reference Simulation Dataset"
    print("   [PASS] Test B: Reference Simulation Provider Operational & Normalized")


def test_dataset_upload_provider():
    """Test C: Dataset Upload Provider ingests CSV and normalizes readings."""
    upload_prov = DatasetUploadProvider()
    meta_before = upload_prov.get_metadata()
    assert meta_before.status == ProviderStatusEnum.AVAILABLE_CAPABILITY

    sample_csv = (
        "station_id,station_name,state,district,block,latitude,longitude,groundwater_level,risk_score,status\n"
        "CUSTOM-001,Test Well 1,Karnataka,Kolar,Mulbagal,13.13,78.13,18.4,0.65,warning\n"
        "CUSTOM-002,Test Well 2,Punjab,Sangrur,Sunam,30.24,75.84,28.2,0.85,critical\n"
    )

    count = upload_prov.ingest_csv_content(sample_csv, "test_farm.csv")
    assert count == 2
    assert upload_prov.is_available()

    meta = upload_prov.get_metadata()
    assert meta.status == ProviderStatusEnum.ACTIVE
    assert "test_farm.csv" in meta.message

    obs = upload_prov.get_observations()
    assert len(obs) == 2
    assert obs[0].station_id == "CUSTOM-001"
    assert obs[0].groundwater_level_mbgl == 18.4
    assert obs[0].provider_source == "Uploaded DWLR Dataset (test_farm.csv)"
    print("   [PASS] Test C: Dataset Upload Provider Normalization & Activation (AVAILABLE_CAPABILITY -> ACTIVE)")


def test_provider_resolution_fallback_chain():
    """Test D: Provider registry resolves active provider cleanly via fallback chain."""
    # Ensure default resolves to reference simulation
    provider_registry.dataset_upload_provider.clear_dataset()
    active = provider_registry.resolve_active_dwlr_provider()
    assert active.get_metadata().provider_type == ProviderTypeEnum.SIMULATION

    # Activate custom upload dataset
    sample_csv = "station_id,latitude,longitude,groundwater_level\nUP-999,15.5,75.5,12.0\n"
    provider_registry.dataset_upload_provider.ingest_csv_content(sample_csv, "active_custom.csv")

    active_now = provider_registry.resolve_active_dwlr_provider()
    assert active_now.get_metadata().provider_type == ProviderTypeEnum.DATASET_UPLOAD

    # Revert back
    provider_registry.dataset_upload_provider.clear_dataset()
    reverted = provider_registry.resolve_active_dwlr_provider()
    assert reverted.get_metadata().provider_type == ProviderTypeEnum.SIMULATION
    print("   [PASS] Test D: Fallback Resolution Chain (Gov -> Dataset Upload -> Reference Simulation)")


def test_provider_status_endpoints():
    """Test E: Provider status REST API endpoints return full matrix."""
    response = client.get("/api/v1/providers/status")
    assert response.status_code == 200
    data = response.json()

    assert "active_provider" in data
    assert "providers" in data
    assert len(data["providers"]) == 10
    assert data["total_providers"] == 10
    assert "disclaimer" in data

    active_resp = client.get("/api/v1/providers/active")
    assert active_resp.status_code == 200
    act_data = active_resp.json()
    assert act_data["provider_name"] == "JalKrishi Reference Simulation Dataset"
    print("   [PASS] Test E: REST API Endpoints (/providers/status & /providers/active)")


def test_data_honesty_safeguard():
    """Test F: Data honesty safeguard — no fake live government claims."""
    matrix = provider_registry.get_system_provider_matrix()
    matrix_json_str = matrix.model_dump_json()

    assert "Live Government DWLR Data" not in matrix_json_str
    assert "Live Government Data" not in matrix_json_str

    gov_meta = provider_registry.government_adapter.get_metadata()
    assert gov_meta.status == ProviderStatusEnum.NOT_CONFIGURED
    print("   [PASS] Test F: Data Honesty Safeguard (No Fake Government Claims)")


def test_end_to_end_downstream_ingestion_path():
    """Test G: Uploading CSV dataset propagates to station_repo and downstream analytics."""
    sample_csv = (
        "station_id,station_name,state,district,block,latitude,longitude,groundwater_level,risk_score,status\n"
        "UP-TEST-01,Uploaded Well 1,Goa,North Goa,Panaji,15.49,73.82,10.5,0.25,healthy\n"
        "UP-TEST-02,Uploaded Well 2,Goa,South Goa,Margao,15.27,73.95,22.4,0.82,critical\n"
    )

    # Ingest CSV dataset
    res = client.post("/api/v1/providers/upload-dataset", data={"csv_text": sample_csv})
    assert res.status_code == 200

    # 1. Verify station_repo serves uploaded stations
    from app.pipeline.dwlr_ingest import station_repo
    all_st = station_repo.get_all()
    assert len(all_st) == 2
    assert all_st[0].id == "UP-TEST-01"

    # 2. Verify Analytics Summary consumes uploaded data
    from app.engines.analytics import analytics_engine
    summary = analytics_engine.get_network_summary()
    assert summary.total_stations == 2
    assert summary.healthy_stations == 1
    assert summary.critical_stations == 1

    # 3. Clear custom dataset and verify system reverts to reference simulation
    res_clear = client.post("/api/v1/providers/clear-dataset")
    assert res_clear.status_code == 200

    reverted_st = station_repo.get_all()
    assert len(reverted_st) == 5260
    print("   [PASS] Test G: End-to-End Downstream Path (Upload -> Station Repo -> Analytics -> Clear Reset)")


def test_corrupted_csv_resilience():
    """Test H: Corrupted or invalid CSV uploads do NOT crash system and trigger safe fallback."""
    bad_csv = "unrecognized_col1,unrecognized_col2\nsome_text_string,other_text_string\n"
    res = client.post("/api/v1/providers/upload-dataset", data={"csv_text": bad_csv})
    # Should safely return 400 Bad Request without crashing backend
    assert res.status_code == 400

    # Verify system remains on reference simulation network
    from app.pipeline.dwlr_ingest import station_repo
    assert len(station_repo.get_all()) == 5260
    print("   [PASS] Test H: Corrupted CSV Resilience & Safe Fallback")


if __name__ == "__main__":
    print("\n==================================================")
    print("RUNNING DATA PROVIDER RESILIENCE LAYER TESTS")
    print("==================================================")
    test_government_adapter_unconfigured()
    test_reference_simulation_provider()
    test_dataset_upload_provider()
    test_provider_resolution_fallback_chain()
    test_provider_status_endpoints()
    test_data_honesty_safeguard()
    test_end_to_end_downstream_ingestion_path()
    test_corrupted_csv_resilience()
    print("==================================================")
    print("ALL PROVIDER RESILIENCE TESTS PASSED CLEANLY (8/8)!")
    print("==================================================\n")
