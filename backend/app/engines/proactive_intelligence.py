"""
JalKrishi AI — Proactive Groundwater Intelligence & Early Warning Engine
------------------------------------------------------------------------
Orchestration and deterministic multi-signal fusion layer.
Consumes evidence from DWLR telemetry, forecasting trajectories, anomaly detections,
remote-sensing satellite indicators, and data-quality health metrics to detect emerging,
escalating, recovering, and data-quality stress states.

Architecture:
Observation -> Signal -> Risk -> Recommendation -> Audience Routing

Data Provenance & Scientific Transparency:
Preserves explicit data modes (DIRECT_DWLR, SATELLITE_ASSISTED, REFERENCE_SIMULATION).
Never labels simulation models as live government telemetry or direct satellite well measurements.
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone
from collections import defaultdict
import math

from app.config import settings
from app.models.schemas import (
    DWLRStationSchema,
    TrendDirection,
    StationStatus,
    TelemetryStatus,
    ProactiveRiskState,
    ProactiveLifecycleStatus,
    ProactiveSignalType,
    TargetAudienceEnum,
    EvidenceSignalSchema,
    ExplainabilitySchema,
    AudienceActionSchema,
    ProactiveAlertSchema,
    ProactiveOverviewResponse,
    ProactiveRegionSummary,
    ProactiveRegionSummaryResponse,
    ProactiveStationEvaluationResponse,
)
from app.pipeline.dwlr_ingest import station_repo
from app.engines.forecasting import forecasting_engine
from app.engines.anomaly_detector import anomaly_engine
from app.engines.satellite_groundwater import satellite_groundwater_engine


class ProactiveGroundwaterIntelligenceEngine:
    """
    Proactive Groundwater Early Warning & Intelligence Engine.
    Evaluates multi-signal evidence, tracks alert persistence/lifecycle, enforces data-quality overrides,
    and produces explainable audience-targeted actions.
    """

    def __init__(self):
        # In-memory alert state registry keyed by station_id
        self._alert_registry: Dict[str, ProactiveAlertSchema] = {}
        self._last_evaluated_timestamp: Optional[str] = None
        self._cached_overview: Optional[ProactiveOverviewResponse] = None

    def _get_current_timestamp(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # ==========================================================================
    # 1. MULTI-SIGNAL FUSION LAYER
    # ==========================================================================
    def extract_evidence_signals(
        self,
        station: DWLRStationSchema,
        current_time: str
    ) -> Tuple[List[EvidenceSignalSchema], bool]:
        """
        Gathers and normalizes multi-source evidence for a station.
        Returns: (signals_list, is_data_quality_degraded)
        """
        signals: List[EvidenceSignalSchema] = []
        is_dq_degraded = False

        # ----------------------------------------------------------------------
        # A. Telemetry & Data Quality Signal (Data Quality Check)
        # ----------------------------------------------------------------------
        telem_val = station.telemetryStatus.value if hasattr(station.telemetryStatus, "value") else str(station.telemetryStatus)
        if telem_val.upper() in ["OFFLINE", "UNVERIFIED", "DELAYED"]:
            is_dq_degraded = True
            signals.append(
                EvidenceSignalSchema(
                    signal_type=ProactiveSignalType.DATA_QUALITY_DEGRADATION,
                    label="Telemetry Data Quality Interruption",
                    value=f"Station status: {telem_val}",
                    direction="NEUTRAL",
                    severity="HIGH" if telem_val.upper() == "OFFLINE" else "MODERATE",
                    confidence="LOW",
                    evidence_source="DWLR Telemetry Health Check",
                    provenance="JalKrishi Reference Simulation Dataset",
                    evaluation_period="Current Observation Cycle",
                    timestamp=current_time,
                )
            )

        # ----------------------------------------------------------------------
        # B. Groundwater Trend & Rate Signal (Observation & Signal)
        # ----------------------------------------------------------------------
        rate_m_mo = station.trendRateMetersPerMonth
        depth_m = station.waterLevel

        if station.trend == TrendDirection.FALLING:
            if rate_m_mo >= 0.35:
                signals.append(
                    EvidenceSignalSchema(
                        signal_type=ProactiveSignalType.ACCELERATING_DECLINE,
                        label="Accelerating Groundwater Drawdown",
                        value=f"+{rate_m_mo:.2f} m/month deepening rate",
                        direction="DECLINING",
                        severity="CRITICAL" if depth_m >= 28.0 else "HIGH",
                        confidence="HIGH" if len(station.historicalData or []) >= 4 else "MODERATE",
                        evidence_source="Direct Hydrostatic Piezometer Observation",
                        provenance="JalKrishi Reference Simulation Dataset",
                        evaluation_period="30-Day Evaluation Window",
                        timestamp=current_time,
                    )
                )
            elif rate_m_mo >= 0.12:
                signals.append(
                    EvidenceSignalSchema(
                        signal_type=ProactiveSignalType.GROUNDWATER_DECLINE,
                        label="Steady Groundwater Level Drop",
                        value=f"+{rate_m_mo:.2f} m/month deepening rate",
                        direction="DECLINING",
                        severity="MODERATE",
                        confidence="MODERATE",
                        evidence_source="Direct Hydrostatic Piezometer Observation",
                        provenance="JalKrishi Reference Simulation Dataset",
                        evaluation_period="30-Day Evaluation Window",
                        timestamp=current_time,
                    )
                )
        elif station.trend == TrendDirection.RISING and abs(rate_m_mo) >= 0.15:
            signals.append(
                EvidenceSignalSchema(
                    signal_type=ProactiveSignalType.RECHARGE_SIGNAL,
                    label="Active Groundwater Table Recharge",
                    value=f"-{abs(rate_m_mo):.2f} m/month shallower recovery",
                    direction="RISING",
                    severity="LOW",
                    confidence="HIGH" if len(station.historicalData or []) >= 4 else "MODERATE",
                    evidence_source="Direct Hydrostatic Piezometer Observation",
                    provenance="JalKrishi Reference Simulation Dataset",
                    evaluation_period="30-Day Evaluation Window",
                    timestamp=current_time,
                )
            )

        # ----------------------------------------------------------------------
        # C. Forecast Trajectory Signal (Forecasting Integration)
        # ----------------------------------------------------------------------
        try:
            daily_ch, monthly_ch, _ = forecasting_engine.calculate_trend_velocity(station)
            days_crit, crit_status, crit_urgency = forecasting_engine.calculate_days_to_critical(
                depth_m, station.criticalDepth, daily_ch
            )

            if days_crit is not None and days_crit <= 45:
                signals.append(
                    EvidenceSignalSchema(
                        signal_type=ProactiveSignalType.FORECASTED_STRESS,
                        label="Forecasted Critical Threshold Margin",
                        value=f"Projected {days_crit} days to pump critical threshold ({station.criticalDepth} m)",
                        direction="DECLINING",
                        severity="CRITICAL" if days_crit <= 25 else "HIGH",
                        confidence="HIGH" if len(station.historicalData or []) >= 4 else "MODERATE",
                        evidence_source="JalKrishi 30–90 Day Predictive Model",
                        provenance="Reference Simulation Model",
                        evaluation_period="30–90 Day Trajectory",
                        timestamp=current_time,
                    )
                )
            elif monthly_ch > 0.20:
                signals.append(
                    EvidenceSignalSchema(
                        signal_type=ProactiveSignalType.FORECASTED_STRESS,
                        label="Projected Depletion Trajectory",
                        value=f"Forecast indicates sustained +{monthly_ch:.2f} m/mo decline",
                        direction="DECLINING",
                        severity="MODERATE",
                        confidence="MODERATE",
                        evidence_source="JalKrishi 30–90 Day Predictive Model",
                        provenance="Reference Simulation Model",
                        evaluation_period="30–90 Day Trajectory",
                        timestamp=current_time,
                    )
                )
        except Exception:
            pass

        # ----------------------------------------------------------------------
        # D. Anomaly Detection Signal (Anomaly Engine Integration)
        # ----------------------------------------------------------------------
        delta = round(station.waterLevel - station.previousWaterLevel, 2)
        if delta >= 0.45 or (station.trend == TrendDirection.FALLING and station.trendRateMetersPerMonth >= 0.25):
            signals.append(
                EvidenceSignalSchema(
                    signal_type=ProactiveSignalType.ANOMALY_PERSISTENCE,
                    label="Sudden Localized Drawdown Anomaly",
                    value=f"+{delta:.2f} m deviation from baseline",
                    direction="DECLINING",
                    severity="CRITICAL" if station.waterLevel >= 30.0 or delta >= 0.6 else "HIGH",
                    confidence="MODERATE",
                    evidence_source="Hydrostatic Quality & Anomaly Engine",
                    provenance="JalKrishi Reference Simulation Dataset",
                    evaluation_period="Recent Telemetry Step",
                    timestamp=current_time,
                )
            )

        # ----------------------------------------------------------------------
        # E. Satellite & Weather Environmental Stress Signals
        # ----------------------------------------------------------------------
        try:
            indicators = satellite_groundwater_engine.get_regional_indicators(station.latitude, station.longitude)
            temp_anom = indicators.get("temperature_anomaly")
            et_ind = indicators.get("evapotranspiration")

            if temp_anom and temp_anom.raw_value and temp_anom.raw_value >= 2.0:
                signals.append(
                    EvidenceSignalSchema(
                        signal_type=ProactiveSignalType.SATELLITE_TEMPERATURE_STRESS,
                        label="Elevated Thermal Surface Stress",
                        value=f"+{temp_anom.raw_value:.1f}°C surface thermal anomaly",
                        direction="NEUTRAL",
                        severity="MODERATE",
                        confidence="MODERATE",
                        evidence_source="Remote Sensing Thermal Surface Proxy",
                        provenance="Reference Remote Sensing Synthesis",
                        evaluation_period="Current Seasonal Window",
                        timestamp=current_time,
                    )
                )

            if et_ind and et_ind.raw_value and et_ind.raw_value >= 4.5:
                signals.append(
                    EvidenceSignalSchema(
                        signal_type=ProactiveSignalType.RAINFALL_DEFICIT,
                        label="High Evaporative Water Demand",
                        value=f"{et_ind.raw_value:.1f} mm/day potential evapotranspiration",
                        direction="NEUTRAL",
                        severity="MODERATE",
                        confidence="MODERATE",
                        evidence_source="Hydrological Balance Synthesis",
                        provenance="Reference Remote Sensing Synthesis",
                        evaluation_period="Current Seasonal Window",
                        timestamp=current_time,
                    )
                )
        except Exception:
            pass

        return signals, is_dq_degraded

    # ==========================================================================
    # 2. STATE DETERMINATION & PROACTIVE DECISION LOGIC
    # ==========================================================================
    def determine_proactive_state(
        self,
        station: DWLRStationSchema,
        signals: List[EvidenceSignalSchema],
        is_dq_degraded: bool
    ) -> Tuple[ProactiveRiskState, float, str, bool]:
        """
        Evaluates multi-signal fusion and determines proactive risk state, priority score, and confidence.
        Returns: (risk_state, priority_score, confidence_level, is_multi_signal_confirmed)
        """
        # 1. MANDATORY DATA QUALITY OVERRIDE
        if is_dq_degraded:
            priority = 52.0
            return ProactiveRiskState.DATA_QUALITY_WARNING, priority, "LOW", False

        # Count independent declining/stress signals
        decline_signals = [s for s in signals if s.direction == "DECLINING"]
        recharge_signals = [s for s in signals if s.direction == "RISING"]
        critical_signals = [s for s in signals if s.severity == "CRITICAL"]
        high_signals = [s for s in signals if s.severity == "HIGH"]

        signal_count = len(decline_signals)
        is_multi_confirmed = signal_count >= 2

        depth_m = station.waterLevel
        rate_m_mo = station.trendRateMetersPerMonth

        # 2. CRITICAL RISK: Multi-signal confirmation OR extreme depth with worsening trend
        if (len(critical_signals) >= 1 and is_multi_confirmed) or (depth_m >= 32.0 and rate_m_mo >= 0.30):
            priority = min(98.0, 75.0 + (len(critical_signals) * 8.0) + (len(high_signals) * 4.0) + (depth_m * 0.3))
            return ProactiveRiskState.CRITICAL_RISK, round(priority, 1), "HIGH" if is_multi_confirmed else "MODERATE", is_multi_confirmed

        # 3. ESCALATING RISK: Multi-signal decline or high severity signals
        if (is_multi_confirmed and rate_m_mo >= 0.20) or len(high_signals) >= 2 or (depth_m >= 25.0 and rate_m_mo >= 0.25):
            priority = min(84.0, 60.0 + (signal_count * 5.0) + (rate_m_mo * 20.0))
            return ProactiveRiskState.ESCALATING_RISK, round(priority, 1), "HIGH" if is_multi_confirmed else "MODERATE", is_multi_confirmed

        # 4. EMERGING RISK: Single early signal without multi-horizon confirmation
        if signal_count >= 1 or rate_m_mo >= 0.12 or depth_m >= 22.0:
            priority = min(62.0, 42.0 + (signal_count * 6.0) + (rate_m_mo * 15.0))
            return ProactiveRiskState.EMERGING_RISK, round(priority, 1), "MODERATE", is_multi_confirmed

        # 5. RECOVERY SIGNAL: Sustained recharge
        if len(recharge_signals) >= 1 or station.trend == TrendDirection.RISING:
            priority = 25.0
            return ProactiveRiskState.RECOVERY_SIGNAL, priority, "HIGH" if len(recharge_signals) >= 1 else "MODERATE", len(recharge_signals) >= 1

        # 6. STABLE: Normal baseline conditions
        priority = 10.0
        return ProactiveRiskState.STABLE, priority, "HIGH", False

    # ==========================================================================
    # 3. OBSERVATION -> SIGNAL -> RISK -> RECOMMENDATION EXPLAINABILITY
    # ==========================================================================
    def build_explainability_and_actions(
        self,
        station: DWLRStationSchema,
        risk_state: ProactiveRiskState,
        signals: List[EvidenceSignalSchema],
        confidence: str,
        is_multi_confirmed: bool
    ) -> Tuple[ExplainabilitySchema, List[AudienceActionSchema], str]:
        """
        Generates structured 4-part explainability (Observation -> Signal -> Risk -> Recommendation)
        and tailored actions for Farmer, Official, and Hydrologist.
        """
        depth_m = station.waterLevel
        rate_m_mo = station.trendRateMetersPerMonth
        loc_str = f"{station.block + ' Block, ' if station.block else ''}{station.district}, {station.state}"

        actions: List[AudienceActionSchema] = []
        notif_message = ""

        if risk_state == ProactiveRiskState.DATA_QUALITY_WARNING:
            observation = f"Telemetry status for station {getattr(station, "stationCode", getattr(station, "id", getattr(station, "stationId", "")))} is reporting irregular intervals or unverified packet checksums."
            signal = "Data transmission delay or potential sensor telemetry calibration requirement."
            risk = "Groundwater table trend cannot be reliably confirmed until sensor observations are re-verified."
            recommendation = "Verify latest telemetry packet health and avoid making major crop irrigation adjustments solely based on unverified sensor status."
            what_changed = "Observation data has not arrived at the expected schedule or shows patterns requiring sensor verification."
            why_it_matters = "Unverified telemetry could mislead irrigation planning; verification protects farmers from premature operational shifts."
            evidence_summary = "Telemetry status flag • Packet transmission interval monitoring."
            what_to_do = "Check station telemetry status; field team notified for scheduled diagnostic verification."

            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.FARMER,
                    action_title="Verify Telemetry Status",
                    action_description="Wait for solar/network telemetry verification before making abrupt irrigation pump changes.",
                    priority="MEDIUM",
                    category="TELEMETRY_CHECK"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.OFFICIAL,
                    action_title="Dispatch Telemetry Diagnostic Check",
                    action_description="Inspect solar battery float voltage and SIM communication module for station observation node.",
                    priority="HIGH",
                    category="TELEMETRY_CHECK"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.HYDROLOGIST,
                    action_title="Flag Observation Stale in Spatial Interpolation",
                    action_description="Exclude unverified piezometer readings from regional kriging and spatial interpolation until calibrated.",
                    priority="ROUTINE",
                    category="TELEMETRY_CHECK"
                )
            )
            notif_message = f"Data quality notice: Observation well {station.stationName} ({station.district}) telemetry requires verification."

        elif risk_state == ProactiveRiskState.CRITICAL_RISK:
            observation = f"Groundwater level is measured at {depth_m:.2f} m bgl with a deepening trend rate of +{rate_m_mo:.2f} m/month."
            signal = f"Water table decline is exceeding sustainable local extraction capacity and approaching pump critical head ({station.criticalThreshold} m)."
            risk = "Severe localized aquifer depletion with imminent risk of tube-well dry-out during peak crop irrigation cycles."
            recommendation = "Implement immediate rotational tube-well pumping intervals and switch to high-efficiency micro-irrigation schedules."
            what_changed = f"Groundwater level is dropping rapidly (+{rate_m_mo:.2f} m/mo) with multiple confirming indicators."
            why_it_matters = "Continued extraction at this rate may cause localized tube-well cavitation and acute crop water stress."
            evidence_summary = " + ".join([s.label for s in signals[:3]]) if signals else "Direct piezometric drawdown + predictive forecast"
            what_to_do = "Stagger neighboring pump shifts, pause deep flood irrigation, and check days-to-critical projection in Forecast."

            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.FARMER,
                    action_title="Stagger Tube-Well Operation Shifts",
                    action_description="Coordinate with neighboring farmers to avoid simultaneous morning pumping; use drip/sprinkler cycles.",
                    priority="IMMEDIATE",
                    category="IRRIGATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.OFFICIAL,
                    action_title="Issue Village Cluster Water Advisory",
                    action_description="Alert block agriculture officer to review deep unmetered extraction and inspect community recharge shafts.",
                    priority="IMMEDIATE",
                    category="FIELD_VERIFICATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.HYDROLOGIST,
                    action_title="Cross-Correlate Neighboring Aquifer Nodes",
                    action_description="Analyze spatial piezometric cone of depression across adjacent DWLR nodes to isolate extraction clusters.",
                    priority="HIGH",
                    category="WELL_MONITORING"
                )
            )
            notif_message = f"Critical Groundwater Alert for {loc_str}: Rapid water-level drop detected. Immediate irrigation conservation advised."

        elif risk_state == ProactiveRiskState.ESCALATING_RISK:
            observation = f"Water level is recorded at {depth_m:.2f} m bgl with persistent deepening trend of +{rate_m_mo:.2f} m/month."
            signal = "Multi-signal alignment indicates localized water withdrawal is consistently outpacing natural hydrostatic replenishment."
            risk = "Aquifer water table is in an escalating depletion trajectory; days-to-critical margin is decreasing."
            recommendation = "Review crop water requirements, avoid unnecessary irrigation rounds, and prepare soil moisture conservation mulching."
            what_changed = "Groundwater stress indicators are consistently worsening across consecutive observation intervals."
            why_it_matters = "Early action prevents emergency water shortages later in the rabi/zaid crop growth cycles."
            evidence_summary = " + ".join([s.label for s in signals[:2]]) if signals else "Piezometric trend + seasonal outlook"
            what_to_do = "Review water-smart crop advice and check forecast trajectory to plan upcoming irrigation intervals."

            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.FARMER,
                    action_title="Adopt Water-Conserving Irrigation",
                    action_description="Shift to night-time drip irrigation to minimize evaporative losses and preserve aquifer head.",
                    priority="HIGH",
                    category="IRRIGATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.OFFICIAL,
                    action_title="Monitor Regional Pumping Intensity",
                    action_description="Track district-level drawdown velocity and evaluate contingency water-tanker readiness if needed.",
                    priority="HIGH",
                    category="FIELD_VERIFICATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.HYDROLOGIST,
                    action_title="Track Piezometric Recovery Lag",
                    action_description="Calculate diurnal recovery curve to quantify specific yield degradation and aquifer recharge elasticity.",
                    priority="MEDIUM",
                    category="WELL_MONITORING"
                )
            )
            notif_message = f"Escalating Groundwater Risk in {loc_str}: Trend is declining faster than seasonal average."

        elif risk_state == ProactiveRiskState.EMERGING_RISK:
            observation = f"Groundwater depth is at {depth_m:.2f} m bgl with early indication of deepening trend (+{rate_m_mo:.2f} m/mo)."
            signal = "Early localized depletion signal detected in reference telemetry."
            risk = "Water availability may become constrained if current extraction continues without recharge."
            recommendation = "Monitor tube-well water level and review crop water demand before expanding high-water crops."
            what_changed = "Early groundwater change flagged in current reference analysis."
            why_it_matters = "Monitoring early signals allows timely adjustment before severe water stress impacts crop yields."
            evidence_summary = signals[0].label if signals else "Early piezometric variance"
            what_to_do = "Check groundwater forecast and consider water-smart crop alternatives for upcoming sowing."

            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.FARMER,
                    action_title="Monitor Water Level & Crop Advice",
                    action_description="Check the 30-day forecast and explore less water-intensive crops in Crop Advisor.",
                    priority="MEDIUM",
                    category="CROP"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.OFFICIAL,
                    action_title="Log for Routine Extension Review",
                    action_description="Include station trend in monthly district water-resource review bulletin.",
                    priority="ROUTINE",
                    category="FIELD_VERIFICATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.HYDROLOGIST,
                    action_title="Validate Trend Trajectory",
                    action_description="Monitor upcoming 14-day telemetry intervals to confirm whether decline persists or self-corrects.",
                    priority="ROUTINE",
                    category="WELL_MONITORING"
                )
            )
            notif_message = f"Early Groundwater Warning in {loc_str}: Mild depletion signal detected. Monitor trend."

        elif risk_state == ProactiveRiskState.RECOVERY_SIGNAL:
            observation = f"Groundwater depth is measured at {depth_m:.2f} m bgl with a shallower rising trend (-{abs(rate_m_mo):.2f} m/mo)."
            signal = "Hydrostatic pressure recovery indicating active aquifer replenishment from rainfall or canal seepage."
            risk = "Low water stress; aquifer reserves are currently expanding."
            recommendation = "Take advantage of favorable soil moisture conditions with optimal sowing and maintain rainwater harvesting structures."
            what_changed = "Groundwater levels are rising shallower following recent recharge conditions."
            why_it_matters = "Improved water table increases seasonal reserve and reduces pumping energy costs."
            evidence_summary = "Positive hydrostatic rebound rate + seasonal recharge indicators"
            what_to_do = "Explore high-value crop rotation opportunities in Crop Advisor and ensure recharge pits remain clear."

            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.FARMER,
                    action_title="Optimize Sowing Planning",
                    action_description="Utilize improved moisture availability for recommended rotation crops while preserving storage.",
                    priority="MEDIUM",
                    category="CROP"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.OFFICIAL,
                    action_title="Verify Recharge Structure Functionality",
                    action_description="Inspect check dams and percolation tanks in the block to document replenishment capacity.",
                    priority="ROUTINE",
                    category="FIELD_VERIFICATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.HYDROLOGIST,
                    action_title="Record Specific Yield Infiltration Constant",
                    action_description="Quantify recharge coefficient against cumulative precipitation data for local aquifer model.",
                    priority="ROUTINE",
                    category="WELL_MONITORING"
                )
            )
            notif_message = f"Groundwater Recharge Signal for {loc_str}: Water levels improving."

        else:  # STABLE
            observation = f"Groundwater level is steady at {depth_m:.2f} m bgl within normal historical baseline range."
            signal = "No meaningful depletion or acute anomaly detected."
            risk = "Low hydrological stress; seasonal equilibrium maintained."
            recommendation = "Continue standard irrigation scheduling and monitor seasonal forecasts."
            what_changed = "Groundwater conditions remain relatively stable in available reference data."
            why_it_matters = "Normal reserves support standard crop cycles without immediate operational changes."
            evidence_summary = "Hydrostatic stability across consecutive observation cycles"
            what_to_do = "No emergency action needed; continue standard water management."

            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.FARMER,
                    action_title="Maintain Efficient Irrigation",
                    action_description="Follow standard water-smart schedules; no immediate intervention required.",
                    priority="ROUTINE",
                    category="IRRIGATION"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.OFFICIAL,
                    action_title="Routine Monitoring",
                    action_description="Station operates within standard reference baseline limits.",
                    priority="ROUTINE",
                    category="WELL_MONITORING"
                )
            )
            actions.append(
                AudienceActionSchema(
                    target_audience=TargetAudienceEnum.HYDROLOGIST,
                    action_title="Baseline Logging",
                    action_description="Telemetry verified within ±1.0σ baseline standard deviation.",
                    priority="ROUTINE",
                    category="WELL_MONITORING"
                )
            )
            notif_message = f"Groundwater conditions stable in {loc_str}."

        tech_evidence = {
            "station_id": getattr(station, "stationId", getattr(station, "id", getattr(station, "stationCode", ""))),
            "observed_depth_mbgl": depth_m,
            "monthly_rate_m_mo": rate_m_mo,
            "critical_threshold_mbgl": getattr(station, "criticalThreshold", getattr(station, "criticalDepth", 25.0)),
            "trend_direction": station.trend.value if hasattr(station.trend, "value") else str(station.trend),
            "multi_signal_count": len(signals),
            "telemetry_status": station.telemetryStatus.value if hasattr(station.telemetryStatus, "value") else str(station.telemetryStatus),
            "signal_details": [s.model_dump() for s in signals]
        }

        explainability = ExplainabilitySchema(
            observation=observation,
            signal=signal,
            risk=risk,
            recommendation=recommendation,
            confidence=confidence,
            what_changed=what_changed,
            why_it_matters=why_it_matters,
            evidence_summary=evidence_summary,
            what_to_do=what_to_do,
            technical_evidence=tech_evidence,
        )

        return explainability, actions, notif_message

    # ==========================================================================
    # 4. PERSISTENCE, LIFECYCLE & DEDUPLICATION ENGINE
    # ==========================================================================
    def evaluate_station(self, station: Any) -> ProactiveAlertSchema:
        if isinstance(station, str):
            st_obj = station_repo.get_by_id(station.strip())
            if not st_obj:
                # Return synthetic stable alert if not found
                return ProactiveAlertSchema(
                    alert_id=f"PROACTIVE-{station}",
                    station_id=station,
                    station_name=station,
                    state="Unknown",
                    district="Unknown",
                    block="",
                    latitude=12.97,
                    longitude=77.59,
                    risk_state=ProactiveRiskState.STABLE,
                    lifecycle_status=ProactiveLifecycleStatus.RESOLVED,
                    priority_score=10.0,
                    confidence="MODERATE",
                    provenance="JalKrishi Reference Simulation Dataset",
                    detected_at=self._get_current_timestamp(),
                    last_updated_at=self._get_current_timestamp(),
                    signals_count=0,
                    explainability=ExplainabilitySchema(
                        what_changed="Station not found in monitored registry.",
                        why_it_matters="No telemetry available.",
                        evidence_summary="Baseline unknown.",
                        confidence_rating="LOW",
                        confidence_rationale="No telemetry available.",
                        what_to_do="Verify station identifier.",
                        technical_evidence={},
                        signals=[],
                    ),
                    target_audiences=[TargetAudienceEnum.FARMER],
                    audience_actions=[],
                )
            station = st_obj
        """
        Evaluates a single station, manages alert persistence/lifecycle, updates state,
        and prevents duplicate alert creation across evaluation cycles.
        """
        curr_time = self._get_current_timestamp()
        signals, is_dq_degraded = self.extract_evidence_signals(station, curr_time)
        risk_state, priority, confidence, is_multi_confirmed = self.determine_proactive_state(
            station, signals, is_dq_degraded
        )

        explainability, actions, notif_msg = self.build_explainability_and_actions(
            station, risk_state, signals, confidence, is_multi_confirmed
        )

        st_id = getattr(station, "stationId", getattr(station, "id", getattr(station, "stationCode", "UNKNOWN")))
        alert_key = f"PROACT-{st_id}"
        existing_alert = self._alert_registry.get(st_id)

        if existing_alert:
            # Lifecycle Transition
            first_detected = existing_alert.first_detected_at
            cycles = existing_alert.persistence_cycles + 1

            if risk_state == ProactiveRiskState.STABLE and existing_alert.risk_state != ProactiveRiskState.STABLE:
                status = ProactiveLifecycleStatus.RESOLVED
            elif risk_state == ProactiveRiskState.RECOVERY_SIGNAL:
                status = ProactiveLifecycleStatus.RECOVERING
            elif risk_state in [ProactiveRiskState.CRITICAL_RISK, ProactiveRiskState.ESCALATING_RISK] and existing_alert.risk_state == ProactiveRiskState.EMERGING_RISK:
                status = ProactiveLifecycleStatus.ESCALATING
            else:
                status = ProactiveLifecycleStatus.ACTIVE
        else:
            first_detected = curr_time
            cycles = 1
            status = ProactiveLifecycleStatus.NEW

        alert = ProactiveAlertSchema(
            alert_id=alert_key,
            station_id=st_id,
            station_name=station.stationName,
            state=station.state,
            district=station.district,
            block=station.block or "",
            latitude=station.latitude,
            longitude=station.longitude,
            risk_state=risk_state,
            lifecycle_status=status,
            priority_score=priority,
            confidence=confidence,
            multi_signal_confirmed=is_multi_confirmed,
            signal_count=len(signals),
            persistence_cycles=cycles,
            evidence_signals=signals,
            explainability=explainability,
            audience_actions=actions,
            notification_candidate=risk_state in [ProactiveRiskState.CRITICAL_RISK, ProactiveRiskState.ESCALATING_RISK],
            notification_priority="HIGH" if risk_state == ProactiveRiskState.CRITICAL_RISK else "MEDIUM" if risk_state == ProactiveRiskState.ESCALATING_RISK else "LOW",
            notification_message=notif_msg,
            first_detected_at=first_detected,
            last_evaluated_at=curr_time,
            data_mode="DEMO_SIMULATION",
            provenance="JalKrishi Reference Simulation Dataset",
        )

        self._alert_registry[st_id] = alert
        return alert

    # ==========================================================================
    # 5. ALL-NETWORK SCAN & AGGREGATION
    # ==========================================================================
    def evaluate_all_stations(self, force_refresh: bool = False) -> List[ProactiveAlertSchema]:
        """Scans the entire station network and generates deduplicated proactive alerts."""
        if not force_refresh and self._last_evaluated_timestamp and len(self._alert_registry) > 0:
            return list(self._alert_registry.values())

        all_stations = station_repo.get_all()
        alerts: List[ProactiveAlertSchema] = []

        for st in all_stations:
            alert = self.evaluate_station(st)
            alerts.append(alert)

        self._last_evaluated_timestamp = self._get_current_timestamp()
        return alerts

    def get_proactive_overview(self, user_stations: Optional[List[DWLRStationSchema]] = None) -> ProactiveOverviewResponse:
        """Computes high-level overview metrics across active proactive alerts with optional geographic scoping."""
        all_alerts = self.evaluate_all_stations()

        if user_stations is not None:
            allowed_ids = {getattr(s, "stationCode", getattr(s, "id", getattr(s, "stationId", ""))) for s in user_stations}
            filtered_alerts = [a for a in all_alerts if a.station_id in allowed_ids]
        else:
            filtered_alerts = all_alerts

        crit_count = sum(1 for a in filtered_alerts if a.risk_state == ProactiveRiskState.CRITICAL_RISK)
        esc_count = sum(1 for a in filtered_alerts if a.risk_state == ProactiveRiskState.ESCALATING_RISK)
        emg_count = sum(1 for a in filtered_alerts if a.risk_state == ProactiveRiskState.EMERGING_RISK)
        rec_count = sum(1 for a in filtered_alerts if a.risk_state == ProactiveRiskState.RECOVERY_SIGNAL)
        dq_count = sum(1 for a in filtered_alerts if a.risk_state == ProactiveRiskState.DATA_QUALITY_WARNING)
        stable_count = sum(1 for a in filtered_alerts if a.risk_state == ProactiveRiskState.STABLE)

        state_dist = defaultdict(int)
        cat_dist = defaultdict(int)

        for a in filtered_alerts:
            if a.risk_state != ProactiveRiskState.STABLE:
                state_dist[a.state] += 1
                cat_dist[a.risk_state.value] += 1

        # Sort alerts by priority descending
        sorted_alerts = sorted(
            [a for a in filtered_alerts if a.risk_state != ProactiveRiskState.STABLE],
            key=lambda x: x.priority_score,
            reverse=True
        )

        return ProactiveOverviewResponse(
            timestamp=self._get_current_timestamp(),
            data_mode="DEMO_SIMULATION",
            provenance="JalKrishi Reference Simulation Dataset",
            total_active_alerts=len(sorted_alerts),
            critical_risk_count=crit_count,
            escalating_risk_count=esc_count,
            emerging_risk_count=emg_count,
            recovery_signal_count=rec_count,
            data_quality_warning_count=dq_count,
            stable_monitored_count=stable_count,
            top_priority_alerts=sorted_alerts[:25],
            state_distribution=dict(state_dist),
            category_distribution=dict(cat_dist),
            disclaimer="JalKrishi Reference Simulation Dataset & Hydrogeological Decision Support Model.",
        )

    get_overview = get_proactive_overview

    def get_proactive_alerts(
        self,
        risk_state: Optional[str] = None,
        state: Optional[str] = None,
        district: Optional[str] = None,
        search_query: Optional[str] = None,
        user_stations: Optional[List[DWLRStationSchema]] = None
    ) -> List[ProactiveAlertSchema]:
        """Returns filtered active proactive alerts."""
        all_alerts = self.evaluate_all_stations()

        if user_stations is not None:
            allowed_ids = {s.stationId for s in user_stations}
            alerts = [a for a in all_alerts if a.station_id in allowed_ids]
        else:
            alerts = all_alerts

        # Filter by risk state
        if risk_state and risk_state.upper() != "ALL":
            alerts = [a for a in alerts if a.risk_state.value == risk_state.upper()]
        else:
            # Exclude purely stable by default unless requested
            alerts = [a for a in alerts if a.risk_state != ProactiveRiskState.STABLE]

        if state and state not in ["All States", "All India"]:
            alerts = [a for a in alerts if a.state.lower() == state.lower()]

        if district and district not in ["All Districts"]:
            alerts = [a for a in alerts if a.district.lower() == district.lower()]

        if search_query and search_query.strip():
            q = search_query.strip().lower()
            alerts = [
                a for a in alerts
                if q in a.station_name.lower()
                or q in a.district.lower()
                or q in a.state.lower()
                or q in a.station_id.lower()
                or (a.block and q in a.block.lower())
            ]

        return sorted(alerts, key=lambda x: x.priority_score, reverse=True)

    def get_regional_summary(self, group_by: str = "STATE") -> ProactiveRegionSummaryResponse:
        """Groups proactive intelligence signals by state or district."""
        all_alerts = self.evaluate_all_stations()
        grouped: Dict[str, List[ProactiveAlertSchema]] = defaultdict(list)

        for a in all_alerts:
            key = a.state if group_by.upper() == "STATE" else f"{a.district} ({a.state})"
            grouped[key].append(a)

        summaries: List[ProactiveRegionSummary] = []
        for reg_name, reg_alerts in grouped.items():
            active_alerts = [a for a in reg_alerts if a.risk_state != ProactiveRiskState.STABLE]
            crit = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.CRITICAL_RISK)
            esc = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.ESCALATING_RISK)
            emg = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.EMERGING_RISK)
            rec = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.RECOVERY_SIGNAL)
            dq = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.DATA_QUALITY_WARNING)

            if crit > 0:
                primary = ProactiveRiskState.CRITICAL_RISK
                desc = f"{crit} critical drawdown nodes requiring immediate irrigation shift."
                action = "Issue staggered pumping advisory and review cluster extraction."
            elif esc > 0:
                primary = ProactiveRiskState.ESCALATING_RISK
                desc = f"{esc} nodes showing sustained multi-week depletion."
                action = "Promote micro-irrigation scheduling and monitor block reserves."
            elif emg > 0:
                primary = ProactiveRiskState.EMERGING_RISK
                desc = f"{emg} nodes showing early water-level decline."
                action = "Monitor trend velocity across upcoming observation cycles."
            elif rec > 0:
                primary = ProactiveRiskState.RECOVERY_SIGNAL
                desc = f"{rec} nodes showing hydrostatic recharge recovery."
                action = "Optimize crop sowing and maintain percolation infrastructure."
            elif dq > 0:
                primary = ProactiveRiskState.DATA_QUALITY_WARNING
                desc = f"{dq} nodes reporting telemetry or sensor quality flags."
                action = "Dispatch field maintenance for sensor diagnostic checks."
            else:
                primary = ProactiveRiskState.STABLE
                desc = "Groundwater levels steady within seasonal baseline range."
                action = "Continue standard water management practices."

            summaries.append(
                ProactiveRegionSummary(
                    region_name=reg_name,
                    region_type="STATE" if group_by.upper() == "STATE" else "DISTRICT",
                    total_monitored_nodes=len(reg_alerts),
                    active_alerts_count=len(active_alerts),
                    critical_count=crit,
                    escalating_count=esc,
                    emerging_count=emg,
                    recovery_count=rec,
                    data_quality_count=dq,
                    primary_risk_state=primary,
                    regional_stress_summary=desc,
                    top_recommended_action=action,
                )
            )

        return ProactiveRegionSummaryResponse(
            timestamp=self._get_current_timestamp(),
            total_regions=len(summaries),
            regions=sorted(summaries, key=lambda x: (x.critical_count * 10 + x.escalating_count * 5 + x.active_alerts_count), reverse=True),
            disclaimer="JalKrishi Reference Simulation Dataset Regional Risk Breakdown.",
        )

    def get_station_proactive_evaluation(self, station_id: str) -> Optional[ProactiveStationEvaluationResponse]:
        """Evaluates and returns proactive intelligence for a single station ID."""
        station = station_repo.get_by_id(station_id.strip())
        if not station:
            return None

        alert = self.evaluate_station(station)
        is_active = alert.risk_state != ProactiveRiskState.STABLE

        forecast_traj = "Stable baseline trajectory"
        if station.trend == TrendDirection.FALLING:
            forecast_traj = f"Projected deepening trend (+{station.trendRateMetersPerMonth:.2f} m/month)"
        elif station.trend == TrendDirection.RISING:
            forecast_traj = f"Projected recharge trajectory (-{abs(station.trendRateMetersPerMonth):.2f} m/month)"

        return ProactiveStationEvaluationResponse(
            station_id=getattr(station, "stationCode", getattr(station, "id", getattr(station, "stationId", ""))),
            station_name=station.stationName,
            state=station.state,
            district=station.district,
            block=station.block or "",
            latitude=station.latitude,
            longitude=station.longitude,
            current_water_level=station.waterLevel,
            trend_rate_m_per_month=station.trendRateMetersPerMonth,
            forecast_trajectory_summary=forecast_traj,
            proactive_alert=alert if is_active else alert,
            is_alert_active=is_active,
            evaluation_timestamp=self._get_current_timestamp(),
            data_mode="DEMO_SIMULATION",
            provenance="JalKrishi Reference Simulation Dataset",
        )


    def get_alerts(
        self,
        state: Optional[str] = None,
        district: Optional[str] = None,
        risk_state: Optional[Any] = None,
        lifecycle_status: Optional[Any] = None,
        audience: Optional[Any] = None,
        min_priority: float = 0.0,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProactiveAlertSchema]:
        """Unified alert fetcher with rich filtering."""
        all_alerts = self.evaluate_all_stations()
        results: List[ProactiveAlertSchema] = []

        for a in all_alerts:
            if state and a.state.lower() != state.lower():
                continue
            if district and a.district.lower() != district.lower():
                continue
            if risk_state:
                val = risk_state.value if hasattr(risk_state, "value") else str(risk_state)
                if a.risk_state.value != val:
                    continue
            if lifecycle_status:
                val = lifecycle_status.value if hasattr(lifecycle_status, "value") else str(lifecycle_status)
                if a.lifecycle_status.value != val:
                    continue
            if audience:
                aud_val = audience.value if hasattr(audience, "value") else str(audience)
                if not any(act.audience.value == aud_val for act in a.audience_actions):
                    continue
            if a.priority_score < min_priority:
                continue
            if search and search.strip():
                q = search.strip().lower()
                matches = (
                    q in a.station_id.lower()
                    or q in a.station_name.lower()
                    or q in a.district.lower()
                    or q in a.state.lower()
                    or (a.block and q in a.block.lower())
                )
                if not matches:
                    continue
            results.append(a)

        # Sort by priority score descending
        results.sort(key=lambda x: x.priority_score, reverse=True)
        return results[offset : offset + limit]

    def get_region_summaries(
        self,
        region_type: str = "district",
        state_filter: Optional[str] = None,
    ) -> List[ProactiveRegionSummary]:
        """Aggregates region summaries for administrative rollups."""
        all_alerts = self.evaluate_all_stations()
        grouped: Dict[str, List[ProactiveAlertSchema]] = defaultdict(list)

        for a in all_alerts:
            if state_filter and a.state.lower() != state_filter.lower():
                continue
            key = a.state if region_type.lower() == "state" else a.district
            grouped[key].append(a)

        summaries: List[ProactiveRegionSummary] = []
        for reg_name, reg_alerts in grouped.items():
            active_alerts = [a for a in reg_alerts if a.risk_state != ProactiveRiskState.STABLE]
            crit = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.CRITICAL_RISK)
            esc = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.ESCALATING_RISK)
            emg = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.EMERGING_RISK)
            rec = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.RECOVERY_SIGNAL)
            dq = sum(1 for a in reg_alerts if a.risk_state == ProactiveRiskState.DATA_QUALITY_WARNING)

            if crit > 0:
                primary = ProactiveRiskState.CRITICAL_RISK
                desc = f"{crit} critical depletion wells requiring immediate intervention."
                action = "Enforce staggered pumping shifts and deploy emergency micro-drip."
            elif esc > 0:
                primary = ProactiveRiskState.ESCALATING_RISK
                desc = f"{esc} wells with accelerating water table drop."
                action = "Promote night-time irrigation and adjust crop water budgets."
            elif emg > 0:
                primary = ProactiveRiskState.EMERGING_RISK
                desc = f"{emg} wells showing early declining trajectories."
                action = "Monitor drawdown velocity across subsequent observation steps."
            elif rec > 0:
                primary = ProactiveRiskState.RECOVERY_SIGNAL
                desc = f"{rec} wells showing positive recharge."
                action = "Maintain recharge pits and optimize seasonal crop rotations."
            elif dq > 0:
                primary = ProactiveRiskState.DATA_QUALITY_WARNING
                desc = f"{dq} wells with delayed or unverified sensor telemetry."
                action = "Schedule field telemetry verification."
            else:
                primary = ProactiveRiskState.STABLE
                desc = "Groundwater levels steady within seasonal baseline range."
                action = "Continue standard irrigation scheduling."

            summaries.append(
                ProactiveRegionSummary(
                    region_name=reg_name,
                    region_type="STATE" if region_type.lower() == "state" else "DISTRICT",
                    total_monitored_nodes=len(reg_alerts),
                    active_alerts_count=len(active_alerts),
                    critical_count=crit,
                    escalating_count=esc,
                    emerging_count=emg,
                    recovery_count=rec,
                    data_quality_count=dq,
                    primary_risk_state=primary,
                    regional_stress_summary=desc,
                    top_recommended_action=action,
                )
            )

        summaries.sort(key=lambda x: (x.critical_count * 10 + x.escalating_count * 5 + x.active_alerts_count), reverse=True)
        return summaries

    def get_alert_evidence(self, alert_id: str) -> Optional[ExplainabilitySchema]:
        """Returns explainability evidence for a given alert ID."""
        all_alerts = self.evaluate_all_stations()
        for a in all_alerts:
            if a.alert_id == alert_id:
                return a.explainability
        return None

    def evaluate_network(self) -> None:
        """Forces network re-evaluation."""
        self.evaluate_all_stations()

    # ==========================================================================
    # 6. FARMER CONVERSATIONAL PROACTIVE BRIEFING HELPER
    # ==========================================================================
    def get_farmer_proactive_brief(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        station_id: Optional[str] = None,
        location_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Produces natural, plain-language conversational briefings for farmers
        when asking proactive questions ('Is there any warning?', 'Anything I should know?').
        """
        st: Optional[DWLRStationSchema] = None

        if station_id:
            st = station_repo.get_by_id(station_id.strip())
        elif lat is not None and lon is not None:
            nearest_dict, dist = satellite_groundwater_engine.find_nearest_dwlr_station(lat, lon)
            if nearest_dict and "stationId" in nearest_dict:
                st = station_repo.get_by_id(nearest_dict["stationId"])

        if not st:
            loc_label = location_name or "your area"
            return {
                "has_warning": False,
                "risk_state": "STABLE",
                "summary": f"No active groundwater warning is currently flagged for {loc_label}. Groundwater conditions appear relatively stable in the available reference simulation data.",
                "what_changed": "Groundwater conditions remain relatively stable.",
                "what_to_do": "Continue regular efficient irrigation and follow standard crop water management.",
                "confidence": "MODERATE",
                "provenance": "JalKrishi Reference Simulation Dataset",
            }

        alert = self.evaluate_station(st)
        loc_label = location_name or f"{st.block + ' ' if st.block else ''}{st.district}"

        if alert.risk_state == ProactiveRiskState.CRITICAL_RISK:
            summary = (
                f"Yes, there is an urgent groundwater-stress warning for {loc_label}. "
                f"Water levels have been dropping rapidly (+{st.trendRateMetersPerMonth:.2f} m/month) "
                f"and are approaching pump critical depth ({st.waterLevel:.1f} m bgl). "
                f"It is strongly recommended to stagger tube-well operation shifts and avoid deep flood irrigation."
            )
        elif alert.risk_state == ProactiveRiskState.ESCALATING_RISK:
            summary = (
                f"Yes, your area ({loc_label}) is showing an escalating groundwater-stress signal. "
                f"The water table is in a sustained declining trend (+{st.trendRateMetersPerMonth:.2f} m/month). "
                f"Consider adopting night-time drip irrigation to conserve water."
            )
        elif alert.risk_state == ProactiveRiskState.EMERGING_RISK:
            summary = (
                f"There is an early groundwater-stress signal flagged for {loc_label}. "
                f"The recent water-level trend shows a mild decline (+{st.trendRateMetersPerMonth:.2f} m/month). "
                f"This is an early monitoring signal based on reference simulation data."
            )
        elif alert.risk_state == ProactiveRiskState.RECOVERY_SIGNAL:
            summary = (
                f"Good news for {loc_label}: Groundwater indicators show active recharge conditions. "
                f"Water levels are rising shallower (-{abs(st.trendRateMetersPerMonth):.2f} m/month). "
                f"You can take advantage of improved soil moisture for recommended rotation crops."
            )
        elif alert.risk_state == ProactiveRiskState.DATA_QUALITY_WARNING:
            summary = (
                f"For {loc_label}, recent observation telemetry is delayed or requires verification. "
                f"Please verify latest sensor data before planning critical irrigation changes."
            )
        else:
            summary = (
                f"Nothing significant is currently flagged for {loc_label}. "
                f"Groundwater conditions appear relatively stable in the available reference simulation data ({st.waterLevel:.1f} m bgl)."
            )

        return {
            "has_warning": alert.risk_state in [ProactiveRiskState.CRITICAL_RISK, ProactiveRiskState.ESCALATING_RISK, ProactiveRiskState.EMERGING_RISK],
            "risk_state": alert.risk_state.value,
            "station_id": getattr(st, "stationCode", getattr(st, "id", getattr(st, "stationId", ""))),
            "station_name": st.stationName,
            "summary": summary,
            "what_changed": alert.explainability.what_changed,
            "why_it_matters": alert.explainability.why_it_matters,
            "what_to_do": alert.explainability.what_to_do,
            "confidence": alert.confidence,
            "provenance": alert.provenance,
        }


# Global singleton instance
proactive_intelligence_engine = ProactiveGroundwaterIntelligenceEngine()
