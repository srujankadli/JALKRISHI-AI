"""
JalKrishi AI — Unified Farmer Intelligence Engine (Phase O)
------------------------------------------------------------
Provides a unified hydro-agronomic decision-support experience for any coordinate in India,
whether covered by a direct DWLR observation well (Mode A) or evaluated via Satellite-Assisted
Spatial Estimation (Mode B).

Integrates groundwater analytics, 30-day forecasting/outlook, spatial risk signals,
water-smart crop recommendations, irrigation guidance, and uncertainty propagation.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from app.config import settings
from app.engines.satellite_groundwater import satellite_groundwater_engine
from app.engines.forecasting import forecasting_engine
from app.engines.crop_recommender import crop_engine
from app.engines.anomaly_detector import anomaly_engine
from app.pipeline.dwlr_ingest import station_repo
from app.pipeline.location_resolver import resolve_location, LocationResolution
from app.models.schemas import (
    GroundwaterIntelligenceSchema,
    IndicatorItemSchema,
    LocationInfoSchema,
    CoverageInfoSchema,
    GroundwaterLevelSchema,
    ProvenanceInfoSchema,
)


class FarmerIntelligenceEngine:
    """Unified Engine orchestrating Mode A (Direct DWLR) and Mode B (Satellite-Assisted)."""

    def get_unified_groundwater_intelligence(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: Optional[float] = None,
        station_id: Optional[str] = None,
        location_query: Optional[str] = None,
        query_text: Optional[str] = None,
    ) -> GroundwaterIntelligenceSchema:
        r = radius_km if radius_km is not None else settings.DWLR_COVERAGE_RADIUS_KM

        # PRIORITY 1: Explicit location_query or location name extracted from query_text
        resolved_loc = resolve_location(location_query=location_query, query_text=query_text, latitude=lat, longitude=lon)
        if resolved_loc.is_resolved and resolved_loc.latitude is not None and resolved_loc.longitude is not None:
            target_lat = lat if lat is not None else resolved_loc.latitude
            target_lon = lon if lon is not None else resolved_loc.longitude
            loc_name = resolved_loc.name
            d_name = resolved_loc.district
            s_name = resolved_loc.state

            if resolved_loc.matched_station_id and target_lat == resolved_loc.latitude:
                st_schema = station_repo.get_by_id(resolved_loc.matched_station_id)
                if st_schema:
                    return self._build_mode_a_direct_dwlr(
                        st_schema.latitude, st_schema.longitude, st_schema.model_dump(), 0.0, r,
                        loc_name=resolved_loc.name, district_name=st_schema.district, state_name=st_schema.state
                    )

            nearest, dist = satellite_groundwater_engine.find_nearest_dwlr_station(target_lat, target_lon)
            if dist <= r and nearest:
                return self._build_mode_a_direct_dwlr(target_lat, target_lon, nearest, dist, r, loc_name=loc_name, district_name=d_name, state_name=s_name)
            else:
                return self._build_mode_b_satellite_assisted(target_lat, target_lon, nearest, dist, r, loc_name=loc_name, district_name=d_name, state_name=s_name)

        # If explicit location_query was provided by user, but could not be resolved to coordinates:
        # DO NOT fall back to background station_id! Return UNRESOLVED schema.
        raw_loc_query = (location_query or "").strip()
        if raw_loc_query and not any(p in raw_loc_query.lower() for p in ["selected station", "current station", "this station", "my station"]):
            return self._build_unresolved_location_schema(
                location_name=raw_loc_query,
                error_msg=f"Location '{raw_loc_query[:30]}' could not be resolved. Please specify a district, state, or city name (e.g. Bengaluru, Thanjavur, Leh, Mumbai, Kolar)."
            )

        # PRIORITY 2: Explicit station_id supplied from map/station selection (used when query text contains no place name)
        if station_id and station_id.strip():
            st_schema = station_repo.get_by_id(station_id.strip())
            if st_schema:
                st_dict = st_schema.model_dump()
                st_lat = st_schema.latitude
                st_lon = st_schema.longitude
                return self._build_mode_a_direct_dwlr(
                    st_lat, st_lon, st_dict, 0.0, r,
                    loc_name=f"{st_schema.stationName} ({st_schema.district}, {st_schema.state})"
                )

        # PRIORITY 3: Explicit latitude + longitude passed from client/map
        if lat is not None and lon is not None:
            nearest, dist = satellite_groundwater_engine.find_nearest_dwlr_station(lat, lon)
            loc_name = f"{nearest.get('district', 'Target Position')}, {nearest.get('state', '')}" if nearest else f"{lat:.2f}, {lon:.2f}"
            d_name = nearest.get("district") if nearest else None
            s_name = nearest.get("state") if nearest else None
            if dist <= r and nearest:
                return self._build_mode_a_direct_dwlr(lat, lon, nearest, dist, r, loc_name=loc_name, district_name=d_name, state_name=s_name)
            else:
                return self._build_mode_b_satellite_assisted(lat, lon, nearest, dist, r, loc_name=loc_name, district_name=d_name, state_name=s_name)

        # PRIORITY 4: No location supplied by farmer -> Request location
        return self._build_location_required_schema(
            error_msg="Enter your farm location to continue."
        )

    def _build_location_required_schema(
        self,
        error_msg: str = "Enter your farm location to continue."
    ) -> GroundwaterIntelligenceSchema:
        loc_schema = LocationInfoSchema(
            name="Location Required",
            district=None,
            state=None,
            latitude=0.0,
            longitude=0.0
        )
        cov_schema = CoverageInfoSchema(
            mode="LOCATION_REQUIRED",
            nearest_station_id=None,
            nearest_station_name=None,
            distance_km=0.0
        )
        gw_schema = GroundwaterLevelSchema(
            level_value=None,
            level_min=None,
            level_max=None,
            unit="m bgl",
            is_direct_measurement=False,
            confidence="LOW"
        )
        prov_schema = ProvenanceInfoSchema(
            primary_source="JALKRISHI_LOCATION_RESOLVER",
            data_mode=settings.DATA_MODE
        )
        return GroundwaterIntelligenceSchema(
            timestamp=datetime.now(timezone.utc).isoformat(),
            nearest_station_id=None,
            nearest_station_name=None,
            nearest_station_distance_km=0.0,
            latitude=0.0,
            longitude=0.0,
            coverage_type="Location Required",
            estimation_mode="LOCATION_REQUIRED",
            groundwater_condition="LOCATION_REQUIRED",
            current_groundwater_signal=error_msg,
            trend="UNKNOWN",
            forecast_summary=error_msg,
            forecast_30d_water_level=0.0,
            estimated_depth_range="Location Required",
            forecast_confidence="LOW",
            stress_score=0.5,
            recharge_outlook="MODERATE_RECHARGE",
            recharge_score=0.5,
            remote_sensing_indicators={},
            rainfall_signal="Location Required",
            risk_alerts=[error_msg],
            crop_implications="Enter your farm location to obtain tailored crop recommendations.",
            irrigation_implications="Enter your farm location to obtain irrigation recommendations.",
            farmer_recommendations=["Enter your farm location (e.g., Nashik, Pune, Jaipur, Kochi) to view groundwater status."],
            recommended_crops=[],
            confidence="LOW",
            confidence_score=0.0,
            data_sources=["JALKRISHI_LOCATION_RESOLVER"],
            disclaimer=error_msg,
            location_info=loc_schema,
            coverage_info=cov_schema,
            groundwater_info=gw_schema,
            provenance_info=prov_schema,
        )

    def _build_unresolved_location_schema(
        self,
        location_name: str,
        error_msg: str
    ) -> GroundwaterIntelligenceSchema:
        loc_schema = LocationInfoSchema(
            name=location_name[:40],
            district=None,
            state=None,
            latitude=0.0,
            longitude=0.0
        )
        cov_schema = CoverageInfoSchema(
            mode="UNRESOLVED",
            nearest_station_id=None,
            nearest_station_name=None,
            distance_km=0.0
        )
        gw_schema = GroundwaterLevelSchema(
            level_value=None,
            level_min=None,
            level_max=None,
            unit="m bgl",
            is_direct_measurement=False,
            confidence="LOW"
        )
        prov_schema = ProvenanceInfoSchema(
            primary_source="LOCATION_RESOLVER",
            data_mode=settings.DATA_MODE
        )
        return GroundwaterIntelligenceSchema(
            timestamp=datetime.now(timezone.utc).isoformat(),
            nearest_station_id=None,
            nearest_station_name=None,
            nearest_station_distance_km=0.0,
            latitude=0.0,
            longitude=0.0,
            coverage_type="Unresolved Location",
            estimation_mode="UNRESOLVED",
            groundwater_condition="LOCATION_UNRESOLVED",
            current_groundwater_signal=error_msg,
            trend="UNKNOWN",
            forecast_summary=error_msg,
            forecast_30d_water_level=0.0,
            estimated_depth_range="Location Unresolved",
            forecast_confidence="LOW",
            stress_score=0.5,
            recharge_outlook="MODERATE_RECHARGE",
            recharge_score=0.5,
            remote_sensing_indicators={},
            rainfall_signal="Location Unresolved",
            risk_alerts=[error_msg],
            crop_implications="Please provide a recognized district, city, or state name to obtain tailored crop guidance.",
            irrigation_implications="Please provide a recognized location to obtain irrigation recommendations.",
            farmer_recommendations=["Provide a district or state name (e.g., Bengaluru, Thanjavur, Leh, Mumbai, Kolar)."],
            recommended_crops=["Water-Smart Crops"],
            confidence="LOW",
            confidence_score=0.0,
            data_sources=["JALKRISHI_LOCATION_RESOLVER"],
            disclaimer=error_msg,
            location_info=loc_schema,
            coverage_info=cov_schema,
            groundwater_info=gw_schema,
            provenance_info=prov_schema,
        )

    def _build_mode_a_direct_dwlr(
        self,
        lat: float,
        lon: float,
        nearest: Dict[str, Any],
        dist: float,
        radius_km: float,
        loc_name: Optional[str] = None,
        district_name: Optional[str] = None,
        state_name: Optional[str] = None,
    ) -> GroundwaterIntelligenceSchema:
        """Mode A: Direct DWLR Observation & High-Confidence Hydrogeological Pipeline."""
        st_id = nearest.get("id") or nearest.get("stationCode", "DWLR-000")
        st_name = nearest.get("stationName", "Direct DWLR Well")
        water_level = nearest.get("waterLevel", 12.5)
        risk_score = nearest.get("riskScore", 0.45)
        status_val = nearest.get("status", "moderate").upper()
        trend_val = str(nearest.get("trend", "stable")).upper()
        district = nearest.get("district", "Local District")
        state = nearest.get("state", "Local State")

        resolved_district = district_name or district
        resolved_state = state_name or state
        resolved_name = loc_name or st_name

        loc_schema = LocationInfoSchema(
            name=resolved_name,
            district=resolved_district,
            state=resolved_state,
            latitude=lat,
            longitude=lon
        )
        cov_schema = CoverageInfoSchema(
            mode="DIRECT_DWLR",
            nearest_station_id=st_id,
            nearest_station_name=st_name,
            distance_km=dist
        )
        gw_schema = GroundwaterLevelSchema(
            level_value=water_level,
            level_min=None,
            level_max=None,
            unit="m bgl",
            is_direct_measurement=True,
            confidence="HIGH"
        )
        prov_schema = ProvenanceInfoSchema(
            primary_source="DWLR",
            data_mode=settings.DATA_MODE
        )

        # Forecast from direct station model
        forecast_res = forecasting_engine.forecast_station(st_id, horizon_days=30)
        fc_30d = forecast_res.forecast_points[-1].predicted_depth if forecast_res.forecast_points else water_level
        fc_summary = (
            f"Direct DWLR Telemetry Forecast: Water level is projected to move from {water_level} mbgl to "
            f"{fc_30d} mbgl over 30 days ({trend_val} trend)."
        )

        # Anomaly flags
        station_anomalies = anomaly_engine.get_station_anomalies(st_id)
        risk_alerts = [f"DWLR Telemetry Flag: {a.category} - {a.headline if hasattr(a, 'headline') else a.description}" for a in station_anomalies]
        if not risk_alerts:
            if risk_score >= 0.75:
                risk_alerts.append("DWLR Telemetry Alert: Aquifer risk score is elevated (>0.75).")
            else:
                risk_alerts.append("DWLR Telemetry Signal: Operating within normal hydrostatic limits.")

        # Crop recommendations from Phase F crop_engine
        from app.models.schemas import CropRecommendationRequest, SoilType, CropSeason, WaterAvailabilityLevel, RainfallCondition
        soil_enum = SoilType.ALLUVIAL if "alluvial" in str(nearest.get("soilType", "")).lower() else SoilType.LOAMY
        w_avail = WaterAvailabilityLevel.STRESSED if risk_score > 0.7 else WaterAvailabilityLevel.LIMITED if risk_score > 0.4 else WaterAvailabilityLevel.MODERATE
        
        crop_req = CropRecommendationRequest(
            state=state,
            district=district,
            soil_type=soil_enum,
            season=CropSeason.RABI,
            water_availability=w_avail,
            rainfall_condition=RainfallCondition.NORMAL,
        )
        crop_rec_res = crop_engine.evaluate_recommendations(crop_req)
        rec_crops = [c.crop_name for c in crop_rec_res.top_recommendations] or ["Chickpea / Bengal Gram (Chana)", "Pearl Millet (Bajra)", "Groundnut"]

        # Recharge outlook
        recharge_outlook = "EXCELLENT" if risk_score < 0.3 else "GOOD" if risk_score < 0.55 else "MODERATE" if risk_score < 0.75 else "POOR"
        recharge_score = round(1.0 - risk_score, 2)

        # Farmer recommendations
        farmer_recs = [
            f"Direct station measurement ({st_code_format(nearest)}): Current depth is {water_level} mbgl.",
            f"Crop choice: {', '.join(rec_crops[:2])} recommended for current soil and aquifer levels.",
            nearest.get("actionableAdvice", "Practice scheduled furrow/drip irrigation to conserve storage."),
            f"30-day forecast: Water level expected at {fc_30d} mbgl. Monitor weekly alerts.",
        ]

        disclaimer = (
            f"Direct DWLR Telemetry. Observed at well {st_name} ({st_id}), located {dist:.1f} km from target position."
        )

        return GroundwaterIntelligenceSchema(
            latitude=lat,
            longitude=lon,
            coverage_type="Direct DWLR Measurement",
            estimation_mode="DIRECT_DWLR",
            groundwater_condition=status_val if status_val in ["HEALTHY", "CRITICAL"] else f"{status_val}_STRESS",
            current_groundwater_signal=f"{water_level} m mbgl (Direct DWLR Well {st_id})",
            trend=trend_val,
            forecast_summary=fc_summary,
            forecast_30d_water_level=fc_30d,
            estimated_depth_range=f"{water_level} m mbgl (Direct DWLR Well Observation)",
            forecast_confidence="HIGH",
            stress_score=risk_score,
            recharge_outlook=recharge_outlook,
            recharge_score=recharge_score,
            nearest_station_id=st_id,
            nearest_station_name=st_name,
            nearest_station_distance_km=dist,
            remote_sensing_indicators={},
            rainfall_signal="Normal Seasonal Hydro-Balance",
            risk_alerts=risk_alerts,
            crop_implications=f"Direct DWLR telemetry confirms water table depth at {water_level} mbgl. Crops aligned to local soil & extraction rate.",
            irrigation_implications="Direct well observation available. Follow precise crop-stage water requirement scheduling.",
            farmer_recommendations=farmer_recs,
            recommended_crops=rec_crops,
            confidence="HIGH",
            confidence_score=0.92,
            data_sources=["DIRECT_DWLR_NETWORK", "CGWB_PIEZOMETER_GRID", "HYDROSTATIC_SENSOR_TELEMETRY"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            disclaimer=disclaimer,
            data_mode=settings.DATA_MODE,
            location_info=loc_schema,
            coverage_info=cov_schema,
            groundwater_info=gw_schema,
            provenance_info=prov_schema,
        )

    def _build_mode_b_satellite_assisted(
        self,
        lat: float,
        lon: float,
        nearest: Optional[Dict[str, Any]],
        dist: float,
        radius_km: float,
        loc_name: Optional[str] = None,
        district_name: Optional[str] = None,
        state_name: Optional[str] = None,
    ) -> GroundwaterIntelligenceSchema:
        """Mode B: Satellite-Assisted Spatial Estimation & Propagated Uncertainty Pipeline."""
        sat_est = satellite_groundwater_engine.estimate_groundwater_condition(lat, lon, radius_km)

        stress_score = sat_est.groundwater_stress_score
        condition = sat_est.groundwater_condition
        trend = sat_est.estimated_trend
        conf = sat_est.confidence
        conf_score = sat_est.confidence_score
        recharge_outlook = sat_est.recharge_outlook
        rain_mm = sat_est.rainfall_mm_estimate
        rain_cond = sat_est.rainfall_condition

        # Inferred 30-day water level depth
        if nearest:
            base_depth = nearest.get("waterLevel", 14.0)
            st_id = nearest.get("stationCode") or nearest.get("id")
            st_name = nearest.get("stationName")
        else:
            base_depth = round(10.0 + stress_score * 18.0, 1)
            st_id = None
            st_name = None

        trend_delta = 0.4 if trend == "FALLING" else -0.3 if trend == "RISING" else 0.05
        fc_30d = round(max(3.0, base_depth + trend_delta), 1)

        d_min = max(2, int(fc_30d - 2))
        d_max = int(fc_30d + 2)
        depth_range_str = f"{d_min}–{d_max} m bgl (Model-derived estimate; not a direct measurement)"

        fc_summary = (
            f"Satellite-Assisted Groundwater Outlook: Aquifer stress index is {stress_score:.2f} ({condition}) "
            f"with {trend} trajectory over 30 days. Estimated depth range: {d_min}–{d_max} m bgl "
            f"(Model-derived estimate; not a direct measurement)."
        )

        # Spatial Risk Signals (Not fake DWLR anomalies)
        risk_alerts = []
        if sat_est.indicators.get("surface_temperature_signal", IndicatorItemSchema(name="", value="", unit="", status="", source="", description="")).status == "ELEVATED_WARMING":
            risk_alerts.append("Satellite Risk Signal: Elevated land surface temperature anomaly indicating evaporative stress.")
        if sat_est.indicators.get("vegetation_water_stress", IndicatorItemSchema(name="", value="", unit="", status="", source="", description="")).status == "MOISTURE_DEFICIT":
            risk_alerts.append("Satellite Risk Signal: Canopy moisture deficit detected via remote sensing index.")
        if rain_cond == "DEFICIT":
            risk_alerts.append(f"Precipitation Deficit: 30-day rainfall signal ({rain_mm} mm) below seasonal recharge threshold.")
        if not risk_alerts:
            risk_alerts.append("Satellite Risk Signal: Moderate regional moisture balance with stable spatial trends.")

        # Adapt Crop Recommendation using Phase F crop_engine
        from app.models.schemas import CropRecommendationRequest, SoilType, CropSeason, WaterAvailabilityLevel, RainfallCondition
        soil_enum = SoilType.RED if lat < 16.0 else SoilType.ALLUVIAL if lat > 24.0 else SoilType.BLACK
        resolved_district = district_name or (nearest.get("district", "Regional Sector") if nearest else "Regional Sector")
        resolved_state = state_name or (nearest.get("state", "Regional State") if nearest else "Regional State")
        w_avail = WaterAvailabilityLevel.STRESSED if stress_score > 0.7 else WaterAvailabilityLevel.LIMITED if stress_score > 0.4 else WaterAvailabilityLevel.MODERATE

        resolved_name = loc_name or resolved_district
        loc_schema = LocationInfoSchema(
            name=resolved_name,
            district=resolved_district,
            state=resolved_state,
            latitude=lat,
            longitude=lon
        )
        cov_schema = CoverageInfoSchema(
            mode="SATELLITE_ASSISTED",
            nearest_station_id=None,
            nearest_station_name=None,
            distance_km=dist
        )
        gw_schema = GroundwaterLevelSchema(
            level_value=None,
            level_min=float(d_min),
            level_max=float(d_max),
            unit="m bgl",
            is_direct_measurement=False,
            confidence=conf
        )
        prov_schema = ProvenanceInfoSchema(
            primary_source="SATELLITE_REMOTE_SENSING",
            data_mode=settings.DATA_MODE
        )

        crop_req = CropRecommendationRequest(
            state=resolved_state,
            district=resolved_district,
            soil_type=soil_enum,
            season=CropSeason.RABI,
            water_availability=w_avail,
            rainfall_condition=RainfallCondition.LOW if rain_cond == "DEFICIT" else RainfallCondition.NORMAL,
        )
        crop_rec_res = crop_engine.evaluate_recommendations(crop_req)
        rec_crops = [c.crop_name for c in crop_rec_res.top_recommendations] or ["Finger Millet (Ragi)", "Groundnut", "Pearl Millet (Bajra)"]

        # Agronomic Implications
        crop_impl = (
            f"Groundwater near your farm shows {condition.replace('_', ' ').lower()} ({stress_score:.2f}). "
            f"Crop selections emphasize lower water requirements where agronomically suitable for {soil_enum.value}."
        )

        irrigation_impl = (
            f"Satellite-Assisted Irrigation Advice: {rain_cond} rainfall signal ({rain_mm} mm/30d). "
            + ("Restrict flood pumping; deploy drip/sprinklers during early morning hours to limit evaporative loss."
               if stress_score > 0.55 else "Maintain standard conservation scheduling based on rainfall arrivals.")
        )

        # Actionable Farmer Recommendations with Confidence Propagation
        farmer_recs = [
            f"No direct DWLR station within {radius_km} km (nearest well is {dist:.1f} km away). JalKrishi is using Satellite-Assisted Intelligence.",
            f"Estimated Groundwater Condition: {condition.replace('_', ' ')} (Stress Index: {stress_score:.2f}). Estimated Depth: {d_min}–{d_max} m bgl (Model-derived estimate).",
            f"Recommended Crops: {', '.join(rec_crops[:3])} reflect current regional moisture capacity.",
            f"Irrigation Guidance: {irrigation_impl}",
            f"Confidence Level: {conf} ({round(conf_score * 100)}%). Forecast and advice reflect this confidence bounds.",
        ]

        return GroundwaterIntelligenceSchema(
            latitude=lat,
            longitude=lon,
            coverage_type="Satellite-Assisted Estimate",
            estimation_mode="SATELLITE_ASSISTED",
            groundwater_condition=condition,
            current_groundwater_signal=f"Stress Index {stress_score:.2f} ({condition.replace('_', ' ')}) — Est. Depth: {d_min}–{d_max} m bgl",
            trend=trend,
            forecast_summary=fc_summary,
            forecast_30d_water_level=fc_30d,
            estimated_depth_range=depth_range_str,
            forecast_confidence=conf,  # Propagated confidence
            stress_score=stress_score,
            recharge_outlook=recharge_outlook,
            recharge_score=round(1.0 - stress_score, 2),
            nearest_station_id=st_id,
            nearest_station_name=st_name,
            nearest_station_distance_km=dist,
            remote_sensing_indicators=sat_est.indicators,
            rainfall_signal=f"{rain_mm} mm (30d) - {rain_cond}",
            risk_alerts=risk_alerts,
            crop_implications=crop_impl,
            irrigation_implications=irrigation_impl,
            farmer_recommendations=farmer_recs,
            recommended_crops=rec_crops,
            confidence=conf,
            confidence_score=conf_score,
            data_sources=sat_est.data_sources,
            timestamp=datetime.now(timezone.utc).isoformat(),
            disclaimer=sat_est.disclaimer,
            data_mode=settings.DATA_MODE,
            location_info=loc_schema,
            coverage_info=cov_schema,
            groundwater_info=gw_schema,
            provenance_info=prov_schema,
        )


def st_code_format(st: Dict[str, Any]) -> str:
    return st.get("stationCode") or st.get("id", "DWLR-Well")


# Singleton Engine Instance
farmer_intelligence_engine = FarmerIntelligenceEngine()
