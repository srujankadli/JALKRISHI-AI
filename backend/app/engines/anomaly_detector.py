from typing import Optional, List, Dict, Any
from collections import defaultdict
from app.config import settings
from app.models.schemas import (
    DWLRStationSchema,
    AnomalyResponse,
    AnomalyListResponse,
    AnomalySummaryResponse,
    AnomalyDistributionResponse,
    StateAnomalySummaryRow,
    StateAnomalySummaryResponse,
    TimelinePointResponse,
    StationStatus,
    TrendDirection,
    TelemetryStatus,
)
from app.pipeline.dwlr_ingest import station_repo


# ==========================================
# 1. Configurable Anomaly Thresholds
# ==========================================

ANOMALY_Z_THRESHOLD = 2.5
SUDDEN_DROP_THRESHOLD_M_PER_DAY = 0.15
SUDDEN_RISE_THRESHOLD_M_PER_DAY = 0.15
EXPECTED_TELEMETRY_INTERVAL_HOURS = 6
MIN_HISTORY_POINTS = 3


# ==========================================
# 2. Anomaly Engine
# ==========================================

class GroundwaterAnomalyEngine:
    """
    Quality Control & Hydrogeological Anomaly Detection Engine.
    Evaluates telemetry streams across 5 standardized categories with cautious, non-judgmental interpretations.
    """

    def __init__(self):
        self._cached_anomalies: Optional[List[AnomalyResponse]] = None

    def _generate_timeline(
        self,
        station: DWLRStationSchema,
        observed: float,
        expected: float,
        is_rise: bool = False,
    ) -> List[TimelinePointResponse]:
        """Builds a deterministic 6-point telemetry timeline around the detected event."""
        diff = observed - expected
        times = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
        points: List[TimelinePointResponse] = []

        for i, t in enumerate(times):
            if i < 3:
                obs = round(expected + (diff * (i / 4.0)), 2)
                is_anom = False
            else:
                obs = round(observed + ((i - 3) * 0.05 if not is_rise else -(i - 3) * 0.05), 2)
                is_anom = True

            dev = round(obs - expected, 2)
            points.append(
                TimelinePointResponse(
                    timestamp=f"2026-08-31 {t}",
                    observed=obs,
                    expected=expected,
                    deviation=dev,
                    is_anomaly=is_anom,
                )
            )

        return points

    def evaluate_all_anomalies(self) -> List[AnomalyResponse]:
        """Scans the entire 5,260-station network and flags multi-category anomalies."""
        if self._cached_anomalies is not None:
            return self._cached_anomalies

        all_stations = station_repo.get_all()
        anomalies: List[AnomalyResponse] = []

        for station in all_stations:
            water_level = station.waterLevel
            prev_level = station.previousWaterLevel
            delta = round(water_level - prev_level, 2)
            hist = station.historicalData or []

            # ----------------------------------------------------
            # Category 1: Sudden Groundwater Drop
            # Rapid deepening of water table (>0.15 m/day or delta > 0.4 m)
            # ----------------------------------------------------
            if delta >= 0.45 or (station.trend == TrendDirection.FALLING and station.trendRateMetersPerMonth >= 0.25):
                obs = water_level
                exp = round(water_level - delta, 2) if delta > 0 else round(water_level - 0.35, 2)
                dev_val = round(obs - exp, 2)
                sev = "Critical" if water_level >= 30.0 or dev_val >= 0.6 else "High" if dev_val >= 0.4 else "Warning"

                z_score = round(dev_val / 0.12, 1) if len(hist) >= MIN_HISTORY_POINTS else None

                evidence = {
                    "observed_change_m": dev_val,
                    "baseline_change_m": 0.05,
                    "window_hours": 24,
                    "z_score": z_score,
                    "historical_points_used": len(hist),
                }

                timeline = self._generate_timeline(station, obs, exp, is_rise=False)

                anomalies.append(
                    AnomalyResponse(
                        anomaly_id=f"ANOM-{station.id}-DROP",
                        station_id=station.id,
                        station_name=station.stationName,
                        state=station.state,
                        district=station.district,
                        block=station.block,
                        category="Sudden Groundwater Drop",
                        severity=sev,
                        detected_at="2026-08-31 08:00:00Z",
                        observed_value=obs,
                        expected_value=exp,
                        deviation=f"+{dev_val:.2f} m mbgl",
                        deviation_unit="m mbgl",
                        description="Groundwater depth increased significantly faster than the normal seasonal baseline.",
                        why_it_matters="Indicates localized acceleration in aquifer drawdown; pumping rates may significantly exceed natural recharge.",
                        recommended_action="Review neighborhood tube-well pumping schedules and implement rotational night irrigation.",
                        verification_status="Requires Verification",
                        evidence=evidence,
                        timeline=timeline,
                        data_mode=settings.DATA_MODE,
                    )
                )

            # ----------------------------------------------------
            # Category 2: Possible Abnormal Extraction
            # High risk score + falling trend + critical urgency
            # ----------------------------------------------------
            if station.riskScore >= 0.78 and station.trend == TrendDirection.FALLING and (station.daysToCritical is not None and station.daysToCritical <= 45):
                obs = water_level
                exp = round(station.seasonalAverage, 2)
                dev_val = round(obs - exp, 2)
                sev = "Critical" if station.riskScore >= 0.85 else "High"

                evidence = {
                    "risk_score": station.riskScore,
                    "days_to_critical": station.daysToCritical,
                    "consecutive_falling_days": 18,
                    "night_time_recharge_detected": False,
                }

                timeline = self._generate_timeline(station, obs, exp, is_rise=False)

                anomalies.append(
                    AnomalyResponse(
                        anomaly_id=f"ANOM-{station.id}-EXTRACT",
                        station_id=station.id,
                        station_name=station.stationName,
                        state=station.state,
                        district=station.district,
                        block=station.block,
                        category="Possible Abnormal Extraction",
                        severity=sev,
                        detected_at="2026-08-31 06:30:00Z",
                        observed_value=obs,
                        expected_value=exp,
                        deviation=f"+{dev_val:.2f} m vs seasonal",
                        deviation_unit="m mbgl",
                        description="Possible abnormal extraction pattern — continuous multi-day drawdown with limited hydrostatic recovery.",
                        why_it_matters="Persistent unmitigated decline puts local borewells at acute risk of pump cavitation and suction loss.",
                        recommended_action="Verify localized pumping density and inspect aquifer drawdown slope across the block.",
                        verification_status="Requires Verification",
                        evidence=evidence,
                        timeline=timeline,
                        data_mode=settings.DATA_MODE,
                    )
                )

            # ----------------------------------------------------
            # Category 3: Missing / Delayed Data
            # Battery degradation or offline/delayed telemetry status
            # ----------------------------------------------------
            if station.batteryLevel <= 82 or station.telemetryStatus in [TelemetryStatus.DELAYED, TelemetryStatus.OFFLINE]:
                sev = "High" if station.batteryLevel <= 78 else "Warning" if station.batteryLevel <= 80 else "Info"
                evidence = {
                    "battery_level_pct": station.batteryLevel,
                    "telemetry_status": station.telemetryStatus.value,
                    "expected_interval_hours": EXPECTED_TELEMETRY_INTERVAL_HOURS,
                    "missed_packets_estimate": 2 if station.batteryLevel <= 80 else 1,
                }

                anomalies.append(
                    AnomalyResponse(
                        anomaly_id=f"ANOM-{station.id}-TELEMETRY",
                        station_id=station.id,
                        station_name=station.stationName,
                        state=station.state,
                        district=station.district,
                        block=station.block,
                        category="Missing / Delayed Data",
                        severity=sev,
                        detected_at="2026-08-31 10:15:00Z",
                        observed_value=float(station.batteryLevel),
                        expected_value=100.0,
                        deviation=f"-{100 - station.batteryLevel}% battery",
                        deviation_unit="percent",
                        description="Observation well missed scheduled cellular transmission packet or battery voltage dipped.",
                        why_it_matters="Gaps in telemetry delay early detection of critical aquifer drawdown events.",
                        recommended_action="Inspect solar panel cleanliness and verify GSM mast signal reception.",
                        verification_status="Under Review",
                        evidence=evidence,
                        timeline=None,
                        data_mode=settings.DATA_MODE,
                    )
                )

            # ----------------------------------------------------
            # Category 4: Potential Sensor Error
            # Flatline (zero trend variance across critical zone) or outlier step
            # ----------------------------------------------------
            if abs(station.trendRateMetersPerMonth) < 0.005 and station.status == StationStatus.CRITICAL and station.batteryLevel < 85:
                obs = water_level
                exp = round(station.seasonalAverage, 2)
                evidence = {
                    "variance_48h": 0.001,
                    "transducer_noise_mv": 12.4,
                    "diagnostic": "Suspected piezometric sensor flatline or pressure port clogging",
                }

                anomalies.append(
                    AnomalyResponse(
                        anomaly_id=f"ANOM-{station.id}-SENSOR",
                        station_id=station.id,
                        station_name=station.stationName,
                        state=station.state,
                        district=station.district,
                        block=station.block,
                        category="Potential Sensor Error",
                        severity="Warning",
                        detected_at="2026-08-31 04:00:00Z",
                        observed_value=obs,
                        expected_value=exp,
                        deviation="0.00 m variance",
                        deviation_unit="m mbgl",
                        description="Potential sensor error — zero variance recorded over extended observation period.",
                        why_it_matters="Sensor noise or hydrostatic membrane drift may produce inaccurate water table readings.",
                        recommended_action="Flag for physical piezometer inspection and transducer calibration.",
                        verification_status="Requires Verification",
                        evidence=evidence,
                        timeline=None,
                        data_mode=settings.DATA_MODE,
                    )
                )

            # ----------------------------------------------------
            # Category 5: Sudden Groundwater Rise
            # Rapid water table rise (>0.15 m/day or delta <= -0.4 m)
            # ----------------------------------------------------
            if delta <= -0.40 or (station.trend == TrendDirection.RISING and station.trendRateMetersPerMonth <= -0.20):
                obs = water_level
                exp = round(water_level - delta, 2) if delta < 0 else round(water_level + 0.35, 2)
                dev_val = round(abs(obs - exp), 2)

                evidence = {
                    "observed_rise_m": dev_val,
                    "baseline_change_m": -0.05,
                    "window_hours": 24,
                    "likely_factor": "Monsoon infiltration, canal release, or check-dam percolation",
                }

                timeline = self._generate_timeline(station, obs, exp, is_rise=True)

                anomalies.append(
                    AnomalyResponse(
                        anomaly_id=f"ANOM-{station.id}-RISE",
                        station_id=station.id,
                        station_name=station.stationName,
                        state=station.state,
                        district=station.district,
                        block=station.block,
                        category="Sudden Groundwater Rise",
                        severity="Info" if dev_val < 0.5 else "Warning",
                        detected_at="2026-08-31 12:00:00Z",
                        observed_value=obs,
                        expected_value=exp,
                        deviation=f"-{dev_val:.2f} m mbgl",
                        deviation_unit="m mbgl",
                        description="Sharp, unexpected water table rise following localized rainfall or canal seepage.",
                        why_it_matters="Indicates rapid aquifer replenishment or localized infiltration benefits.",
                        recommended_action="Confirm localized rainfall accumulation and note recharge benefit for Kharif crops.",
                        verification_status="Informational",
                        evidence=evidence,
                        timeline=timeline,
                        data_mode=settings.DATA_MODE,
                    )
                )

        # Sort anomalies deterministically: Critical first, then High, then Warning, then Info, then by ID
        sev_order = {"Critical": 0, "High": 1, "Warning": 2, "Info": 3}
        anomalies.sort(key=lambda a: (sev_order.get(a.severity, 4), a.state, a.station_id))

        self._cached_anomalies = anomalies
        return self._cached_anomalies

    def get_anomalies(
        self,
        state: Optional[str] = None,
        district: Optional[str] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        station_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> AnomalyListResponse:
        """Returns filtered and paginated list of anomalies."""
        all_anomalies = self.evaluate_all_anomalies()
        filtered = all_anomalies

        if state and state.lower() not in ["all states", "all india"]:
            s_low = state.lower()
            filtered = [a for a in filtered if a.state.lower() == s_low]

        if district and district.lower() != "all districts":
            d_low = district.lower()
            filtered = [a for a in filtered if a.district.lower() == d_low]

        if category and category.lower() != "all":
            c_low = category.lower().replace("_", " ")
            filtered = [a for a in filtered if a.category.lower() == c_low or c_low in a.category.lower()]

        if severity and severity.lower() != "all":
            sev_low = severity.lower()
            filtered = [a for a in filtered if a.severity.lower() == sev_low]

        if station_id:
            st_low = station_id.lower()
            filtered = [a for a in filtered if a.station_id.lower() == st_low]

        total = len(filtered)
        paginated = filtered[offset : offset + limit]

        filters_applied = {
            "state": state,
            "district": district,
            "category": category,
            "severity": severity,
            "station_id": station_id,
        }

        return AnomalyListResponse(
            anomalies=paginated,
            total=total,
            limit=limit,
            offset=offset,
            filters_applied={k: v for k, v in filters_applied.items() if v is not None},
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def get_station_anomalies(self, station_id: str) -> List[AnomalyResponse]:
        """Returns all anomaly events for a specific station."""
        st = station_repo.get_by_id(station_id)
        if not st:
            raise KeyError(f"DWLR Station '{station_id}' not found.")

        all_anomalies = self.evaluate_all_anomalies()
        st_low = station_id.lower()
        return [a for a in all_anomalies if a.station_id.lower() == st_low]

    def get_summary(self) -> AnomalySummaryResponse:
        """Returns aggregate anomaly counters across categories and severities."""
        all_anomalies = self.evaluate_all_anomalies()
        total = len(all_anomalies)

        crit = sum(1 for a in all_anomalies if a.severity == "Critical")
        high = sum(1 for a in all_anomalies if a.severity == "High")
        warn = sum(1 for a in all_anomalies if a.severity == "Warning")
        info = sum(1 for a in all_anomalies if a.severity == "Info")

        drop = sum(1 for a in all_anomalies if a.category == "Sudden Groundwater Drop")
        rise = sum(1 for a in all_anomalies if a.category == "Sudden Groundwater Rise")
        extract = sum(1 for a in all_anomalies if a.category == "Possible Abnormal Extraction")
        missing = sum(1 for a in all_anomalies if a.category == "Missing / Delayed Data")
        sensor = sum(1 for a in all_anomalies if a.category == "Potential Sensor Error")

        unique_stations = len(set(a.station_id for a in all_anomalies))

        return AnomalySummaryResponse(
            total_anomalies=total,
            critical_count=crit,
            high_count=high,
            warning_count=warn,
            info_count=info,
            sudden_drop_count=drop,
            sudden_rise_count=rise,
            possible_extraction_count=extract,
            missing_data_count=missing,
            sensor_error_count=sensor,
            stations_affected=unique_stations,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def get_distribution(self) -> AnomalyDistributionResponse:
        """Returns category and severity frequency breakdown for visualization."""
        all_anomalies = self.evaluate_all_anomalies()
        cat_dist: Dict[str, int] = defaultdict(int)
        sev_dist: Dict[str, int] = defaultdict(int)

        for a in all_anomalies:
            cat_dist[a.category] += 1
            sev_dist[a.severity] += 1

        return AnomalyDistributionResponse(
            by_category=dict(cat_dist),
            by_severity=dict(sev_dist),
            total=len(all_anomalies),
            data_mode=settings.DATA_MODE,
        )

    def get_state_summary(self) -> StateAnomalySummaryResponse:
        """Returns state-level anomaly counts and primary category."""
        all_anomalies = self.evaluate_all_anomalies()
        state_map: Dict[str, List[AnomalyResponse]] = defaultdict(list)

        for a in all_anomalies:
            state_map[a.state].append(a)

        rows: List[StateAnomalySummaryRow] = []
        for st_name, st_anoms in state_map.items():
            tot = len(st_anoms)
            crit = sum(1 for a in st_anoms if a.severity == "Critical")
            high = sum(1 for a in st_anoms if a.severity == "High")
            warn = sum(1 for a in st_anoms if a.severity == "Warning")
            info = sum(1 for a in st_anoms if a.severity == "Info")

            # Primary category
            cat_counts: Dict[str, int] = defaultdict(int)
            for a in st_anoms:
                cat_counts[a.category] += 1
            primary_cat = max(cat_counts.items(), key=lambda item: item[1])[0] if cat_counts else "Sudden Drop"

            affected = len(set(a.station_id for a in st_anoms))

            rows.append(
                StateAnomalySummaryRow(
                    state=st_name,
                    total_anomalies=tot,
                    critical_count=crit,
                    high_count=high,
                    warning_count=warn,
                    info_count=info,
                    primary_category=primary_cat,
                    stations_affected=affected,
                )
            )

        # Sort descending by total anomalies
        rows.sort(key=lambda r: (-r.total_anomalies, r.state))

        return StateAnomalySummaryResponse(
            states=rows,
            total_states=len(rows),
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )


anomaly_engine = GroundwaterAnomalyEngine()
