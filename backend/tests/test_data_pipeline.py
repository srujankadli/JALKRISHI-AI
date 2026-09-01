import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from app.main import app
from app.pipeline.dwlr_ingest import station_repo
from app.pipeline.data_quality import data_quality_engine
from app.pipeline.csv_loader import csv_loader
from app.pipeline.future_adapters import (
    india_wris_loader,
    cgwb_loader,
    imd_rainfall_loader,
)


def run_tests():
    print("==================================================")
    print("JalKrishi AI -- Phase I Data Pipeline Validation")
    print("==================================================")

    client = TestClient(app)

    # 1. Verify Demo Dataset Ingestion & Quality Engine
    print("1. Validating 5,260 Stations with DataQualityEngine...")
    stations = station_repo.get_all()
    assert len(stations) == 5260
    report = data_quality_engine.validate_stations(stations)
    assert report.valid is True
    assert report.records_checked == 5260
    assert report.valid_records == 5260
    assert report.invalid_records == 0
    assert report.errors_count == 0
    assert report.duplicate_station_ids == 0
    assert report.invalid_coordinates == 0
    assert report.negative_depths == 0
    assert report.quality_score == 100.0
    print("   [OK] 5,260 stations validated with 100% quality score.")

    # 2. Test GET /api/v1/data/status Endpoint
    print("2. Testing GET /api/v1/data/status...")
    res_status = client.get("/api/v1/data/status")
    assert res_status.status_code == 200
    st_data = res_status.json()
    assert st_data["active_source"] == "DEMO_SIMULATION"
    assert st_data["data_mode"] == "DEMO_SIMULATION"
    assert st_data["station_count"] == 5260
    assert st_data["quality_score"] == 100.0
    assert st_data["validation_status"] == "PASS"
    assert "DEMO_SIMULATION" in st_data["available_sources"]
    assert "CSV_IMPORT" in st_data["available_sources"]
    assert "INDIA_WRIS" in st_data["future_sources"]
    assert "CGWB" in st_data["future_sources"]
    assert "IMD" in st_data["future_sources"]
    print("   [OK] Data status endpoint verified.")

    # 3. Test POST /api/v1/data/refresh Endpoint
    print("3. Testing POST /api/v1/data/refresh...")
    res_refresh = client.post("/api/v1/data/refresh")
    assert res_refresh.status_code == 200
    ref_data = res_refresh.json()
    assert ref_data["refresh_started"] is True
    assert ref_data["records_loaded"] == 5260
    assert ref_data["quality_score"] == 100.0
    assert ref_data["data_mode"] == "DEMO_SIMULATION"

    # Cross-check station determinism after refresh
    anchor = station_repo.get_by_id("DWLR-PB-001")
    assert anchor is not None
    assert anchor.district == "Sangrur"
    assert anchor.waterLevel == 28.4
    print("   [OK] Data refresh endpoint validated with deterministic repeatability.")

    # 4. Test Valid Synthetic CSV Validation
    print("4. Testing CSV Ingestion with Valid Synthetic Records...")
    valid_csv = (
        "station_id,station_name,state,district,latitude,longitude,water_depth_mbgl,status,trend,risk_score\n"
        "DWLR-TEST-001,Test Station Alpha,Punjab,Sangrur,30.25,75.84,24.5,moderate,falling,0.55\n"
        "DWLR-TEST-002,Test Station Beta,Karnataka,Kolar,13.13,78.13,18.2,healthy,stable,0.25\n"
        "DWLR-TEST-003,Test Station Gamma,Rajasthan,Jaipur,26.91,75.78,32.4,critical,falling,0.85\n"
    )
    res_csv = client.post("/api/v1/data/validate-csv", json={"csv_content": valid_csv})
    assert res_csv.status_code == 200
    csv_data = res_csv.json()
    assert csv_data["success"] is True
    assert csv_data["records_parsed"] == 3
    assert csv_data["valid_records"] == 3
    assert csv_data["invalid_records"] == 0
    assert csv_data["quality_report"]["quality_score"] == 100.0
    print("   [OK] Valid synthetic CSV parsed and passed quality check.")

    # 5. Test Invalid CSV Detection (Negative Depths, Out-of-bounds coords, Duplicate IDs)
    print("5. Testing CSV Validation with Corrupted / Invalid Records...")
    invalid_csv = (
        "station_id,station_name,state,district,latitude,longitude,water_depth_mbgl,status,trend,risk_score\n"
        "DWLR-BAD-001,Bad Depth Station,Punjab,Sangrur,30.25,75.84,-5.5,moderate,falling,0.55\n"
        "DWLR-BAD-002,Out of Bounds Coords,Karnataka,Kolar,95.00,120.00,18.2,healthy,stable,0.25\n"
        "DWLR-BAD-001,Duplicate ID Row,Rajasthan,Jaipur,26.91,75.78,32.4,critical,falling,0.85\n"
        ",Missing ID and metadata,,,,,15.0,moderate,stable,0.5\n"
    )
    res_bad_csv = client.post("/api/v1/data/validate-csv", json={"csv_content": invalid_csv})
    assert res_bad_csv.status_code == 200
    bad_csv_data = res_bad_csv.json()
    assert bad_csv_data["success"] is False
    assert bad_csv_data["invalid_records"] > 0
    assert bad_csv_data["quality_report"]["negative_depths"] >= 1
    assert bad_csv_data["quality_report"]["invalid_coordinates"] >= 1
    assert bad_csv_data["quality_report"]["duplicate_station_ids"] >= 1
    assert bad_csv_data["quality_report"]["missing_required_fields"] >= 1
    print("   [OK] Corrupted CSV errors cleanly isolated and reported.")

    # 6. Test Future Government Ingestion Adapters (NOT_CONFIGURED status)
    print("6. Testing Future Adapter Interfaces (India-WRIS, CGWB, IMD)...")
    res_wris = client.get("/api/v1/data/adapters/india-wris")
    assert res_wris.status_code == 200
    assert res_wris.json()["status"] == "NOT_CONFIGURED"

    res_cgwb = client.get("/api/v1/data/adapters/cgwb")
    assert res_cgwb.status_code == 200
    assert res_cgwb.json()["status"] == "NOT_CONFIGURED"

    res_imd = client.get("/api/v1/data/adapters/imd")
    assert res_imd.status_code == 200
    assert res_imd.json()["status"] == "NOT_CONFIGURED"

    # Direct class check
    assert india_wris_loader.get_status()["status"] == "NOT_CONFIGURED"
    assert cgwb_loader.get_status()["status"] == "NOT_CONFIGURED"
    assert imd_rainfall_loader.get_status()["status"] == "NOT_CONFIGURED"
    print("   [OK] Future adapter stubs verified as NOT_CONFIGURED.")

    # 7. Non-Versioned Route Alias Check
    print("7. Testing Non-Versioned /api/data/status Route Alias...")
    res_alias = client.get("/api/data/status")
    assert res_alias.status_code == 200
    assert res_alias.json()["station_count"] == 5260
    print("   [OK] Route alias verified.")

    print("\n==================================================")
    print("ALL PHASE I DATA PIPELINE TESTS PASSED (100%)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
