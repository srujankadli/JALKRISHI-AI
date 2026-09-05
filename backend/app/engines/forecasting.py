import math
from typing import Optional, List, Dict, Any, Tuple
from collections import defaultdict
from app.config import settings
from app.models.schemas import (
    DWLRStationSchema,
    ForecastPointResponse,
    StationForecastResponse,
    LocationForecastResponse,
    ForecastSummaryResponse,
    ForecastRiskRow,
    ForecastRiskRankingResponse,
    RegionalForecastRow,
    RegionalForecastResponse,
    StationStatus,
    TrendDirection,
)
from app.pipeline.dwlr_ingest import station_repo
from app.pipeline.location_resolver import resolve_location
from app.engines.satellite_groundwater import satellite_groundwater_engine

# Supported forecast horizons
SUPPORTED_HORIZONS = [7, 30, 60, 90]


class GroundwaterForecastingEngine:
    """
    Deterministic Hydrogeological Forecasting Engine.
    Processes historical telemetry and trend velocity to project multi-horizon groundwater trajectories.
    Convention: mbgl (metres below ground level). Larger mbgl = deeper groundwater table = worsening drawdown.
    """

    @staticmethod
    def calculate_trend_velocity(station: DWLRStationSchema) -> Tuple[float, float, int]:
        """
        Calculates daily and monthly depth movement rate in mbgl.
        Positive rate (+m/day) = water level dropping deeper (drawdown/depletion).
        Negative rate (-m/day) = water level rising shallower (recharge).
        """
        hist = station.historicalData or []
        hist_count = len(hist)

        # If station has rich 6-month historical telemetry
        if hist_count >= 3:
            depths = [h.waterLevel for h in hist]
            # Linear trend across sequential points
            n = len(depths)
            x_vals = list(range(n))
            mean_x = sum(x_vals) / n
            mean_y = sum(depths) / n
            denom = sum((x - mean_x) ** 2 for x in x_vals)
            if denom > 0:
                slope_per_point = sum((x_vals[i] - mean_x) * (depths[i] - mean_y) for i in range(n)) / denom
                # Points are spaced ~30 days apart
                daily_change = round(slope_per_point / 30.0, 4)
                monthly_change = round(slope_per_point, 3)
                return daily_change, monthly_change, hist_count

        # Otherwise derive from station's trendRateMetersPerMonth
        rate_month = station.trendRateMetersPerMonth
        if station.trend == TrendDirection.FALLING:
            # Positive mbgl increase
            daily_change = round(abs(rate_month) / 30.0, 4)
            monthly_change = round(abs(rate_month), 3)
        elif station.trend == TrendDirection.RISING:
            # Negative mbgl decrease (shallower)
            daily_change = -round(abs(rate_month) / 30.0, 4)
            monthly_change = -round(abs(rate_month), 3)
        else:
            daily_change = round(rate_month / 30.0, 4)
            monthly_change = round(rate_month, 3)

        return daily_change, monthly_change, max(1, hist_count)

    @staticmethod
    def calculate_days_to_critical(
        current_depth: float,
        critical_threshold: float,
        daily_change_m: float,
    ) -> Tuple[Optional[int], str, str]:
        """
        Calculates remaining days until water table crosses the pump head critical threshold.
        Returns: (days_to_critical, status_code, urgency_label)
        """
        if current_depth >= critical_threshold:
            return 0, "already_critical", "0–7 Days: Critical Alert"

        if daily_change_m > 0.0001:
            remaining_m = critical_threshold - current_depth
            est_days = int(round(remaining_m / daily_change_m))
            days = max(0, est_days)

            if days <= 7:
                urgency = "0–7 Days: Critical Alert"
            elif days <= 30:
                urgency = "8–30 Days: High Attention"
            elif days <= 60:
                urgency = "31–60 Days: Watch Zone"
            else:
                urgency = "60+ Days: Lower Immediate Risk"

            return days, "projected", urgency

        # Improving or stable water table
        return None, "improving_or_stable", "60+ Days / Safe: Lower Immediate Risk"

    @staticmethod
    def classify_forecast_risk(
        current_depth: float,
        critical_threshold: float,
        daily_change_m: float,
        days_to_critical: Optional[int],
    ) -> str:
        """Categorizes future aquifer trajectory risk."""
        if current_depth >= critical_threshold or (days_to_critical is not None and days_to_critical <= 30):
            return "critical"
        elif daily_change_m > 0.005:
            return "worsening"
        elif daily_change_m < -0.005:
            return "improving"
        return "stable"

    @staticmethod
    def generate_farmer_guidance(
        station: DWLRStationSchema,
        forecast_risk: str,
        projected_depth: float,
        days_to_critical: Optional[int],
    ) -> str:
        """Generates clear, actionable agronomic advice."""
        if forecast_risk == "critical":
            if days_to_critical is not None and days_to_critical <= 7:
                return f"Emergency Water Alert: Aquifer table is critically near pump suction depth ({station.waterLevel:.1f}m mbgl). Restrict continuous pumping immediately and alternate shifts with neighbors."
            return f"High Water Stress: Water table is projected to decline to {projected_depth:.1f}m depth. Switch upcoming sowing to low-water pulses (Moong/Chana) or millets; avoid puddled paddy."
        elif forecast_risk == "worsening":
            return f"Drawdown Warning: Steady depletion detected. Water table is projected to deepen to {projected_depth:.1f}m mbgl. Schedule night irrigation and consider micro-sprinklers."
        elif forecast_risk == "improving":
            return f"Favorable Recharging Conditions: Active seasonal recharge detected. Water table projected to improve to {projected_depth:.1f}m depth. Suitable for balanced crop rotations."
        return f"Stable Aquifer Conditions: Manageable seasonal drawdown. Water table expected to remain stable near {projected_depth:.1f}m mbgl."

    @staticmethod
    def forecast_station(
        station_id: str,
        horizon_days: int = 30,
    ) -> StationForecastResponse:
        # Snap horizon_days to nearest supported horizon
        if horizon_days not in SUPPORTED_HORIZONS:
            horizon_days = min(SUPPORTED_HORIZONS, key=lambda h: abs(h - horizon_days))

        station = station_repo.get_by_id(station_id)
        if not station:
            raise KeyError(f"DWLR Station '{station_id}' not found")

        daily_change, monthly_change, hist_used = GroundwaterForecastingEngine.calculate_trend_velocity(station)
        days_crit, crit_status, crit_urgency = GroundwaterForecastingEngine.calculate_days_to_critical(
            station.waterLevel,
            station.criticalThreshold,
            daily_change,
        )
        risk_class = GroundwaterForecastingEngine.classify_forecast_risk(
            station.waterLevel,
            station.criticalThreshold,
            daily_change,
            days_crit,
        )

        # Build trajectory offsets based on horizon
        if horizon_days == 7:
            offsets = [0, 1, 3, 5, 7]
        elif horizon_days == 30:
            offsets = [0, 7, 15, 21, 30]
        elif horizon_days == 60:
            offsets = [0, 7, 15, 30, 45, 60]
        else:  # 90 days
            offsets = [0, 7, 15, 30, 60, 90]

        # Derive station-specific historical monthly precipitation pattern
        hist_rains = [h.rainfall for h in (station.historicalData or [])]
        avg_monthly_rain = (sum(hist_rains) / len(hist_rains)) if hist_rains else 35.0
        daily_rain_rate = max(0.2, avg_monthly_rain / 30.0)

        points: List[ForecastPointResponse] = []
        for t in offsets:
            date_label = "Today" if t == 0 else f"+{t} Days"
            proj = round(station.waterLevel + daily_change * t, 2)
            # Uncertainty envelope grows monotonically with square-root and linear time horizon
            uncertainty = round(0.04 + 0.015 * math.sqrt(t) + 0.008 * t, 2) if t > 0 else 0.0
            lower = round(max(0.1, proj - uncertainty), 2)
            upper = round(proj + uncertainty, 2)

            chg_val = round(daily_change * t, 2)
            chg_label = "Baseline" if t == 0 else f"{'+' if chg_val > 0 else ''}{chg_val:.2f}m mbgl"
            rain_est = round(daily_rain_rate * t, 1) if t > 0 else 0.0

            points.append(
                ForecastPointResponse(
                    date=date_label,
                    predicted_depth=proj,
                    baseline_depth=station.waterLevel,
                    lower_bound=lower,
                    upper_bound=upper,
                    day_offset=t,
                    expected_rainfall_mm=rain_est,
                    change_label=chg_label,
                )
            )

        end_proj = points[-1].predicted_depth
        p30 = next((p.predicted_depth for p in points if p.day_offset == 30), end_proj)
        p60 = next((p.predicted_depth for p in points if p.day_offset == 60), None)
        p90 = next((p.predicted_depth for p in points if p.day_offset == 90), None)
        guidance = GroundwaterForecastingEngine.generate_farmer_guidance(station, risk_class, end_proj, days_crit)

        methodology_desc = (
            "Deterministic linear hydrostatic trajectory modeled from observed DWLR baseline "
            "and seasonal rate of change with widening uncertainty bounds."
        )

        return StationForecastResponse(
            station_id=station.id,
            station_name=station.stationName,
            station_code=station.stationCode,
            state=station.state,
            district=station.district,
            block=station.block,
            latitude=station.latitude,
            longitude=station.longitude,
            soil_type=station.soilType,
            aquifer_type=station.aquiferType,
            current_depth=station.waterLevel,
            critical_threshold=station.criticalThreshold,
            current_status=station.status.value,
            current_trend=station.trend.value,
            risk_score=station.riskScore,
            horizon_days=horizon_days,
            historical_points_used=hist_used,
            daily_change_m=daily_change,
            monthly_change_m=monthly_change,
            forecast_points=points,
            confidence=round(max(0.70, 0.95 - 0.002 * horizon_days), 2),
            days_to_critical=days_crit,
            days_to_critical_status=crit_status,
            days_to_critical_urgency=crit_urgency,
            forecast_risk=risk_class,
            farmer_guidance=guidance,
            projected_depth_30d=p30,
            projected_depth_60d=p60,
            projected_depth_90d=p90,
            projected_depth_end=end_proj,
            historical_monthly_rainfall_mm=round(avg_monthly_rain, 1),
            methodology=methodology_desc,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def get_network_forecast_summary() -> ForecastSummaryResponse:
        """Calculates national forecast indicators across all 5,260 stations."""
        all_stations = station_repo.get_all()
        total = len(all_stations)

        worsening = 0
        improving = 0
        stable = 0
        crit_30 = 0
        crit_60 = 0
        crit_90 = 0
        days_list: List[int] = []

        brackets = {"0–7 Days": 0, "8–30 Days": 0, "31–60 Days": 0, "60+ Days / Safe": 0}

        for s in all_stations:
            daily_chg, _, _ = GroundwaterForecastingEngine.calculate_trend_velocity(s)
            days_crit, _, _ = GroundwaterForecastingEngine.calculate_days_to_critical(
                s.waterLevel, s.criticalThreshold, daily_chg
            )

            if daily_chg > 0.005:
                worsening += 1
            elif daily_chg < -0.005:
                improving += 1
            else:
                stable += 1

            if days_crit is not None:
                days_list.append(days_crit)
                if days_crit <= 30:
                    crit_30 += 1
                if days_crit <= 60:
                    crit_60 += 1
                if days_crit <= 90:
                    crit_90 += 1

                if days_crit <= 7:
                    brackets["0–7 Days"] += 1
                elif days_crit <= 30:
                    brackets["8–30 Days"] += 1
                elif days_crit <= 60:
                    brackets["31–60 Days"] += 1
                else:
                    brackets["60+ Days / Safe"] += 1
            else:
                brackets["60+ Days / Safe"] += 1

        avg_days = round(sum(days_list) / len(days_list), 1) if days_list else None

        return ForecastSummaryResponse(
            total_stations=total,
            stations_with_forecast=total,
            stations_missing_history=0,
            stations_projected_worsening=worsening,
            stations_projected_improving=improving,
            stations_projected_stable=stable,
            stations_reaching_critical_30d=crit_30,
            stations_reaching_critical_60d=crit_60,
            stations_reaching_critical_90d=crit_90,
            average_days_to_critical=avg_days,
            days_to_critical_breakdown=brackets,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def get_top_risk_forecasts(
        limit: int = 10,
        days: int = 30,
    ) -> ForecastRiskRankingResponse:
        """Ranks observation wells by forecast urgency and shortest days-to-critical."""
        if days not in SUPPORTED_HORIZONS:
            raise ValueError(f"Days must be one of {SUPPORTED_HORIZONS}")

        all_stations = station_repo.get_all()
        ranked_items: List[Tuple[float, int, DWLRStationSchema, float, Optional[int], str]] = []

        for s in all_stations:
            daily_chg, _, _ = GroundwaterForecastingEngine.calculate_trend_velocity(s)
            days_crit, _, _ = GroundwaterForecastingEngine.calculate_days_to_critical(
                s.waterLevel, s.criticalThreshold, daily_chg
            )
            f_risk = GroundwaterForecastingEngine.classify_forecast_risk(
                s.waterLevel, s.criticalThreshold, daily_chg, days_crit
            )

            # Sort key: days_to_critical ascending (none treated as 9999), risk score descending
            effective_days = days_crit if days_crit is not None else 9999
            priority = "High" if (days_crit is not None and days_crit <= 30) or s.riskScore >= 0.75 else "Medium" if (days_crit is not None and days_crit <= 60) else "Low"

            ranked_items.append((effective_days, -s.riskScore, s, daily_chg, days_crit, priority, f_risk))

        ranked_items.sort(key=lambda item: (item[0], item[1]))

        rows: List[ForecastRiskRow] = []
        for idx, item in enumerate(ranked_items[:limit], start=1):
            st = item[2]
            daily_chg = item[3]
            days_crit = item[4]
            priority = item[5]
            f_risk = item[6]

            rows.append(
                ForecastRiskRow(
                    rank=idx,
                    station_id=st.id,
                    station_name=st.stationName,
                    state=st.state,
                    district=st.district,
                    current_depth=st.waterLevel,
                    daily_change_m=daily_chg,
                    days_to_critical=days_crit,
                    risk_score=st.riskScore,
                    forecast_risk=f_risk,
                    priority=priority,
                )
            )

        return ForecastRiskRankingResponse(
            rankings=rows,
            total_ranked=len(rows),
            horizon_days=days,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def get_regional_forecast(
        state: Optional[str] = None,
        days: int = 90,
    ) -> RegionalForecastResponse:
        """Calculates state-level forward groundwater outlooks."""
        if days not in SUPPORTED_HORIZONS:
            raise ValueError(f"Days must be one of {SUPPORTED_HORIZONS}")

        stations = station_repo.filter_stations(state=state)
        state_groups: Dict[str, List[DWLRStationSchema]] = defaultdict(list)
        for s in stations:
            state_groups[s.state].append(s)

        rows: List[RegionalForecastRow] = []
        for st_name, st_stations in state_groups.items():
            st_count = len(st_stations)
            avg_depth = round(sum(s.waterLevel for s in st_stations) / st_count, 2)

            daily_rates = [
                GroundwaterForecastingEngine.calculate_trend_velocity(s)[0]
                for s in st_stations
            ]
            avg_daily_chg = round(sum(daily_rates) / st_count, 4)
            proj_chg = round(avg_daily_chg * days, 2)

            crit_count = 0
            for s in st_stations:
                d_chg, _, _ = GroundwaterForecastingEngine.calculate_trend_velocity(s)
                d_crit, _, _ = GroundwaterForecastingEngine.calculate_days_to_critical(
                    s.waterLevel, s.criticalThreshold, d_chg
                )
                if d_crit is not None and d_crit <= days:
                    crit_count += 1

            direction = "Falling (Drawdown)" if proj_chg > 0.05 else "Rising (Recharge)" if proj_chg < -0.05 else "Stable"
            avg_risk = sum(s.riskScore for s in st_stations) / st_count
            risk_cat = "Critical" if avg_risk >= 0.70 else "High" if avg_risk >= 0.50 else "Moderate" if avg_risk >= 0.30 else "Lower"

            rain_est = round(min(260.0, 45.0 + st_count * 0.2), 0)

            priority_action = (
                "Adopt strict deficit irrigation and promote drought-hardy pulses/millets."
                if risk_cat in ["Critical", "High"]
                else "Maintain balanced seasonal pumping and check-dam recharge structures."
            )

            rows.append(
                RegionalForecastRow(
                    state=st_name,
                    station_count=st_count,
                    average_current_depth=avg_depth,
                    average_daily_change=avg_daily_chg,
                    projected_change=proj_chg,
                    forecast_direction=direction,
                    critical_within_horizon=crit_count,
                    risk_category=risk_cat,
                    expected_rainfall_mm=rain_est,
                    priority_action=priority_action,
                )
            )

        # Sort by state name
        rows.sort(key=lambda r: r.state)

        return RegionalForecastResponse(
            regions=rows,
            total_regions=len(rows),
            horizon_days=days,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    @staticmethod
    def forecast_location(
        location_query: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        horizon_days: int = 30,
        crop: Optional[str] = None,
        water_source: Optional[str] = None,
        groundwater_dependence: Optional[str] = None,
        water_reliability: Optional[str] = None,
    ) -> LocationForecastResponse:
        """
        Calculates location-aware multi-horizon groundwater forecast for a farmer.
        Integrates dynamic location resolution, spatial DWLR evidence thresholds
        (<=15km Direct, 15-35km Regional Evidence, >35km Satellite-Assisted), and
        personalized Farm Profile interpretation.
        """
        # Snap horizon_days to nearest supported horizon
        if horizon_days not in SUPPORTED_HORIZONS:
            horizon_days = min(SUPPORTED_HORIZONS, key=lambda h: abs(h - horizon_days))

        # 1. Resolve Location
        resolved = resolve_location(
            location_query=location_query,
            latitude=latitude,
            longitude=longitude,
        )

        if not resolved.is_resolved or resolved.latitude is None or resolved.longitude is None:
            raw_q = (location_query or "").strip()
            is_unresolved = bool(raw_q)
            return LocationForecastResponse(
                location_name=raw_q if is_unresolved else "Location Required",
                district=None,
                state=None,
                latitude=0.0,
                longitude=0.0,
                evidence_mode="UNRESOLVED" if is_unresolved else "LOCATION_REQUIRED",
                nearest_station_id=None,
                nearest_station_name=None,
                nearest_station_distance_km=None,
                current_depth=None,
                critical_threshold=25.0,
                projected_depth_30d=None,
                projected_depth_end=None,
                days_to_critical=None,
                days_to_critical_status="unknown",
                days_to_critical_urgency="Location required to evaluate aquifer horizon.",
                forecast_risk="unknown",
                horizon_days=horizon_days,
                daily_change_m=0.0,
                forecast_points=[],
                confidence=0.0,
                farmer_guidance=(
                    f"Location '{raw_q}' could not be resolved. Please specify a district or state (e.g. Nashik, Kochi, Jaipur, Ballari)."
                    if is_unresolved
                    else "Enter or select your farm location to generate forward groundwater projections."
                ),
                personalized_profile_notes=[],
                provenance_label="Location Required",
                methodology="Requires spatial coordinate resolution.",
                data_mode=settings.DATA_MODE,
                disclaimer=settings.DEMO_DISCLAIMER,
            )

        target_lat = latitude if latitude is not None else resolved.latitude
        target_lon = longitude if longitude is not None else resolved.longitude
        loc_name = resolved.name
        dist_name = resolved.district
        st_name = resolved.state

        # 2. Find nearest DWLR station
        nearest_dict, dist = satellite_groundwater_engine.find_nearest_dwlr_station(target_lat, target_lon)

        # 3. Classify spatial evidence mode based on scientifically justified radius
        if resolved.matched_station_id and target_lat == resolved.latitude:
            st_schema = station_repo.get_by_id(resolved.matched_station_id)
            if st_schema:
                nearest_dict = st_schema.model_dump()
                dist = 0.0

        if dist <= 15.0 and nearest_dict:
            evidence_mode = "DIRECT_DWLR"
            prov_label = f"Forecast based on nearby DWLR observation ({dist:.1f} km away)"
        elif dist <= 35.0 and nearest_dict:
            evidence_mode = "REGIONAL_NEARBY_EVIDENCE"
            prov_label = f"Regional groundwater forecast based on nearby evidence ({dist:.1f} km away)"
        else:
            evidence_mode = "SATELLITE_ASSISTED"
            prov_label = f"Satellite-assisted regional groundwater outlook (> 35 km radius)"

        # 4. Extract baseline depth, critical threshold, and daily trend rate
        st_id = None
        st_display_name = None
        st_obj = None

        if nearest_dict and dist <= 35.0:
            st_id = nearest_dict.get("id") or nearest_dict.get("stationCode")
            st_display_name = nearest_dict.get("stationName")
            if st_id:
                st_obj = station_repo.get_by_id(st_id)

        if st_obj:
            daily_change, monthly_change, _ = GroundwaterForecastingEngine.calculate_trend_velocity(st_obj)
            baseline_depth = st_obj.waterLevel
            crit_thresh = st_obj.criticalThreshold
            curr_trend = st_obj.trend.value
        elif nearest_dict and dist <= 35.0:
            baseline_depth = float(nearest_dict.get("waterLevel", 15.0))
            crit_thresh = float(nearest_dict.get("criticalThreshold", 25.0))
            rate = float(nearest_dict.get("trendRateMetersPerMonth", 0.15))
            daily_change = round(rate / 30.0, 4)
            monthly_change = round(rate, 3)
            curr_trend = str(nearest_dict.get("trend", "falling"))
        else:
            # Satellite-assisted inference
            sat_est = satellite_groundwater_engine.estimate_groundwater_condition(target_lat, target_lon)
            if nearest_dict:
                baseline_depth = float(nearest_dict.get("waterLevel", 18.0))
            else:
                baseline_depth = round(10.0 + sat_est.groundwater_stress_score * 20.0, 1)
            crit_thresh = 25.0
            daily_change = 0.005 if sat_est.groundwater_stress_score > 0.5 else -0.003
            monthly_change = round(daily_change * 30.0, 3)
            curr_trend = "falling" if sat_est.estimated_trend.upper() == "FALLING" else ("rising" if sat_est.estimated_trend.upper() == "RISING" else "stable")

        # 5. Calculate Days-to-Critical and Risk Category
        days_crit, crit_status, crit_urgency = GroundwaterForecastingEngine.calculate_days_to_critical(
            baseline_depth,
            crit_thresh,
            daily_change,
        )
        risk_class = GroundwaterForecastingEngine.classify_forecast_risk(
            baseline_depth,
            crit_thresh,
            daily_change,
            days_crit,
        )

        # 6. Build Multi-Horizon Trajectory Points
        if horizon_days == 7:
            offsets = [0, 1, 3, 5, 7]
        elif horizon_days == 30:
            offsets = [0, 7, 15, 21, 30]
        elif horizon_days == 60:
            offsets = [0, 7, 15, 30, 45, 60]
        else:  # 90 days
            offsets = [0, 7, 15, 30, 60, 90]

        # Derive location/station specific historical rainfall pattern
        loc_hist_rains = [h.rainfall for h in (st_obj.historicalData if st_obj and st_obj.historicalData else [])]
        loc_avg_monthly_rain = (sum(loc_hist_rains) / len(loc_hist_rains)) if loc_hist_rains else (25.0 if "rajasthan" in st_name.lower() else 45.0)
        loc_daily_rain_rate = max(0.2, loc_avg_monthly_rain / 30.0)

        points: List[ForecastPointResponse] = []
        for t in offsets:
            date_label = "Today" if t == 0 else f"+{t} Days"
            proj = round(baseline_depth + daily_change * t, 2)
            uncertainty = round(0.04 + 0.015 * math.sqrt(t) + 0.008 * t, 2) if t > 0 else 0.0
            lower = round(max(0.1, proj - uncertainty), 2)
            upper = round(proj + uncertainty, 2)

            chg_val = round(daily_change * t, 2)
            chg_label = "Baseline" if t == 0 else f"{'+' if chg_val > 0 else ''}{chg_val:.2f}m mbgl"
            rain_est = round(loc_daily_rain_rate * t, 1) if t > 0 else 0.0

            points.append(
                ForecastPointResponse(
                    date=date_label,
                    predicted_depth=proj,
                    baseline_depth=baseline_depth,
                    lower_bound=lower,
                    upper_bound=upper,
                    day_offset=t,
                    expected_rainfall_mm=rain_est,
                    change_label=chg_label,
                )
            )

        end_proj = points[-1].predicted_depth
        p30 = next((p.predicted_depth for p in points if p.day_offset == 30), end_proj)

        # 7. Generate Action Guidance & Personalize with Farm Profile
        if st_obj:
            guidance = GroundwaterForecastingEngine.generate_farmer_guidance(st_obj, risk_class, end_proj, days_crit)
        else:
            if risk_class == "critical":
                guidance = f"High Depletion Velocity: Projected groundwater table may reach {end_proj:.1f} mbgl. Restrict continuous pumping and implement deficit irrigation."
            elif risk_class == "worsening":
                guidance = f"Drawdown Expected: Water table projected to deepen to {end_proj:.1f} mbgl over {horizon_days} days. Prioritize micro-irrigation."
            elif risk_class == "improving":
                guidance = f"Positive Recharging: Water table expected to improve to {end_proj:.1f} mbgl. Adequate water for planned seasonal rotation."
            else:
                guidance = f"Stable Aquifer: Projected level near {end_proj:.1f} mbgl with normal seasonal fluctuations."

        # Farm Profile Personalization Notes
        profile_notes: List[str] = []
        clean_gw_dep = (groundwater_dependence or "").upper()
        clean_src = (water_source or "").title()

        if "HIGH" in clean_gw_dep or "70" in clean_gw_dep or "80" in clean_gw_dep or "90" in clean_gw_dep or "100" in clean_gw_dep or "Borewell" in clean_src:
            if risk_class in ["critical", "worsening"]:
                profile_notes.append("Borewell Reliance Warning: High groundwater dependence creates acute vulnerability to this projected drawdown. Schedule night-time micro-drip cycles.")
            else:
                profile_notes.append("Groundwater Priority: Safe seasonal water reserve, but continue calibrating pump operating hours.")

        if "Canal" in clean_src or "Pond" in clean_src:
            profile_notes.append("Surface Conjunctive Use: Maximize surface/canal water scheduling during upcoming high-drawdown phases to relieve aquifer pressure.")

        if crop and crop.strip():
            c_name = crop.strip()
            profile_notes.append(f"Crop Advisory ({c_name}): Align irrigation intervals to critical growth stages and consider mulch application to reduce soil moisture evaporation.")

        if water_reliability and "seasonal" in water_reliability.lower():
            profile_notes.append("Seasonal Reliability: Build bunding and check-dam trenches to capture seasonal percolation runoff.")

        methodology_desc = (
            f"Deterministic hydrogeological projection from {evidence_mode} baseline "
            f"with calibrated seasonal rate of change ({daily_change:+.4f} m/day)."
        )

        return LocationForecastResponse(
            location_name=loc_name,
            district=dist_name,
            state=st_name,
            latitude=target_lat,
            longitude=target_lon,
            evidence_mode=evidence_mode,
            nearest_station_id=st_id,
            nearest_station_name=st_display_name,
            nearest_station_distance_km=round(dist, 1) if dist is not None else None,
            current_depth=baseline_depth,
            critical_threshold=crit_thresh,
            projected_depth_30d=p30,
            projected_depth_end=end_proj,
            days_to_critical=days_crit,
            days_to_critical_status=crit_status,
            days_to_critical_urgency=crit_urgency,
            forecast_risk=risk_class,
            horizon_days=horizon_days,
            daily_change_m=daily_change,
            forecast_points=points,
            confidence=round(max(0.70, 0.95 - 0.002 * horizon_days), 2),
            farmer_guidance=guidance,
            personalized_profile_notes=profile_notes if profile_notes else None,
            provenance_label=prov_label,
            methodology=methodology_desc,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )


forecasting_engine = GroundwaterForecastingEngine()

