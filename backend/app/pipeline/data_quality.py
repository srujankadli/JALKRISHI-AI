from datetime import datetime
from typing import List, Dict, Any, Union, Tuple
from app.models.schemas import (
    DWLRStationSchema,
    DataQualityReport,
    StationStatus,
    TrendDirection,
    TelemetryStatus,
)
from app.config import settings

# Geographical & Physical Telemetry Validity Bounds for Indian subcontinent
LAT_MIN, LAT_MAX = 6.0, 38.5
LON_MIN, LON_MAX = 68.0, 98.0
MAX_PHYSICAL_DEPTH_MBGL = 250.0


class DataQualityEngine:
    """
    Quality Control & Telemetry Validation Engine.
    Validates station records, coordinates, depths, and historical consistency.
    """

    @staticmethod
    def validate_stations(
        stations: List[Union[DWLRStationSchema, Dict[str, Any]]]
    ) -> DataQualityReport:
        total = len(stations)
        seen_ids = set()
        duplicate_ids_count = 0
        invalid_coords_count = 0
        negative_depths_count = 0
        missing_fields_count = 0
        errors_count = 0
        warnings_count = 0
        issues: List[str] = []
        valid_records = 0

        valid_statuses = {s.value for s in StationStatus}
        valid_trends = {t.value for t in TrendDirection}
        valid_telemetry = {ts.value for ts in TelemetryStatus}

        for idx, item in enumerate(stations):
            is_record_valid = True

            # Extract fields whether dict or Pydantic model
            if isinstance(item, dict):
                st_id = item.get("id") or item.get("station_id")
                st_name = item.get("stationName") or item.get("station_name")
                state = item.get("state")
                district = item.get("district")
                lat = item.get("latitude")
                lon = item.get("longitude")
                depth = item.get("waterLevel") if "waterLevel" in item else item.get("water_depth_mbgl")
                status = item.get("status")
                trend = item.get("trend")
                risk = item.get("riskScore") if "riskScore" in item else item.get("risk_score")
                telem = item.get("telemetryStatus") if "telemetryStatus" in item else item.get("telemetry_status")
            else:
                st_id = item.id
                st_name = item.stationName
                state = item.state
                district = item.district
                lat = item.latitude
                lon = item.longitude
                depth = item.waterLevel
                status = item.status.value if hasattr(item.status, "value") else str(item.status)
                trend = item.trend.value if hasattr(item.trend, "value") else str(item.trend)
                risk = item.riskScore
                telem = item.telemetryStatus.value if hasattr(item.telemetryStatus, "value") else str(item.telemetryStatus)

            # 1. Missing Required Fields
            if not st_id or not st_name or not state or not district:
                missing_fields_count += 1
                errors_count += 1
                is_record_valid = False
                if len(issues) < 20:
                    issues.append(f"Row {idx+1}: Missing required metadata (ID, name, state, or district).")

            # 2. Duplicate Station ID
            if st_id:
                clean_id = str(st_id).strip().upper()
                if clean_id in seen_ids:
                    duplicate_ids_count += 1
                    errors_count += 1
                    is_record_valid = False
                    if len(issues) < 20:
                        issues.append(f"Row {idx+1}: Duplicate station ID '{clean_id}'.")
                else:
                    seen_ids.add(clean_id)

            # 3. Coordinates Bounds
            try:
                lat_f = float(lat)
                lon_f = float(lon)
                if not (LAT_MIN <= lat_f <= LAT_MAX and LON_MIN <= lon_f <= LON_MAX):
                    invalid_coords_count += 1
                    errors_count += 1
                    is_record_valid = False
                    if len(issues) < 20:
                        issues.append(f"Row {idx+1} ({st_id}): Coordinates ({lat_f}, {lon_f}) outside Indian bounds.")
            except (ValueError, TypeError):
                invalid_coords_count += 1
                errors_count += 1
                is_record_valid = False
                if len(issues) < 20:
                    issues.append(f"Row {idx+1} ({st_id}): Malformed coordinates '{lat}', '{lon}'.")

            # 4. Depth Bounds
            try:
                depth_f = float(depth)
                if depth_f < 0.0:
                    negative_depths_count += 1
                    errors_count += 1
                    is_record_valid = False
                    if len(issues) < 20:
                        issues.append(f"Row {idx+1} ({st_id}): Negative groundwater depth ({depth_f} mbgl).")
                elif depth_f > MAX_PHYSICAL_DEPTH_MBGL:
                    warnings_count += 1
                    if len(issues) < 20:
                        issues.append(f"Row {idx+1} ({st_id}): Extreme depth {depth_f} mbgl exceeds typical alluvial thresholds.")
            except (ValueError, TypeError):
                negative_depths_count += 1
                errors_count += 1
                is_record_valid = False
                if len(issues) < 20:
                    issues.append(f"Row {idx+1} ({st_id}): Non-numeric depth value '{depth}'.")

            # 5. Status & Trend Validity
            if status and str(status).lower() not in valid_statuses:
                warnings_count += 1
            if trend and str(trend).lower() not in valid_trends:
                warnings_count += 1

            if is_record_valid:
                valid_records += 1

        invalid_records = total - valid_records

        # Quality Score Calculation (0.0 to 100.0%)
        if total == 0:
            quality_score = 0.0
        else:
            penalty = (errors_count * 1.5 + warnings_count * 0.2) / total * 100.0
            quality_score = round(max(0.0, min(100.0, 100.0 - penalty)), 1)

        is_overall_valid = (errors_count == 0 and total > 0)

        return DataQualityReport(
            valid=is_overall_valid,
            records_checked=total,
            valid_records=valid_records,
            invalid_records=invalid_records,
            warnings_count=warnings_count,
            errors_count=errors_count,
            quality_score=quality_score,
            duplicate_station_ids=duplicate_ids_count,
            invalid_coordinates=invalid_coords_count,
            negative_depths=negative_depths_count,
            missing_required_fields=missing_fields_count,
            issues_list=issues,
            data_mode=settings.DATA_MODE,
            timestamp=datetime.utcnow().isoformat() + "Z",
        )


data_quality_engine = DataQualityEngine()
