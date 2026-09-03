"""
JalKrishi AI — Satellite-Assisted Groundwater Engine
----------------------------------------------------
Spatial groundwater intelligence engine for regions without direct DWLR observation wells.
Combines nearby DWLR telemetry, remote-sensing vegetation/thermal indicators, simulated weather signals,
and hydrogeological terrain context to compute deterministic satellite-assisted groundwater estimates.

Scientific Disclaimer:
This engine provides spatial satellite-assisted estimates. It does NOT claim that satellite imagery
or remote sensing directly measures sub-surface groundwater table depth at individual wells.
"""

import math, hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

from app.config import settings
from app.pipeline.dwlr_ingest import station_repo
from app.models.schemas import (
    SatelliteGroundwaterEstimateResponse,
    SatelliteGroundwaterCoverageResponse,
    IndicatorItemSchema,
    SatelliteProviderSourceSchema,
)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance between two lat/lon pairs in kilometers using Haversine formula."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


# ==============================================================================
# Adapter Interfaces & Provider Stubs (For Future Production Integration)
# ==============================================================================

class BaseDataAdapter:
    """Base class for groundwater data integration adapters."""
    def __init__(self, name: str, category: str, is_configured: bool = False):
        self.name = name
        self.category = category
        self.is_configured = is_configured

    def get_status(self) -> str:
        return "CONFIGURED" if self.is_configured else "NOT_CONFIGURED"

    def get_provider_info(self) -> SatelliteProviderSourceSchema:
        return SatelliteProviderSourceSchema(
            provider_name=self.name,
            category=self.category,
            status=self.get_status(),
            description=f"{self.name} adapter for {self.category}. Status: {self.get_status()}.",
        )


class SatelliteRemoteSensingAdapter(BaseDataAdapter):
    def __init__(self):
        super().__init__("MODIS / Sentinel-2 Remote Sensing Adapter", "Optical & Thermal Satellite", is_configured=False)

    def fetch_indicators(self, lat: float, lon: float) -> Tuple[float, float, float]:
        """
        Returns (ndvi, surface_temp_anomaly, evapotranspiration)
        In simulation mode, derives deterministic synthetic signals from coordinate hash.
        """
        h = int(hashlib.md5(f"sat-{lat:.3f}-{lon:.3f}".encode()).hexdigest(), 16)
        ndvi = round(0.20 + (h % 60) / 100.0, 2)  # 0.20 to 0.80
        temp_anomaly = round(-1.5 + (h % 50) / 10.0, 1)  # -1.5 to +3.5 deg C
        et = round(2.0 + (h % 40) / 10.0, 1)  # 2.0 to 6.0 mm/day
        return ndvi, temp_anomaly, et


class GRACEWaterStorageAdapter(BaseDataAdapter):
    def __init__(self):
        super().__init__("NASA GRACE / GRACE-FO Mascon Adapter", "Terrestrial Water Storage", is_configured=False)

    def fetch_water_storage_anomaly(self, lat: float, lon: float) -> Tuple[str, float]:
        """Returns status string and anomaly in cm (returns NOT_CONFIGURED status for live feed)."""
        h = int(hashlib.md5(f"grace-{lat:.3f}-{lon:.3f}".encode()).hexdigest(), 16)
        anomaly_cm = round(-12.0 + (h % 24), 1)  # -12.0 to +12.0 cm
        return "NOT_CONFIGURED", anomaly_cm


class SARGroundDeformationAdapter(BaseDataAdapter):
    def __init__(self):
        super().__init__("Sentinel-1 InSAR Subsidence Adapter", "SAR Ground Deformation", is_configured=False)

    def fetch_deformation_rate(self, lat: float, lon: float) -> Tuple[str, float]:
        """Returns status string and mm/yr subsidence rate."""
        h = int(hashlib.md5(f"sar-{lat:.3f}-{lon:.3f}".encode()).hexdigest(), 16)
        subsidence_mm_yr = round((h % 15) * -1.2, 1)  # 0.0 to -18.0 mm/yr
        return "NOT_CONFIGURED", subsidence_mm_yr


