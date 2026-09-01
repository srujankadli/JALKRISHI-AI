from typing import Optional, List, Dict, Any, Tuple
from collections import defaultdict
from app.config import settings
from app.models.schemas import (
    SoilType,
    CropSeason,
    WaterAvailabilityLevel,
    RainfallCondition,
    TrendDirection,
    StationStatus,
    DWLRStationSchema,
    CropScoringBreakdown,
    CropRecommendation,
    NotRecommendedCrop,
    GroundwaterContext,
    CropRecommendationRequest,
    CropRecommendationResponse,
    CropComparisonRequest,
    CropComparisonRow,
    CropComparisonResponse,
    CropProfileResponse,
    CropCatalogResponse,
    CropMethodologyResponse,
)
from app.pipeline.dwlr_ingest import station_repo
from app.engines.forecasting import forecasting_engine

# ==========================================
# 1. Scoring Model Weights & Constants
# ==========================================

SCORING_WEIGHTS = {
    "soil_compatibility": 0.25,
    "water_availability_match": 0.25,
    "season_compatibility": 0.15,
    "rainfall_match": 0.15,
    "groundwater_trend": 0.20,
}

TIER_THRESHOLDS = {
    "Excellent": "Score >= 85",
    "Good": "70 <= Score < 85",
    "Moderate": "50 <= Score < 70",
    "Poor": "35 <= Score < 50",
    "Not Recommended": "Score < 35 or Severe Ground-Water Stress Mismatch",
}


# ==========================================
# 2. Crop Catalogue Data Profile
# ==========================================

