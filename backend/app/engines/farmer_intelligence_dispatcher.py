"""
JalKrishi AI — Farmer Intelligence Dispatcher
------------------------------------------------
Dispatches classified farmer intents to their dedicated intent-specific intelligence engines.
Prevents non-groundwater queries (weather, crop recommendation, irrigation advice, recharge guidance)
from being forced through groundwater location assessments.
"""

from typing import Dict, List, Optional, Tuple, Any
from app.config import settings
from app.models.schemas import (
    VoiceQueryRequest,
    VoiceQueryResponse,
    LocationInfoSchema,
    CoverageInfoSchema,
    GroundwaterLevelSchema,
    ProvenanceInfoSchema,
    SoilType,
    CropSeason,
    WaterAvailabilityLevel,
    RainfallCondition,
    CropRecommendationRequest,
)
from app.engines.farmer_intent_router import farmer_intent_router, IntentClassificationResult
from app.engines.farmer_intelligence import farmer_intelligence_engine
from app.engines.crop_recommender import crop_engine, CROP_CATALOGUE_DATA
from app.engines.satellite_groundwater import satellite_groundwater_engine, rainfall_adapter
from app.engines.proactive_intelligence import proactive_intelligence_engine
from app.pipeline.dwlr_ingest import station_repo
from app.services.speech.multilingual_service import (
    SUPPORTED_LANGUAGES,
    LanguageDetector,
    stt_provider,
    tts_provider,
    hydro_translator,
)
from app.pipeline.location_resolver import resolve_location, LocationResolution