class RainfallWeatherAdapter(BaseDataAdapter):
    def __init__(self):
        super().__init__("IMD / GPM Precipitation Adapter", "Precipitation & Weather", is_configured=False)

    def fetch_weather_signals(self, lat: float, lon: float) -> Tuple[float, float, str]:
        """Returns (rainfall_30d_mm, rainfall_probability_pct, rainfall_condition)."""
        h = int(hashlib.md5(f"rain-{lat:.3f}-{lon:.3f}".encode()).hexdigest(), 16)
        rain_mm = round(15.0 + (h % 140), 1)  # 15.0 to 155.0 mm
        prob_pct = round(20.0 + (h % 75), 0)  # 20% to 95%
        condition = "DEFICIT" if rain_mm < 40.0 else "EXCESS" if rain_mm > 110.0 else "NORMAL"
        return rain_mm, prob_pct, condition


# Instantiate Adapters
remote_sensing_adapter = SatelliteRemoteSensingAdapter()
grace_adapter = GRACEWaterStorageAdapter()
sar_adapter = SARGroundDeformationAdapter()
rainfall_adapter = RainfallWeatherAdapter()


class SatelliteGroundwaterEngine:
    """Core Engine for Satellite-Assisted Groundwater Condition Estimation."""

    def __init__(self):
        self.default_radius_km = settings.DWLR_COVERAGE_RADIUS_KM

    def find_nearest_dwlr_station(self, lat: float, lon: float) -> Tuple[Optional[Dict[str, Any]], float]:
        """Search nearest DWLR station from all 5,260 simulated stations."""
        stations = station_repo.get_all()
        if not stations:
            return None, 9999.0

        min_dist = 99999.0
        nearest = None

        for st in stations:
            # Handle dictionary or Pydantic model
            st_dict = st.model_dump() if hasattr(st, "model_dump") else (st.dict() if hasattr(st, "dict") else st)
            d = haversine_distance_km(lat, lon, st_dict["latitude"], st_dict["longitude"])
            if d < min_dist:
                min_dist = d
                nearest = st_dict

        return nearest, min_dist

    def get_coverage(
        self, lat: float, lon: float, radius_km: Optional[float] = None
    ) -> SatelliteGroundwaterCoverageResponse:
        """Determine spatial coverage status for any map coordinate."""
        r = radius_km if radius_km is not None else self.default_radius_km
        nearest, dist = self.find_nearest_dwlr_station(lat, lon)

        dwlr_available = dist <= r if nearest else False
        coverage_type = "Direct Measurement" if dwlr_available else "Satellite-Assisted Estimate"

        # Confidence level
        if dwlr_available:
            conf = "HIGH"
        elif dist <= 50.0:
            conf = "MEDIUM"
        else:
            conf = "LOW"

        st_code = nearest.get("stationCode") or nearest.get("id") if nearest else None
        st_name = nearest.get("stationName") if nearest else None

        return SatelliteGroundwaterCoverageResponse(
            latitude=lat,
            longitude=lon,
            dwlr_available=dwlr_available,
            coverage_type=coverage_type,
            radius_km=r,
            nearest_station_id=st_code,
            nearest_station_distance_km=dist,
            confidence_level=conf,
            data_mode=settings.DATA_MODE,
        )

    def estimate_groundwater_condition(
        self, lat: float, lon: float, radius_km: Optional[float] = None
    ) -> SatelliteGroundwaterEstimateResponse:
        """
        Calculate deterministic Satellite-Assisted Groundwater Estimate for a coordinate.
        Does NOT claim direct well measurement; evaluates spatial hydrogeological signals.
        """
        r = radius_km if radius_km is not None else self.default_radius_km
        nearest, dist = self.find_nearest_dwlr_station(lat, lon)

        dwlr_available = dist <= r if nearest else False
        estimation_mode = "DIRECT_DWLR" if dwlr_available else "SATELLITE_ASSISTED"

        # Fetch adapter signals
        ndvi, temp_anomaly, et = remote_sensing_adapter.fetch_indicators(lat, lon)
        grace_status, grace_anomaly_cm = grace_adapter.fetch_water_storage_anomaly(lat, lon)
        sar_status, sar_subsidence_mm = sar_adapter.fetch_deformation_rate(lat, lon)
        rain_mm, rain_prob, rain_condition = rainfall_adapter.fetch_weather_signals(lat, lon)

        # Baseline risk from nearest DWLR station
        if nearest:
            dwlr_risk = nearest.get("riskScore", 0.45)
            dwlr_trend = str(nearest.get("trend", "stable")).upper()
            st_name = nearest.get("stationName", "Nearest Well")
            st_code = nearest.get("stationCode") or nearest.get("id", "DWLR-000")
        else:
            dwlr_risk = 0.50
            dwlr_trend = "STABLE"
            st_name = None
            st_code = None

        # Calculate Groundwater Stress Score (0.0 safe -> 1.0 critical)
        # Component weights: Nearby DWLR (35%), Vegetation Water Stress (25%), Surface Temp (20%), Rainfall Deficit (20%)
        veg_stress_val = max(0.0, min(1.0, 1.0 - ndvi))  # Low NDVI = High stress
        temp_stress_val = max(0.0, min(1.0, (temp_anomaly + 2.0) / 6.0))  # High temp anomaly = High stress
        rain_stress_val = max(0.0, min(1.0, (120.0 - rain_mm) / 120.0))  # Low rain = High stress

        stress_score = round(
            0.35 * dwlr_risk + 0.25 * veg_stress_val + 0.20 * temp_stress_val + 0.20 * rain_stress_val,
            2,
        )
        stress_score = max(0.05, min(0.98, stress_score))

        # Groundwater Condition Classification
        if stress_score < 0.35:
            condition = "LOW_STRESS"
        elif stress_score < 0.60:
            condition = "MODERATE_STRESS"
        elif stress_score < 0.80:
            condition = "HIGH_STRESS"
        else:
            condition = "CRITICAL_STRESS"

        # Estimated Trend
        if dwlr_trend == "FALLING" or (rain_condition == "DEFICIT" and temp_anomaly > 1.5):
            estimated_trend = "FALLING"
        elif dwlr_trend == "RISING" or (rain_condition == "EXCESS" and rain_mm > 90.0):
            estimated_trend = "RISING"
        else:
            estimated_trend = "STABLE"

        # Recharge Outlook
        if rain_mm > 90.0 and ndvi > 0.50:
            recharge_outlook = "EXCELLENT"
        elif rain_mm > 60.0:
            recharge_outlook = "GOOD"
        elif rain_mm > 35.0:
            recharge_outlook = "MODERATE"
        else:
            recharge_outlook = "POOR"

        # Confidence Calculation
        # Decreases with distance from DWLR, and because GRACE/SAR feeds are NOT_CONFIGURED (stub status)
        dist_penalty = min(0.45, dist / 100.0)
        unconfigured_adapter_penalty = 0.15  # Penalty for unconfigured live feeds
        confidence_score = round(max(0.20, min(0.95, 1.0 - dist_penalty - unconfigured_adapter_penalty)), 2)

        if confidence_score >= 0.75 and dwlr_available:
            confidence_level = "HIGH"
        elif confidence_score >= 0.50:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"

        # Build Indicators Schema
        indicators: Dict[str, IndicatorItemSchema] = {
            "surface_temperature_signal": IndicatorItemSchema(
                name="Surface Thermal Anomaly",
                value=f"{temp_anomaly:+.1f}",
                unit="°C vs 10yr baseline",
                status="ELEVATED_WARMING" if temp_anomaly > 1.0 else "NORMAL",
                source="REMOTE_SENSING_SIMULATION",
                confidence="MEDIUM",
                description="Land surface temperature anomaly indicating evaporative stress on upper soil layers.",
            ),
            "vegetation_water_stress": IndicatorItemSchema(
                name="Vegetation Moisture Index (NDVI/NDWI)",
                value=ndvi,
                unit="Normalized Index (0-1)",
                status="MOISTURE_DEFICIT" if ndvi < 0.35 else "HEALTHY_VEGETATION",
                source="REMOTE_SENSING_SIMULATION",
                confidence="MEDIUM",
                description="Canopy greenness & moisture proxy for shallow root-zone water availability.",
            ),
            "evapotranspiration_signal": IndicatorItemSchema(
                name="Evapotranspiration Rate",
                value=et,
                unit="mm/day",
                status="HIGH_DEMAND" if et > 4.5 else "MODERATE",
                source="REMOTE_SENSING_SIMULATION",
                confidence="MEDIUM",
                description="Estimated atmospheric moisture loss rate across regional agricultural land.",
            ),
            "water_storage_anomaly": IndicatorItemSchema(
                name="Terrestrial Water Storage (GRACE)",
                value=f"{grace_anomaly_cm:+.1f}",
                unit="cm equivalent water height",
                status="NOT_CONFIGURED (SIMULATED STUB)",
                source="NASA_GRACE_ADAPTER (NOT_CONFIGURED)",
                confidence="LOW",
                description="Regional deep water storage anomaly stub. Live NASA GRACE provider is NOT_CONFIGURED.",
            ),
            "ground_deformation_signal": IndicatorItemSchema(
                name="Ground Subsidence Rate (InSAR)",
                value=f"{sar_subsidence_mm:.1f}",
                unit="mm/year",
                status="NOT_CONFIGURED (SIMULATED STUB)",
                source="SENTINEL_SAR_ADAPTER (NOT_CONFIGURED)",
                confidence="LOW",
                description="Aquifer compaction & ground deformation stub. Live Sentinel-1 SAR provider is NOT_CONFIGURED.",
            ),
            "rainfall_signal": IndicatorItemSchema(
                name="Precipitation & Monsoon Signal",
                value=f"{rain_mm} mm (30d)",
                unit="mm precipitation",
                status=rain_condition,
                source="SIMULATED_WEATHER_DATA",
                confidence="MEDIUM",
                description="30-day cumulative rainfall estimation for natural aquifer recharge potential.",
            ),
            "nearby_dwlr_signal": IndicatorItemSchema(
                name="Nearest DWLR Telemetry Trend",
                value=f"{dist:.1f} km to {st_code or 'N/A'}",
                unit="km geodesic distance",
                status=dwlr_trend,
                source="DIRECT_DWLR_NETWORK",
                confidence="HIGH" if dwlr_available else "MEDIUM",
                description=f"Hydrostatic drawdown trend recorded at nearest DWLR well ({st_name or 'None'}).",
            ),
        }

        # Data Sources
        data_sources = [
            "REMOTE_SENSING_SIMULATION",
            "SIMULATED_WEATHER_DATA",
            "NEARBY_DWLR_NETWORK",
            "FUTURE_GRACE_ADAPTER (NOT_CONFIGURED)",
            "FUTURE_SAR_ADAPTER (NOT_CONFIGURED)",
        ]

        disclaimer = (
            "Satellite-Assisted Estimate. This estimate combines remote-sensing indicators, "
            "simulated rainfall data, nearby groundwater observations, and environmental context. "
            "It is NOT a direct well-level groundwater measurement."
        )

        return SatelliteGroundwaterEstimateResponse(
            latitude=lat,
            longitude=lon,
            dwlr_available=dwlr_available,
            nearest_station_id=st_code,
            nearest_station_name=st_name,
            nearest_station_distance_km=dist,
            estimation_mode=estimation_mode,
            groundwater_condition=condition,
            groundwater_stress_score=stress_score,
            estimated_trend=estimated_trend,
            confidence=confidence_level,
            confidence_score=confidence_score,
            rainfall_condition=rain_condition,
            rainfall_probability=rain_prob,
            rainfall_mm_estimate=rain_mm,
            recharge_outlook=recharge_outlook,
            indicators=indicators,
            data_sources=data_sources,
            timestamp=datetime.now(timezone.utc).isoformat(),
            disclaimer=disclaimer,
            data_mode=settings.DATA_MODE,
        )

    def get_registered_providers(self) -> List[SatelliteProviderSourceSchema]:
        """Return list of all architected adapters and their live status."""
        return [
            remote_sensing_adapter.get_provider_info(),
            grace_adapter.get_provider_info(),
            sar_adapter.get_provider_info(),
            rainfall_adapter.get_provider_info(),
        ]


# Singleton Engine Instance
satellite_groundwater_engine = SatelliteGroundwaterEngine()