CROP_CATALOGUE_DATA: List[Dict[str, Any]] = [
    {
        "crop_id": "crop-chickpea",
        "crop_name": "Chickpea / Bengal Gram (Chana)",
        "local_name": "चना",
        "category": "Pulses & Legumes",
        "seasons": [CropSeason.RABI],
        "suitable_soils": [SoilType.LOAMY, SoilType.ALLUVIAL, SoilType.BLACK, SoilType.SANDY, SoilType.RED],
        "water_requirement_mm": 280,
        "water_demand_tier": "Low",
        "maturity_days": "100 - 115 days",
        "drought_tolerance": "High",
        "root_zone_depth_cm": "90 - 120 cm taproot",
        "rainfall_preference": RainfallCondition.LOW,
        "aquifer_impact": "Positive / Low Draw",
        "yield_potential": "20 - 25 quintals/ha",
        "description": "Deep taproot pulse that thrives on residual soil moisture, fixing atmospheric nitrogen and rebuilding aquifer sustainability.",
        "farmer_notes": "Extremely water-efficient; requires only 1-2 light irrigations. Guaranteed MSP procurement.",
    },
    {
        "crop_id": "crop-bajra",
        "crop_name": "Pearl Millet (Bajra)",
        "local_name": "बाजरा",
        "category": "Millets & Coarse Cereals",
        "seasons": [CropSeason.KHARIF, CropSeason.ZAID],
        "suitable_soils": [SoilType.SANDY, SoilType.RED, SoilType.LOAMY, SoilType.ALLUVIAL, SoilType.LATERITE],
        "water_requirement_mm": 350,
        "water_demand_tier": "Low",
        "maturity_days": "75 - 85 days",
        "drought_tolerance": "Exceptional",
        "root_zone_depth_cm": "100 - 140 cm fibrous",
        "rainfall_preference": RainfallCondition.LOW,
        "aquifer_impact": "Positive / Low Draw",
        "yield_potential": "28 - 34 quintals/ha",
        "description": "Exceptional drought tolerance. Consumes 65% less water than paddy with excellent grain and high-protein livestock fodder value.",
        "farmer_notes": "Thrives under summer heat and sandy soils. Minimal reliance on tube-wells.",
    },
    {
        "crop_id": "crop-mustard",
        "crop_name": "Mustard / Rapeseed (Sarson)",
        "local_name": "सरसों",
        "category": "Oilseeds",
        "seasons": [CropSeason.RABI],
        "suitable_soils": [SoilType.ALLUVIAL, SoilType.LOAMY, SoilType.SANDY, SoilType.BLACK],
        "water_requirement_mm": 300,
        "water_demand_tier": "Low",
        "maturity_days": "110 - 125 days",
        "drought_tolerance": "High",
        "root_zone_depth_cm": "80 - 110 cm taproot",
        "rainfall_preference": RainfallCondition.LOW,
        "aquifer_impact": "Positive / Low Draw",
        "yield_potential": "18 - 22 quintals/ha",
        "description": "High edible oil cash return with modest water demand. Ideal rabi crop under declining groundwater tables.",
        "farmer_notes": "Requires only 25% of irrigation needed for wheat. Fast canopy closure suppresses weeds.",
    },
    {
        "crop_id": "crop-moong",
        "crop_name": "Green Gram / Moong",
        "local_name": "मूंग दाल",
        "category": "Pulses & Legumes",
        "seasons": [CropSeason.ZAID, CropSeason.KHARIF],
        "suitable_soils": [SoilType.ALLUVIAL, SoilType.LOAMY, SoilType.RED, SoilType.BLACK],
        "water_requirement_mm": 270,
        "water_demand_tier": "Low",
        "maturity_days": "55 - 65 days",
        "drought_tolerance": "High",
        "root_zone_depth_cm": "60 - 80 cm",
        "rainfall_preference": RainfallCondition.NORMAL,
        "aquifer_impact": "Positive / Low Draw",
        "yield_potential": "12 - 16 quintals/ha",
        "description": "Ultra-short duration (60 days) pulse that fits seamlessly between main cropping seasons while conserving groundwater.",
        "farmer_notes": "Replaces water-hungry summer maize. Enriches soil with 35-40 kg N/ha.",
    },
    {
        "crop_id": "crop-jowar",
        "crop_name": "Sorghum (Jowar)",
        "local_name": "ज्वार",
        "category": "Millets & Coarse Cereals",
        "seasons": [CropSeason.KHARIF, CropSeason.RABI],
        "suitable_soils": [SoilType.BLACK, SoilType.RED, SoilType.LOAMY, SoilType.CLAY],
        "water_requirement_mm": 450,
        "water_demand_tier": "Medium",
        "maturity_days": "100 - 110 days",
        "drought_tolerance": "High",
        "root_zone_depth_cm": "100 - 130 cm",
        "rainfall_preference": RainfallCondition.NORMAL,
        "aquifer_impact": "Balanced",
        "yield_potential": "30 - 38 quintals/ha",
        "description": "High heat endurance and resilient root mass. Excellent dual-purpose grain and green fodder.",
        "farmer_notes": "Performs well in deep black soils. 50% less water required compared to puddled rice.",
    },
    {
        "crop_id": "crop-groundnut",
        "crop_name": "Groundnut / Peanut (Mungphali)",
        "local_name": "मूंगफली",
        "category": "Oilseeds",
        "seasons": [CropSeason.KHARIF, CropSeason.ZAID],
        "suitable_soils": [SoilType.SANDY, SoilType.RED, SoilType.LOAMY, SoilType.ALLUVIAL],
        "water_requirement_mm": 500,
        "water_demand_tier": "Medium",
        "maturity_days": "105 - 120 days",
        "drought_tolerance": "Moderate",
        "root_zone_depth_cm": "70 - 90 cm",
        "rainfall_preference": RainfallCondition.NORMAL,
        "aquifer_impact": "Balanced",
        "yield_potential": "22 - 28 quintals/ha",
        "description": "Valuable cash crop well-suited for sandy and light red soils with moderate seasonal irrigation availability.",
        "farmer_notes": "Requires well-drained topsoil for pegging. Avoid heavy cracking clay.",
    },
    {
        "crop_id": "crop-wheat",
        "crop_name": "Wheat (Semi-Dwarf Varieties)",
        "local_name": "गेहूं",
        "category": "Cereals",
        "seasons": [CropSeason.RABI],
        "suitable_soils": [SoilType.ALLUVIAL, SoilType.LOAMY, SoilType.CLAY, SoilType.BLACK],
        "water_requirement_mm": 550,
        "water_demand_tier": "Medium-High",
        "maturity_days": "125 - 140 days",
        "drought_tolerance": "Moderate",
        "root_zone_depth_cm": "80 - 100 cm",
        "rainfall_preference": RainfallCondition.NORMAL,
        "aquifer_impact": "High Depletion",
        "yield_potential": "45 - 55 quintals/ha",
        "description": "Staple foodgrain viable under moderate to abundant water, requiring 4-5 timed irrigations.",
        "farmer_notes": "In water-stressed zones, shift to mustard or gram to save 40% groundwater.",
    },
    {
        "crop_id": "crop-paddy-dsr",
        "crop_name": "Direct Seeded Rice (DSR / Tar-Watter)",
        "local_name": "सीधी बिजाई वाला धान",
        "category": "Cereals",
        "seasons": [CropSeason.KHARIF],
        "suitable_soils": [SoilType.ALLUVIAL, SoilType.LOAMY, SoilType.CLAY],
        "water_requirement_mm": 850,
        "water_demand_tier": "Medium-High",
        "maturity_days": "120 - 135 days",
        "drought_tolerance": "Moderate",
        "root_zone_depth_cm": "50 - 70 cm",
        "rainfall_preference": RainfallCondition.HIGH,
        "aquifer_impact": "Balanced",
        "yield_potential": "55 - 65 quintals/ha",
        "description": "Water-saving alternative to flooded rice. Saves 25-30% groundwater and eliminates continuous puddled flooding.",
        "farmer_notes": "Saves ~350,000 liters water/acre compared to flooded transplantation.",
    },
    {
        "crop_id": "crop-cotton",
        "crop_name": "Cotton (Bt Hybrid)",
        "local_name": "कपास",
        "category": "Commercial Fiber",
        "seasons": [CropSeason.KHARIF],
        "suitable_soils": [SoilType.BLACK, SoilType.ALLUVIAL, SoilType.LOAMY],
        "water_requirement_mm": 700,
        "water_demand_tier": "Medium-High",
        "maturity_days": "150 - 180 days",
        "drought_tolerance": "Moderate",
        "root_zone_depth_cm": "100 - 150 cm deep taproot",
        "rainfall_preference": RainfallCondition.NORMAL,
        "aquifer_impact": "Moderate-High Depletion",
        "yield_potential": "25 - 32 quintals/ha",
        "description": "Major commercial cash crop suited to deep black soils with deep rooting profile.",
        "farmer_notes": "Deep taproot extracts subsoil reserves; benefit greatly from drip fertigation.",
    },
    {
        "crop_id": "crop-flood-paddy",
        "crop_name": "Puddled Flood Paddy (Traditional)",
        "local_name": "पारंपरिक धान (बाढ़ सिंचाई)",
        "category": "High Water Cereals",
        "seasons": [CropSeason.KHARIF],
        "suitable_soils": [SoilType.CLAY, SoilType.ALLUVIAL],
        "water_requirement_mm": 1500,
        "water_demand_tier": "Very High",
        "maturity_days": "130 - 145 days",
        "drought_tolerance": "Very Low",
        "root_zone_depth_cm": "30 - 45 cm",
        "rainfall_preference": RainfallCondition.HIGH,
        "aquifer_impact": "Severe Depletion Risk",
        "yield_potential": "50 - 60 quintals/ha",
        "description": "Continuous puddled flooding consumes immense groundwater (1500mm), creating rapid cones of depression in declining aquifers.",
        "farmer_notes": "Not recommended under stressed aquifers. High risk of borewell cavitation.",
    },
    {
        "crop_id": "crop-sugarcane",
        "crop_name": "Sugarcane (Perennial)",
        "local_name": "गन्ना",
        "category": "High Water Cash Crops",
        "seasons": [CropSeason.YEAR_ROUND, CropSeason.KHARIF, CropSeason.RABI],
        "suitable_soils": [SoilType.ALLUVIAL, SoilType.BLACK, SoilType.CLAY],
        "water_requirement_mm": 2200,
        "water_demand_tier": "Very High",
        "maturity_days": "360 - 400 days",
        "drought_tolerance": "Very Low",
        "root_zone_depth_cm": "100 - 150 cm",
        "rainfall_preference": RainfallCondition.HIGH,
        "aquifer_impact": "Severe Depletion Risk",
        "yield_potential": "800 - 1100 quintals/ha",
        "description": "Year-round high water demand triggers acute local aquifer deficits and soil compaction in water-stressed blocks.",
        "farmer_notes": "Requires 25-30 irrigations per year. Strongly discourage under falling groundwater trends.",
    },
    {
        "crop_id": "crop-summer-maize",
        "crop_name": "Summer Fodder Maize (Heavy Flood)",
        "local_name": "गर्मी का मक्का",
        "category": "High Water Cereals",
        "seasons": [CropSeason.ZAID],
        "suitable_soils": [SoilType.ALLUVIAL, SoilType.LOAMY],
        "water_requirement_mm": 750,
        "water_demand_tier": "High",
        "maturity_days": "75 - 85 days",
        "drought_tolerance": "Low",
        "root_zone_depth_cm": "70 - 90 cm",
        "rainfall_preference": RainfallCondition.NORMAL,
        "aquifer_impact": "High Depletion",
        "yield_potential": "35 - 45 quintals/ha",
        "description": "Extreme summer evapotranspiration forces rapid tube-well pumping right before the monsoon recharge window.",
        "farmer_notes": "Rapidly depletes pre-monsoon water tables. Moong is a far safer zaid pulse alternative.",
    },
]


