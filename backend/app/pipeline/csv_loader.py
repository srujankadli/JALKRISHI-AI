import csv
import io
from typing import List, Dict, Any, Tuple
from app.models.schemas import (
    DWLRNormalizedRecord,
    CSVValidationResponse,
    StationStatus,
    TrendDirection,
    TelemetryStatus,
    DataSourceEnum,
)
from app.pipeline.data_quality import data_quality_engine


class CSVLoader:
    """
    Generic CSV Telemetry Ingestion & Validation Adapter.
    Parses arbitrary CSV telemetry records, normalizes headers, and evaluates data quality.
    """

    HEADER_MAPPINGS = {
        "station_id": ["id", "station_id", "stationid", "well_id", "station_code"],
        "station_name": ["name", "station_name", "stationname", "location_name"],
        "state": ["state", "state_name", "province"],
        "district": ["district", "district_name", "dist"],
        "block": ["block", "tehsil", "taluk", "subdistrict"],
        "latitude": ["lat", "latitude", "y"],
        "longitude": ["lon", "lng", "longitude", "x"],
        "water_depth_mbgl": ["water_depth_mbgl", "water_level", "waterlevel", "depth", "depth_mbgl", "water_depth"],
        "status": ["status", "station_status", "condition"],
        "trend": ["trend", "trend_direction"],
        "risk_score": ["risk_score", "riskscore", "risk"],
        "telemetry_status": ["telemetry_status", "telemetry", "sensor_status"],
    }

    @classmethod
    def _normalize_header(cls, header: str) -> str:
        h_clean = header.strip().lower().replace(" ", "_").replace("-", "_")
        for canonical, aliases in cls.HEADER_MAPPINGS.items():
            if h_clean == canonical or h_clean in aliases:
                return canonical
        return h_clean

    @classmethod
    def parse_csv_content(cls, csv_text: str) -> Tuple[List[Dict[str, Any]], List[str]]:
        reader = csv.reader(io.StringIO(csv_text.strip()))
        rows = list(reader)
        if not rows:
            return [], ["Empty CSV content provided."]

        raw_headers = rows[0]
        norm_headers = [cls._normalize_header(h) for h in raw_headers]

        parsed_records: List[Dict[str, Any]] = []
        parse_errors: List[str] = []

        for row_idx, row in enumerate(rows[1:], start=2):
            if not row or all(not cell.strip() for cell in row):
                continue  # Skip blank lines

            if len(row) != len(norm_headers):
                parse_errors.append(f"Row {row_idx}: Column count mismatch (expected {len(norm_headers)}, got {len(row)}).")
                continue

            record: Dict[str, Any] = {}
            for col_idx, key in enumerate(norm_headers):
                val = row[col_idx].strip()
                record[key] = val

            # Normalize field values for validation without masking missing fields
            raw_id = (record.get("station_id") or "").strip()
            raw_name = (record.get("station_name") or "").strip()
            raw_state = (record.get("state") or "").strip()
            raw_dist = (record.get("district") or "").strip()

            record["station_id"] = raw_id
            record["id"] = raw_id
            record["station_name"] = raw_name
            record["stationName"] = raw_name
            record["state"] = raw_state
            record["district"] = raw_dist
            record["block"] = (record.get("block") or "").strip()

            # Coordinates
            raw_lat = record.get("latitude")
            raw_lon = record.get("longitude")
            record["latitude"] = raw_lat if raw_lat is not None and str(raw_lat).strip() != "" else None
            record["longitude"] = raw_lon if raw_lon is not None and str(raw_lon).strip() != "" else None

            # Water depth
            raw_depth = record.get("water_depth_mbgl")
            record["water_depth_mbgl"] = raw_depth if raw_depth is not None and str(raw_depth).strip() != "" else None
            record["waterLevel"] = record["water_depth_mbgl"]

            # Status & Trend
            raw_status = (record.get("status") or "moderate").strip().lower()
            record["status"] = raw_status if raw_status in [s.value for s in StationStatus] else raw_status

            raw_trend = (record.get("trend") or "stable").strip().lower()
            record["trend"] = raw_trend if raw_trend in [t.value for t in TrendDirection] else raw_trend

            # Risk score
            raw_risk = record.get("risk_score")
            try:
                record["risk_score"] = float(raw_risk) if raw_risk is not None else 0.5
            except (ValueError, TypeError):
                record["risk_score"] = 0.5
            record["riskScore"] = record["risk_score"]

            record["telemetry_status"] = record.get("telemetry_status") or "online"
            record["telemetryStatus"] = record["telemetry_status"]

            parsed_records.append(record)

        return parsed_records, parse_errors

    @classmethod
    def validate_csv(cls, csv_text: str) -> CSVValidationResponse:
        records, parse_errors = cls.parse_csv_content(csv_text)
        report = data_quality_engine.validate_stations(records)

        # Append any parse errors to the report issues list
        if parse_errors:
            report.issues_list = parse_errors + report.issues_list
            report.errors_count += len(parse_errors)
            report.valid = False

        sample_preview = records[:5] if records else []

        return CSVValidationResponse(
            success=report.valid,
            records_parsed=len(records),
            valid_records=report.valid_records,
            invalid_records=report.invalid_records,
            quality_report=report,
            sample_records=sample_preview,
            data_mode="DEMO_SIMULATION",
        )


csv_loader = CSVLoader()