class FarmerIntelligenceDispatcher:
    """Central Dispatcher orchestrating intent-specific responses."""

    def dispatch_query(
        self,
        request: VoiceQueryRequest,
        session_id: str = "default"
    ) -> VoiceQueryResponse:
        raw_query = request.query.strip() if request.query else ""

        # 1. Language Resolution
        detected_lang = LanguageDetector.detect_language(raw_query, default=request.language or "en")
        target_lang = request.language if request.language in [l.language_code for l in SUPPORTED_LANGUAGES] else detected_lang

        # Context location seed if provided in request
        if request.context_location:
            c_loc = resolve_location(query_text=request.context_location)
            if c_loc.is_resolved:
                farmer_intent_router.get_context(session_id).last_location = c_loc

        # 2. Intent Classification
        intent_res = farmer_intent_router.classify_intent(
            raw_query,
            language=target_lang,
            session_id=session_id,
            location_query=request.location_query,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        intent = intent_res.intent

        # 3. Branch: CONVERSATIONAL Mode
        if intent_res.response_type == "CONVERSATIONAL":
            loc_name = intent_res.extracted_location.name if intent_res.extracted_location else None
            conv_text = farmer_intent_router.generate_conversational_response(
                intent=intent,
                lang=target_lang,
                user_name=intent_res.extracted_name,
                location_name=loc_name
            )
            audio_url, tts_status = tts_provider.synthesize(conv_text, target_lang)
            loc_info = None
            if intent_res.extracted_location and intent_res.extracted_location.is_resolved:
                loc_info = LocationInfoSchema(
                    name=intent_res.extracted_location.name,
                    district=intent_res.extracted_location.district,
                    state=intent_res.extracted_location.state,
                    latitude=intent_res.extracted_location.latitude or 0.0,
                    longitude=intent_res.extracted_location.longitude or 0.0,
                )
            return VoiceQueryResponse(
                query_text=raw_query or "Spoken Voice Query",
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL" if not intent_res.pending_intent else intent,
                response_type="CONVERSATIONAL",
                text_response=conv_text,
                intelligence=None,
                location=loc_info,
                coverage=None,
                groundwater=None,
                provenance=None,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                translation_provider_status="LOCAL_CORE_TRANSLATIONS",
                data_mode=settings.DATA_MODE,
                disclaimer="Conversational Assistant: Responding to farmer dialog query.",
                location_required=intent_res.location_required,
                awaiting_location=intent_res.awaiting_location,
                pending_intent=intent_res.pending_intent,
            )

        # 4. Location Resolution for INTELLIGENCE Mode
        # Only extract location if explicitly present or resolved from conversational context
        loc_res = intent_res.extracted_location or resolve_location(
            location_query=request.location_query,
            query_text=raw_query,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        if not (loc_res and loc_res.is_resolved) and not request.location_query:
            loc_res = farmer_intent_router.get_context(session_id).last_location

        loc_info = None
        if loc_res and loc_res.is_resolved and loc_res.name:
            loc_info = LocationInfoSchema(
                name=loc_res.name,
                district=loc_res.district,
                state=loc_res.state,
                latitude=loc_res.latitude,
                longitude=loc_res.longitude,
            )

        # ----------------------------------------------------------------------
        # A. WEATHER_OR_RAINFALL INTENT
        # ----------------------------------------------------------------------
        if intent == "WEATHER_OR_RAINFALL":
            if not loc_info:
                text_resp = self._format_multilingual_no_location_weather(target_lang)
                audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="WEATHER",
                    response_type="CONVERSATIONAL",
                    text_response=text_resp,
                    intelligence=None,
                    location=None,
                    location_required=True,
                    awaiting_location=True,
                    pending_intent="WEATHER_OR_RAINFALL",
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Weather Assessment: Requires location context.",
                )

            # Dynamically compute precipitation signals from location coordinates
            rain_30d_mm, prob_pct, rain_condition = rainfall_adapter.fetch_weather_signals(
                loc_info.latitude, loc_info.longitude
            )
            recharge_pot = (
                "HIGH_RECHARGE_POTENTIAL" if rain_30d_mm >= 100.0
                else "MODERATE_RECHARGE_POTENTIAL" if rain_30d_mm >= 45.0
                else "LOW_RECHARGE_POTENTIAL"
            )

            weather_data = {
                "location": loc_info.name,
                "precipitation_mm": rain_30d_mm,
                "monsoon_status": "ACTIVE_SOUTHWEST_MONSOON",
                "recharge_potential": recharge_pot,
                "rainfall_condition": rain_condition,
                "rain_probability_pct": prob_pct,
                "provider_status": "REFERENCE_SIMULATION"
            }

            text_resp = self._format_multilingual_weather_response(loc_info, weather_data, target_lang)
            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="WEATHER",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                intelligence=None,
                location=loc_info,
                weather_info=weather_data,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Weather Assessment: Derived from JalKrishi Hydro-Meteorological Reference Simulation. Live IMD/Weather API is NOT_CONFIGURED.",
            )

        # ----------------------------------------------------------------------
        # B. CROP_RECOMMENDATION INTENT
        # ----------------------------------------------------------------------
        if intent == "CROP_RECOMMENDATION":
            if not loc_info:
                text_resp = "Please add your farm location before asking for crop advice."
                return VoiceQueryResponse(
                    query_text=raw_query, detected_language=detected_lang,
                    farmer_response_language=target_lang, intent=intent,
                    intent_category="CROP", response_type="CONVERSATIONAL",
                    text_response=text_resp, intelligence=None, location=None,
                    location_required=True, awaiting_location=True,
                    pending_intent="CROP_RECOMMENDATION",
                    disclaimer="Crop advice requires a resolved farm location.",
                )
            loc_name = loc_info.name if loc_info else "Your Farming Area"
            state_val = loc_info.state or ""
            district_val = loc_info.district or ""
            lat_val = loc_info.latitude
            lon_val = loc_info.longitude

            # Query groundwater intelligence to evaluate water availability
            gw_intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
                lat=lat_val, lon=lon_val, location_query=loc_name
            )
            stress_score = gw_intel.stress_score if gw_intel else 0.50
            w_level = (
                WaterAvailabilityLevel.STRESSED if stress_score > 0.70
                else WaterAvailabilityLevel.LIMITED if stress_score > 0.45
                else WaterAvailabilityLevel.MODERATE
            )

            # Evaluate crop recommendation dynamically
            crop_req = CropRecommendationRequest(
                state=state_val,
                district=district_val,
                soil_type=SoilType.BLACK if "black" in (gw_intel.crop_implications.lower() if gw_intel else "") else SoilType.LOAMY,
                season=CropSeason.RABI,
                water_availability=w_level,
                rainfall_condition=RainfallCondition.NORMAL,
            )
            rec_res = crop_engine.evaluate_recommendations(crop_req)

            top_rec = rec_res.top_recommendations[0] if rec_res.top_recommendations else None
            alt_rec = rec_res.top_recommendations[1] if len(rec_res.top_recommendations) > 1 else None

            primary_crop_name = top_rec.crop_name if top_rec else "Chickpea / Bengal Gram (Chana)"
            water_req = f"{top_rec.water_requirement_mm} mm" if top_rec else "280-350 mm"
            resilience_str = f"HIGH_DROUGHT_RESISTANCE (Score: {top_rec.overall_score})" if top_rec else "HIGH_DROUGHT_RESISTANCE"
            alt_crop_name = alt_rec.crop_name if alt_rec else "Pearl Millet (Bajra)"
            mat_days = top_rec.maturity_days if top_rec else "90-110 days"

            crop_data = {
                "location": loc_name,
                "primary_crop": primary_crop_name,
                "water_requirement_mm": water_req,
                "resilience": resilience_str,
                "alternate_crop": alt_crop_name,
                "maturity_days": mat_days,
                "water_demand_tier": top_rec.tier if top_rec else "Low",
            }

            text_resp = self._format_multilingual_crop_response(loc_name, crop_data, target_lang)
            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CROP",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                intelligence=None,
                location=loc_info,
                crop_info=crop_data,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Crop Recommendation: Driven by JalKrishi Hydro-Agronomic Decision Support Engine.",
            )

        # ----------------------------------------------------------------------
        # C. IRRIGATION_ADVICE INTENT
        # ----------------------------------------------------------------------
        if intent == "IRRIGATION_ADVICE":
            if not loc_info:
                text_resp = "Please add your farm location before asking for irrigation advice."
                return VoiceQueryResponse(
                    query_text=raw_query, detected_language=detected_lang,
                    farmer_response_language=target_lang, intent=intent,
                    intent_category="IRRIGATION", response_type="CONVERSATIONAL",
                    text_response=text_resp, intelligence=None, location=None,
                    location_required=True, awaiting_location=True,
                    pending_intent="IRRIGATION_ADVICE",
                    disclaimer="Irrigation advice requires a resolved farm location.",
                )
            loc_name = loc_info.name if loc_info else "Your Farming Area"
            lat_val = loc_info.latitude
            lon_val = loc_info.longitude

            gw_intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
                lat=lat_val, lon=lon_val, location_query=loc_name
            )
            stress_score = gw_intel.stress_score if gw_intel else 0.50

            if stress_score >= 0.70:
                rec_method = "Drip or Micro-Sprinkler Irrigation"
                depth_mm = 18
                interval_d = 4
                warn = "Aquifer under high stress: avoid flood irrigation to prevent 40-50% evaporative loss."
            elif stress_score >= 0.40:
                rec_method = "Drip Irrigation"
                depth_mm = 25
                interval_d = 5
                warn = "Moderate aquifer availability: irrigate during early morning or evening to minimize evaporation."
            else:
                rec_method = "Controlled Furrow or Drip Irrigation"
                depth_mm = 35
                interval_d = 7
                warn = "Healthy aquifer level: avoid over-irrigation to maintain optimal root aeration."

            irr_data = {
                "location": loc_name,
                "recommended_method": rec_method,
                "depth_per_application_mm": depth_mm,
                "interval_days": interval_d,
                "stress_score": stress_score,
                "efficiency_warning": warn,
            }

            text_resp = self._format_multilingual_irrigation_response(loc_name, irr_data, target_lang)
            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="IRRIGATION",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                intelligence=None,
                location=loc_info,
                irrigation_info=irr_data,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Irrigation Guidance: Driven by JalKrishi Precision Irrigation Engine.",
            )

        # ----------------------------------------------------------------------
        # D. RECHARGE_ADVICE INTENT
        # ----------------------------------------------------------------------
        if intent == "RECHARGE_ADVICE":
            if not loc_info:
                text_resp = "Please add your farm location before asking for recharge advice."
                return VoiceQueryResponse(
                    query_text=raw_query, detected_language=detected_lang,
                    farmer_response_language=target_lang, intent=intent,
                    intent_category="RECHARGE", response_type="CONVERSATIONAL",
                    text_response=text_resp, intelligence=None, location=None,
                    location_required=True, awaiting_location=True,
                    pending_intent="RECHARGE_ADVICE",
                    disclaimer="Recharge guidance requires a resolved farm location.",
                )
            loc_name = loc_info.name if loc_info else "Your Farming Area"
            state_str = (loc_info.state if loc_info and loc_info.state else "").lower()

            if any(s in state_str for s in ["punjab", "haryana", "uttar pradesh", "bihar", "bengal", "assam"]):
                rec_struct = "Recharge Shaft with Injection Well & Desilting Chamber"
                depth = 15.0
                boost_pct = "+14–20%"
            elif any(s in state_str for s in ["rajasthan", "gujarat"]):
                rec_struct = "Rooftop & Catchment Water Harvesting with Deep Infiltration Pit"
                depth = 8.0
                boost_pct = "+10–15%"
            elif any(s in state_str for s in ["himachal", "uttarakhand", "jammu", "kashmir", "ladakh"]):
                rec_struct = "Contour Trenches and Springshed Recharge Pits"
                depth = 2.5
                boost_pct = "+15–22%"
            else:
                # Deccan / Peninsular hard-rock (Karnataka, Maharashtra, Telangana, AP, Tamil Nadu, etc.)
                rec_struct = "Percolation Tank / Farm Pond with Injection Recharge Bore"
                depth = 4.5
                boost_pct = "+12–18%"

            rec_data = {
                "location": loc_name,
                "recommended_structure": rec_struct,
                "depth_m": depth,
                "estimated_annual_recharge_boost_pct": boost_pct,
            }

            text_resp = self._format_multilingual_recharge_response(loc_name, rec_data, target_lang)
            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="RECHARGE",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                intelligence=None,
                location=loc_info,
                recharge_info=rec_data,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Groundwater Recharge Guidance: Driven by JalKrishi Hydrogeological Modeling Engine.",
            )

        # ----------------------------------------------------------------------
        # E. GROUNDWATER & HYDROLOGICAL INTENTS (Modes A & B)
        # ----------------------------------------------------------------------
        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=loc_info.latitude if loc_info else request.latitude,
            lon=loc_info.longitude if loc_info else request.longitude,
            location_query=loc_info.name if loc_info else request.location_query,
            station_id=request.station_id,
            query_text=raw_query,
        )

        formatted_text = hydro_translator.format_farmer_response(
            intel=intel,
            target_lang=target_lang,
        )

        audio_url, tts_status = tts_provider.synthesize(formatted_text, target_lang)

        return VoiceQueryResponse(
            query_text=raw_query,
            detected_language=detected_lang,
            farmer_response_language=target_lang,
            intent=intent,
            intent_category="GROUNDWATER" if intent == "GROUNDWATER_LEVEL" else "FORECAST" if intent == "GROUNDWATER_FORECAST" else "DWLR" if intent == "DWLR_STATION" else "RISK",
            response_type="INTELLIGENCE",
            text_response=formatted_text,
            intelligence=intel,
            location=intel.location_info,
            coverage=intel.coverage_info,
            groundwater=intel.groundwater_info,
            provenance=intel.provenance_info,
            audio_url=audio_url,
            voice_playback_available=audio_url is not None,
            stt_provider_status=stt_provider.status,
            tts_provider_status=tts_status,
            translation_provider_status="LOCAL_CORE_TRANSLATIONS",
            data_mode=settings.DATA_MODE,
            disclaimer="Multilingual Voice Assistant: Driven by JalKrishi Unified Farmer Intelligence Engine.",
        )

    # --- Multilingual Helper Formatting ---
    def _format_multilingual_no_location_weather(self, lang: str) -> str:
        if lang == "hi":
            return "आप किस स्थान के लिए बारिश का अनुमान देखना चाहते हैं? (जैसे नासिक, पुणे, जयपुर, कोच्चि)"
        elif lang == "kn":
            return "ನೀವು ಯಾವ ಸ್ಥಳದ ಮಳೆ ಮುನ್ಸೂಚನೆಯನ್ನು ನೋಡಲು ಬಯಸುತ್ತೀರಿ? (ಉದಾ. ನಾಸಿಕ್, ಪುಣೆ, ಜೈಪುರ, ಕೊಚ್ಚಿ)"
        elif lang == "ta":
            return "எந்த இடத்திற்கான மழை முன்னறிவிப்பைப் பார்க்க விரும்புகிறீர்கள்? (எ.கா. நாசிக், புனே, ஜெய்ப்பூர், கொச்சி)"
        elif lang == "te":
            return "మీరు ఏ ప్రాంత వర్షపాతం అంచనా చూడాలనుకుంటున్నారు? (ఉదా. నాసిక్, పూణే, జైపూర్, కొచ్చి)"
        else:
            return "Which location would you like to check the rainfall outlook for? (e.g. Nashik, Pune, Jaipur, Kochi)"

    def _format_multilingual_weather_response(self, loc: LocationInfoSchema, w_data: Dict[str, Any], lang: str) -> str:
        rain_mm = w_data.get("precipitation_mm", 0.0)
        cond = w_data.get("rainfall_condition", "NORMAL")
        prob = int(w_data.get("rain_probability_pct", 50))
        pot = w_data.get("recharge_potential", "MODERATE_RECHARGE_POTENTIAL").replace("_", " ")

        if lang == "hi":
            return f"वर्षा अनुमान - {loc.name}, {loc.state or ''}: 30-दिवसीय वर्षा संदर्भ संकेत {rain_mm:.1f} मिमी वर्षा ({cond}, {prob}% संभावना) का अनुमान दर्शाता है। संभावित भूजल पुनर्भरण: {pot}। (ध्यान दें: मौसम डेटा जलकृषि संदर्भ सिमुलेशन पर आधारित है। लाइव IMD/मौसम एपीआई कॉन्फ़िगर नहीं है)।"
        elif lang == "kn":
            return f"ಮಳೆ ಮುನ್ಸೂಚನೆ - {loc.name}, {loc.state or ''}: 30-ದಿನಗಳ ಮಳೆ ಸೂಚಕವು {rain_mm:.1f} ಮಿಮೀ ಮಳೆಯನ್ನು ({cond}, {prob}% ಸಂಭವನೀಯತೆ) ಸೂಚಿಸುತ್ತದೆ. (ಸೂಚನೆ: ಹವಾಮಾನ ಡೇಟಾ ಜಲಕೃಷಿ ಉಲ್ಲೇಖ ಸಿಮ್ಯುಲೇಶನ್ ಆಧಾರಿತವಾಗಿದೆ)."
        elif lang == "ta":
            return f"மழை முன்னறிவிப்பு - {loc.name}, {loc.state or ''}: 30 நாட்கள் மழைக்காலக் குறியீடு {rain_mm:.1f} மிமீ மழையைக் காட்டுகிறது ({cond}, {prob}%). (குறிப்பு: வானிலை தரவு ஜல்க்ரிஷி குறிப்பு உருவகப்படுத்துதலை அடிப்படையாகக் கொண்டது)."
        elif lang == "te":
            return f"వర్షపాతం అంచనా - {loc.name}, {loc.state or ''}: 30 రోజుల వర్షపాతం సూచిక {rain_mm:.1f} మిమీ వర్షాన్ని ({cond}, {prob}%) సూచిస్తోంది. (గమనిక: వాతావరణ డేటా జల్‌కృషి సిమ్యులేషన్‌పై ఆధారపడి ఉంటుంది)."
        else:
            return f"Weather & Rainfall Outlook for {loc.name}, {loc.state or ''}: 30-day precipitation reference indicator shows {rain_mm:.1f} mm expected rainfall ({cond} condition, {prob}% probability, {pot}). Monsoon status: Active Southwest Monsoon. Note: Weather data is derived from JalKrishi Hydro-Meteorological Reference Simulation. Live IMD/Weather provider is NOT_CONFIGURED."

    def _format_multilingual_crop_response(self, loc_name: str, c_data: Dict[str, Any], lang: str) -> str:
        p_crop = c_data.get("primary_crop", "Finger Millet (Ragi)")
        w_req = c_data.get("water_requirement_mm", "350-450 mm")
        alt = c_data.get("alternate_crop", "Red Gram")
        mat = c_data.get("maturity_days", "100-115 days")

        if lang == "hi":
            return f"फसल सलाह - {loc_name}: अनुशंसित जल-कुशल फसल: {p_crop}। इसे कम पानी ({w_req}) की आवश्यकता होती है और यह {mat} में तैयार हो जाती है। वैकल्पिक फसल: {alt}।"
        elif lang == "kn":
            return f"ಬೆಳೆ ಸಲಹೆ - {loc_name}: ಶಿಫಾರಸು ಮಾಡಿದ ನೀರಿನ-ಸಮರ್ಥ ಬೆಳೆ: {p_crop}. ಇದಕ್ಕೆ ಕಡಿಮೆ ನೀರು ({w_req}) ಸಾಕು ಮತ್ತು {mat} ದಿನಗಳಲ್ಲಿ ಕೊಯ್ಲಿಗೆ ಬರುತ್ತದೆ. ಪರ್ಯಾಯ ಬೆಳೆ: {alt}."
        elif lang == "ta":
            return f"பயிர் ஆலோசனை - {loc_name}: பரிந்துரைக்கப்படும் பயிர்: {p_crop}. இதற்கு குறைந்த நீர் ({w_req}) போதுமானது. மாற்றுப் பயிர்: {alt}."
        elif lang == "te":
            return f"పంటల సూచన - {loc_name}: సిఫార్సు చేసిన పంట: {p_crop}. దీనికి తక్కువ నీరు ({w_req}) సరిపోతుంది. ప్రత్యామ్నాయ పంట: {alt}."
        else:
            return f"Water-Smart Crop Recommendation for {loc_name}: Primary recommended crop: {p_crop}. It requires {w_req} water, matures in {mat}, and provides high drought resilience. Alternate crop: {alt}."

    def _format_multilingual_irrigation_response(self, loc_name: str, irr_data: Dict[str, Any], lang: str) -> str:
        method = irr_data.get("recommended_method", "Drip Irrigation")
        depth = irr_data.get("depth_per_application_mm", 25)
        interval = irr_data.get("interval_days", 5)
        warn = irr_data.get("efficiency_warning", "")

        if lang == "hi":
            return f"सिंचाई सलाह - {loc_name}: अनुशंसित सिंचाई: {method} द्वारा प्रति {interval} दिन में {depth} मिमी पानी दें। {warn}"
        elif lang == "kn":
            return f"ನೀರಾವರಿ ಮಾರ್ಗದರ್ಶನ - {loc_name}: {method} ಮೂಲಕ ಪ್ರತಿ {interval} ದಿನಗಳಿಗೊಮ್ಮೆ {depth} ಮಿಮೀ ನೀರು ನೀಡಿ. {warn}"
        else:
            return f"Precision Irrigation Guidance for {loc_name}: Recommended irrigation schedule: Apply {depth} mm per application every {interval} days using {method}. {warn} Tip: Irrigate during early morning or evening to reduce evaporative loss."

    def _format_multilingual_recharge_response(self, loc_name: str, rec_data: Dict[str, Any], lang: str) -> str:
        struct = rec_data.get("recommended_structure", "Rainwater Harvesting")
        depth = rec_data.get("depth_m", 4.5)
        boost = rec_data.get("estimated_annual_recharge_boost_pct", "+12–18%")

        if lang == "hi":
            return f"भूजल रिचार्ज सलाह - {loc_name}: अनुशंसित संरचना: {struct} (गहराई: {depth} मीटर)। अनुमानित वार्षिक भूजल वृद्धि: {boost}।"
        elif lang == "kn":
            return f"ಅಂತರ್ಜಲ ಮರುಪೂರಣ ಸಲಹೆ - {loc_name}: ಶಿಫಾರಸು ರಚನೆ: {struct} (ಆಳ: {depth} ಮೀಟರ್). ಅಂದಾಜು ವಾರ್ಷಿಕ ಅಂತರ್ಜಲ ಹೆಚ್ಚಳ: {boost}."
        else:
            return f"Groundwater Recharge Guidance for {loc_name}: Recommended hydro-structure: {struct} (Depth: {depth} m). Expected annual aquifer replenishment boost: {boost}."


farmer_intelligence_dispatcher = FarmerIntelligenceDispatcher()