# ==========================================
# 3. Hydro-Agronomic Recommendation Engine
# ==========================================

class HydroAgronomicCropEngine:
    """
    Groundwater-Aware Crop Recommendation & Decision Support Engine.
    Converts multi-factor farm parameters into explainable, deterministic agronomic rankings.
    """

    def __init__(self):
        self.catalog = CROP_CATALOGUE_DATA

    def get_catalog(self) -> CropCatalogResponse:
        """Returns full crop profile database."""
        profiles = [
            CropProfileResponse(
                crop_id=c["crop_id"],
                crop_name=c["crop_name"],
                local_name=c["local_name"],
                category=c["category"],
                seasons=c["seasons"],
                suitable_soils=c["suitable_soils"],
                water_requirement_mm=c["water_requirement_mm"],
                water_demand_tier=c["water_demand_tier"],
                maturity_days=c["maturity_days"],
                drought_tolerance=c["drought_tolerance"],
                root_zone_depth_cm=c["root_zone_depth_cm"],
                rainfall_preference=c["rainfall_preference"],
                aquifer_impact=c["aquifer_impact"],
                yield_potential=c["yield_potential"],
                description=c["description"],
                farmer_notes=c["farmer_notes"],
            )
            for c in self.catalog
        ]
        return CropCatalogResponse(
            crops=profiles,
            total_crops=len(profiles),
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def get_methodology(self) -> CropMethodologyResponse:
        """Returns scoring methodology, weights, and limits."""
        return CropMethodologyResponse(
            scoring_weights=SCORING_WEIGHTS,
            tier_thresholds=TIER_THRESHOLDS,
            supported_soils=[s.value for s in SoilType],
            supported_seasons=[s.value for s in CropSeason],
            supported_water_levels=[w.value for w in WaterAvailabilityLevel],
            supported_rainfall_conditions=[r.value for r in RainfallCondition],
            limitations=[
                "Deterministic demonstration model based on agro-climatic zones and DWLR trajectory.",
                "Actual field yields depend on seed variety, fertilizer application, pest pressure, and micro-climate.",
                "Irrigation demand estimates do not replace on-farm soil moisture sensor calibration.",
            ],
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def _resolve_groundwater_context(
        self,
        state: str,
        district: str,
        station_id: Optional[str] = None,
    ) -> Tuple[GroundwaterContext, Optional[DWLRStationSchema]]:
        """Extracts groundwater metrics from matching station or district/state aggregation."""
        if station_id:
            st = station_repo.get_by_id(station_id)
            if not st:
                raise KeyError(f"DWLR Station '{station_id}' not found.")
            crit_pct = 100.0 if st.status == StationStatus.CRITICAL else 0.0
            forecast_desc = (
                f"Station {st.id} shows {st.trend.value} trajectory with {st.waterLevel:.1f}m depth "
                f"(Risk Score: {st.riskScore:.2f})."
            )
            ctx = GroundwaterContext(
                station_count_used=1,
                station_id=st.id,
                station_name=st.stationName,
                average_depth_mbgl=st.waterLevel,
                average_risk_score=st.riskScore,
                dominant_trend=st.trend.value,
                critical_station_percentage=crit_pct,
                forecast_context=forecast_desc,
            )
            return ctx, st

        # Aggregate across district/state
        matching = station_repo.filter_stations(state=state, district=district)
        if not matching:
            matching = station_repo.filter_stations(state=state)
        if not matching:
            matching = station_repo.get_all()

        count = len(matching)
        avg_depth = round(sum(s.waterLevel for s in matching) / count, 2)
        avg_risk = round(sum(s.riskScore for s in matching) / count, 2)

        trend_counts = defaultdict(int)
        crit_count = 0
        for s in matching:
            trend_counts[s.trend] += 1
            if s.status == StationStatus.CRITICAL:
                crit_count += 1

        dom_trend = max(trend_counts.items(), key=lambda i: i[1])[0].value if trend_counts else "stable"
        crit_pct = round((crit_count / count) * 100.0, 1)

        forecast_desc = (
            f"Regional baseline across {count} observation wells in {district or state}: "
            f"Average depth {avg_depth:.1f}m mbgl, {crit_pct}% critical wells, dominant trend: {dom_trend}."
        )

        ctx = GroundwaterContext(
            station_count_used=count,
            station_id=None,
            station_name=None,
            average_depth_mbgl=avg_depth,
            average_risk_score=avg_risk,
            dominant_trend=dom_trend,
            critical_station_percentage=crit_pct,
            forecast_context=forecast_desc,
        )
        return ctx, None

    def _score_crop(
        self,
        crop: Dict[str, Any],
        request: CropRecommendationRequest,
        gw_ctx: GroundwaterContext,
    ) -> Tuple[CropScoringBreakdown, List[str], str]:
        """Calculates component scores (0-100) and weighted overall score."""
        req_soil = request.soil_type
        req_season = request.season
        req_water = request.water_availability
        req_rain = request.rainfall_condition

        # ----------------------------------------------------
        # 1. Soil Compatibility Score (25%)
        # ----------------------------------------------------
        if req_soil in crop["suitable_soils"]:
            soil_score = 95.0
        else:
            soil_score = 35.0

        # ----------------------------------------------------
        # 2. Water Availability Match (25%)
        # ----------------------------------------------------
        w_mm = crop["water_requirement_mm"]
        if req_water == WaterAvailabilityLevel.STRESSED:
            if w_mm <= 350:
                water_score = 98.0
            elif w_mm <= 500:
                water_score = 65.0
            elif w_mm <= 800:
                water_score = 30.0
            else:
                water_score = 10.0
        elif req_water == WaterAvailabilityLevel.LIMITED:
            if w_mm <= 400:
                water_score = 94.0
            elif w_mm <= 600:
                water_score = 75.0
            elif w_mm <= 900:
                water_score = 45.0
            else:
                water_score = 15.0
        elif req_water == WaterAvailabilityLevel.MODERATE:
            if w_mm <= 700:
                water_score = 90.0
            elif w_mm <= 1000:
                water_score = 78.0
            else:
                water_score = 40.0
        else:  # ABUNDANT
            if w_mm >= 800:
                water_score = 92.0
            else:
                water_score = 85.0

        # ----------------------------------------------------
        # 3. Season Compatibility (15%)
        # ----------------------------------------------------
        if req_season in crop["seasons"] or CropSeason.YEAR_ROUND in crop["seasons"]:
            season_score = 96.0
        else:
            season_score = 15.0  # Heavily penalize out-of-season

        # ----------------------------------------------------
        # 4. Rainfall Match (15%)
        # ----------------------------------------------------
        crop_rain = crop["rainfall_preference"]
        if req_rain == crop_rain:
            rain_score = 95.0
        elif (req_rain == RainfallCondition.NORMAL and crop_rain == RainfallCondition.LOW) or (
            req_rain == RainfallCondition.HIGH and crop_rain == RainfallCondition.NORMAL
        ):
            rain_score = 80.0
        elif req_rain == RainfallCondition.LOW and crop_rain == RainfallCondition.HIGH:
            rain_score = 25.0
        else:
            rain_score = 65.0

        # ----------------------------------------------------
        # 5. Groundwater Trend & Trajectory Factor (20%)
        # ----------------------------------------------------
        trend = gw_ctx.dominant_trend.lower()
        depth = gw_ctx.average_depth_mbgl
        risk = gw_ctx.average_risk_score

        if "falling" in trend or risk >= 0.70:
            if w_mm <= 350:
                gw_score = 98.0
            elif w_mm <= 550:
                gw_score = 70.0
            elif w_mm <= 850:
                gw_score = 35.0
            else:
                gw_score = 10.0
        elif "rising" in trend:
            if w_mm <= 700:
                gw_score = 92.0
            else:
                gw_score = 78.0
        else:  # Stable
            if w_mm <= 600:
                gw_score = 88.0
            elif w_mm <= 900:
                gw_score = 72.0
            else:
                gw_score = 45.0

        # High depth penalty (if mbgl > 25m)
        if depth >= 25.0 and w_mm >= 800:
            gw_score = max(5.0, gw_score - 20.0)

        # ----------------------------------------------------
        # Weighted Overall Score (0–100)
        # ----------------------------------------------------
        overall = (
            SCORING_WEIGHTS["soil_compatibility"] * soil_score
            + SCORING_WEIGHTS["water_availability_match"] * water_score
            + SCORING_WEIGHTS["season_compatibility"] * season_score
            + SCORING_WEIGHTS["rainfall_match"] * rain_score
            + SCORING_WEIGHTS["groundwater_trend"] * gw_score
        )

        # Adjust for optional farmer priority
        if request.farmer_priority == "Water Saving":
            if w_mm <= 350:
                overall = min(100.0, overall + 3.0)
            elif w_mm >= 800:
                overall = max(0.0, overall - 5.0)
        elif request.farmer_priority == "Yield" and req_water in [WaterAvailabilityLevel.MODERATE, WaterAvailabilityLevel.ABUNDANT]:
            if w_mm >= 600:
                overall = min(100.0, overall + 3.0)

        overall_score = round(max(0.0, min(100.0, overall)), 1)

        breakdown = CropScoringBreakdown(
            soil_score=round(soil_score, 1),
            water_score=round(water_score, 1),
            season_score=round(season_score, 1),
            rainfall_score=round(rain_score, 1),
            groundwater_score=round(gw_score, 1),
            overall_score=overall_score,
        )

        # Generate contextual reasons
        reasons = []
        if water_score >= 85:
            reasons.append(f"Low water footprint ({w_mm}mm) aligns perfectly with {req_water.value} water availability.")
        elif water_score <= 40:
            reasons.append(f"Water requirement ({w_mm}mm) exerts high pressure on {req_water.value} water supply.")

        if soil_score >= 85:
            reasons.append(f"{req_soil.value} soil provides optimal drainage and root aeration for {crop['crop_name']}.")
        else:
            reasons.append(f"{req_soil.value} soil is sub-optimal for this crop's root architecture.")

        if "falling" in trend:
            if w_mm <= 400:
                reasons.append("Falling regional groundwater trend strongly favors this water-efficient crop.")
            else:
                reasons.append("Falling groundwater trend increases tube-well pumping risk for high-water crops.")
        elif "rising" in trend:
            reasons.append("Active seasonal aquifer recharge supports healthy crop establishment.")

        if season_score >= 85:
            reasons.append(f"Current {req_season.value} season matches standard sowing calendar.")

        advice = f"Recommended sowing window for {req_season.value}. Follow scheduled micro-irrigation to maximize crop water-use efficiency."

        return breakdown, reasons, advice

    def evaluate_recommendations(
        self,
        request: CropRecommendationRequest,
    ) -> CropRecommendationResponse:
        """Evaluates all catalogue crops, sorts by score, and produces top 3 + not-recommended lists."""
        gw_ctx, _ = self._resolve_groundwater_context(request.state, request.district, request.station_id)

        all_scored: List[Tuple[Dict[str, Any], CropScoringBreakdown, List[str], str]] = []
        for crop in self.catalog:
            scores, reasons, advice = self._score_crop(crop, request, gw_ctx)
            all_scored.append((crop, scores, reasons, advice))

        # Sort descending by overall_score
        all_scored.sort(key=lambda item: (-item[1].overall_score, item[0]["water_requirement_mm"]))

        # Build top recommendations
        top_recs: List[CropRecommendation] = []
        all_evaluated: List[CropRecommendation] = []

        area_acres = request.farm_area_acres

        for idx, (crop, scores, reasons, advice) in enumerate(all_scored, start=1):
            score_val = scores.overall_score
            tier = (
                "Excellent"
                if score_val >= 85
                else "Good"
                if score_val >= 70
                else "Moderate"
                if score_val >= 50
                else "Poor"
                if score_val >= 35
                else "Not Recommended"
            )

            # Calculate estimated water volume if farm area is provided
            est_vol_m3 = None
            if area_acres and area_acres > 0:
                # 1 acre = 4046.86 m2. 1 mm = 0.001 m.
                base_m3 = area_acres * 4046.86 * (crop["water_requirement_mm"] / 1000.0)
                # Adjust for irrigation method
                if request.irrigation_method == "Drip":
                    base_m3 *= 0.70  # 30% savings
                elif request.irrigation_method == "Sprinkler":
                    base_m3 *= 0.85  # 15% savings
                est_vol_m3 = round(base_m3, 1)

            rec_obj = CropRecommendation(
                rank=idx,
                crop_id=crop["crop_id"],
                crop_name=crop["crop_name"],
                local_name=crop["local_name"],
                overall_score=score_val,
                tier=tier,
                water_requirement_mm=crop["water_requirement_mm"],
                maturity_days=crop["maturity_days"],
                scores=scores,
                aquifer_impact=crop["aquifer_impact"],
                reasons=reasons,
                farmer_advice=advice,
                estimated_water_demand_m3=est_vol_m3,
            )
            all_evaluated.append(rec_obj)
            if len(top_recs) < 3 and score_val >= 50:
                top_recs.append(rec_obj)

        # Build not-recommended crops list
        not_recommended: List[NotRecommendedCrop] = []
        for crop, scores, reasons, _ in all_scored:
            w_mm = crop["water_requirement_mm"]
            is_stressed = request.water_availability in [WaterAvailabilityLevel.STRESSED, WaterAvailabilityLevel.LIMITED]
            is_heavy_water = w_mm >= 750
            is_out_of_season = request.season not in crop["seasons"] and CropSeason.YEAR_ROUND not in crop["seasons"]

            if scores.overall_score < 45 or (is_stressed and is_heavy_water) or is_out_of_season:
                if is_out_of_season:
                    reason_msg = f"{crop['crop_name']} is an out-of-season crop for {request.season.value}."
                    warn_msg = f"Sowing outside the recommended {', '.join([s.value for s in crop['seasons']])} window leads to temperature stress and poor germination."
                elif is_stressed and is_heavy_water:
                    reason_msg = (
                        f"{crop['crop_name']} is not recommended under the current {request.water_availability.value} "
                        f"water scenario because its high water requirement ({w_mm}mm) creates excessive aquifer deficit."
                    )
                    warn_msg = "Continuous tube-well pumping for high-water crops risks pump suction loss and borewell failure."
                else:
                    reason_msg = f"Low suitability score ({scores.overall_score}/100) due to soil or rainfall mismatch."
                    warn_msg = "Consider switching to one of the top recommended drought-hardy pulses or millets."

                not_recommended.append(
                    NotRecommendedCrop(
                        crop_id=crop["crop_id"],
                        crop_name=crop["crop_name"],
                        local_name=crop["local_name"],
                        overall_score=scores.overall_score,
                        water_requirement_mm=w_mm,
                        aquifer_impact=crop["aquifer_impact"],
                        reason=reason_msg,
                        farmer_warning=warn_msg,
                    )
                )

        farm_prof_dict = {
            "state": request.state,
            "district": request.district,
            "station_id": request.station_id,
            "soil_type": request.soil_type.value,
            "season": request.season.value,
            "rainfall_condition": request.rainfall_condition.value,
            "water_availability": request.water_availability.value,
            "farm_area_acres": request.farm_area_acres,
            "irrigation_method": request.irrigation_method,
            "farmer_priority": request.farmer_priority,
        }

        methodology_summary = (
            "Multi-factor hydro-agronomic scoring based on Soil (25%), Water Availability (25%), "
            "Season (15%), Rainfall Outlook (15%), and Groundwater Trajectory (20%)."
        )

        return CropRecommendationResponse(
            farm_profile=farm_prof_dict,
            groundwater_context=gw_ctx,
            top_recommendations=top_recs,
            not_recommended=not_recommended,
            all_evaluated_crops=all_evaluated,
            scoring_weights=SCORING_WEIGHTS,
            methodology=methodology_summary,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )

    def compare_crops(
        self,
        request: CropComparisonRequest,
    ) -> CropComparisonResponse:
        """Performs side-by-side hydro-agronomic scoring and water demand comparison for specified crop IDs."""
        rec_req = CropRecommendationRequest(
            state=request.state,
            district=request.district,
            station_id=request.station_id,
            soil_type=request.soil_type,
            season=request.season,
            rainfall_condition=request.rainfall_condition,
            water_availability=request.water_availability,
            farm_area_acres=request.farm_area_acres,
            irrigation_method=request.irrigation_method,
        )

        gw_ctx, _ = self._resolve_groundwater_context(request.state, request.district, request.station_id)

        crop_map = {c["crop_id"]: c for c in self.catalog}
        rows: List[CropComparisonRow] = []

        area_acres = request.farm_area_acres

        for cid in request.crop_ids:
            crop = crop_map.get(cid)
            if not crop:
                continue

            scores, _, _ = self._score_crop(crop, rec_req, gw_ctx)
            score_val = scores.overall_score
            tier = (
                "Excellent"
                if score_val >= 85
                else "Good"
                if score_val >= 70
                else "Moderate"
                if score_val >= 50
                else "Poor"
                if score_val >= 35
                else "Not Recommended"
            )

            est_vol_m3 = None
            if area_acres and area_acres > 0:
                base_m3 = area_acres * 4046.86 * (crop["water_requirement_mm"] / 1000.0)
                if request.irrigation_method == "Drip":
                    base_m3 *= 0.70
                elif request.irrigation_method == "Sprinkler":
                    base_m3 *= 0.85
                est_vol_m3 = round(base_m3, 1)

            rows.append(
                CropComparisonRow(
                    crop_id=crop["crop_id"],
                    crop_name=crop["crop_name"],
                    local_name=crop["local_name"],
                    water_requirement_mm=crop["water_requirement_mm"],
                    maturity_days=crop["maturity_days"],
                    yield_potential=crop["yield_potential"],
                    drought_tolerance=crop["drought_tolerance"],
                    aquifer_impact=crop["aquifer_impact"],
                    overall_score=score_val,
                    tier=tier,
                    scores=scores,
                    estimated_water_demand_m3=est_vol_m3,
                )
            )

        rows.sort(key=lambda r: -r.overall_score)

        return CropComparisonResponse(
            comparisons=rows,
            total_compared=len(rows),
            groundwater_context=gw_ctx,
            data_mode=settings.DATA_MODE,
            disclaimer=settings.DEMO_DISCLAIMER,
        )


crop_engine = HydroAgronomicCropEngine()
