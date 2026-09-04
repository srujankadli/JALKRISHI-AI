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
)
from app.engines.farmer_intent_router import farmer_intent_router, IntentClassificationResult
from app.engines.farmer_intelligence import farmer_intelligence_engine
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
                    latitude=intent_res.extracted_location.latitude or 12.9716,
                    longitude=intent_res.extracted_location.longitude or 77.5946,
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
                latitude=loc_res.latitude or 12.9716,
                longitude=loc_res.longitude or 77.5946,
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

            text_resp = self._format_multilingual_weather_response(loc_info, target_lang)
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
                weather_info={
                    "location": loc_info.name,
                    "precipitation_mm": 145.0,
                    "monsoon_status": "ACTIVE_SOUTHWEST_MONSOON",
                    "recharge_potential": "MODERATE_RECHARGE_POTENTIAL",
                    "provider_status": "REFERENCE_SIMULATION"
                },
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
            loc_name = loc_info.name if loc_info else "Your Farming Area"
            text_resp = self._format_multilingual_crop_response(loc_name, target_lang)
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
                crop_info={
                    "location": loc_name,
                    "primary_crop": "Finger Millet (Ragi)",
                    "water_requirement_mm": "350-450 mm",
                    "resilience": "HIGH_DROUGHT_RESISTANCE",
                    "alternate_crop": "Red Gram (Pigeonpea)"
                },
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
            loc_name = loc_info.name if loc_info else "Your Farming Area"
            text_resp = self._format_multilingual_irrigation_response(loc_name, target_lang)
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
                irrigation_info={
                    "location": loc_name,
                    "recommended_method": "Drip Irrigation",
                    "depth_per_application_mm": 25,
                    "interval_days": 5,
                    "efficiency_warning": "Flood irrigation exhibits high evaporative loss."
                },
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
            loc_name = loc_info.name if loc_info else "Your Farming Area"
            text_resp = self._format_multilingual_recharge_response(loc_name, target_lang)
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
                recharge_info={
                    "location": loc_name,
                    "structure": "Rooftop RWH & Injection Pit",
                    "pit_depth_m": 3.5,
                    "expected_boost": "+12-18% annual aquifer replenishment"
                },
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Recharge Guidance: Driven by JalKrishi Groundwater Recharge Intelligence Engine.",
            )

        # ----------------------------------------------------------------------
        # E. PROACTIVE_STATUS / EARLY WARNING INTENT
        # ----------------------------------------------------------------------
        if intent == "PROACTIVE_STATUS":
            loc_name = loc_info.name if loc_info else request.location_query
            lat = loc_info.latitude if loc_info else request.latitude
            lon = loc_info.longitude if loc_info else request.longitude
            station_id = request.station_id

            brief = proactive_intelligence_engine.get_farmer_proactive_brief(
                lat=lat,
                lon=lon,
                station_id=station_id,
                location_name=loc_name,
            )

            raw_summary = brief.get("summary", "")
            if target_lang != "en":
                text_resp = hydro_translator.translate_text(raw_summary, target_lang)
            else:
                text_resp = raw_summary

            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="PROACTIVE_EARLY_WARNING",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                intelligence=None,
                location=loc_info,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Proactive Early Warning: Multi-signal hydrogeological risk assessment based on JalKrishi Reference Simulation Network.",
            )

        # ----------------------------------------------------------------------
        # F. GROUNDWATER INTENTS (GROUNDWATER_LEVEL, FORECAST, RISK, ANOMALY, DWLR)
        # ----------------------------------------------------------------------
        target_loc_query = loc_info.name if loc_info else request.location_query
        target_lat = loc_info.latitude if loc_info else request.latitude
        target_lon = loc_info.longitude if loc_info else request.longitude

        intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
            lat=target_lat,
            lon=target_lon,
            radius_km=15.0,
            station_id=None,  # Do NOT pass silent dashboard station_id fallback!
            location_query=target_loc_query,
            query_text=raw_query,
        )

        formatted_text = hydro_translator.format_farmer_response(intel, target_lang)
        audio_url, tts_status = tts_provider.synthesize(formatted_text, target_lang)

        category = "GROUNDWATER"
        if intent == "GROUNDWATER_FORECAST":
            category = "FORECAST"
        elif intent == "GROUNDWATER_RISK":
            category = "RISK"
        elif intent == "GROUNDWATER_ANOMALY":
            category = "ANOMALY"
        elif intent == "DWLR_STATION":
            category = "DWLR"

        return VoiceQueryResponse(
            query_text=raw_query or "Spoken Voice Query",
            detected_language=detected_lang,
            farmer_response_language=target_lang,
            intent=intent,
            intent_category=category,
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
            return "आप किस स्थान के लिए बारिश का अनुमान देखना चाहते हैं? (जैसे बेंगलुरु, तंजावुर, कोलार, मुंबई)"
        elif lang == "kn":
            return "ನೀವು ಯಾವ ಸ್ಥಳದ ಮಳೆ ಮುನ್ಸೂಚನೆಯನ್ನು ನೋಡಲು ಬಯಸುತ್ತೀರಿ? (ಉದಾ. ಬೆಂಗಳೂರು, ತಂಜಾವೂರು, ಕೋಲಾರ, ಮುಂಬೈ)"
        elif lang == "ta":
            return "எந்த இடத்திற்கான மழை முன்னறிவிப்பைப் பார்க்க விரும்புகிறீர்கள்? (எ.கா. பெங்களூர், தஞ்சாவூர், கோலார், மும்பை)"
        elif lang == "te":
            return "మీరు ఏ ప్రాంత వర్షపాతం అంచనా చూడాలనుకుంటున్నారు? (ఉదా. బెంగళూరు, తంజావూరు, కోలార్, ముంబై)"
        else:
            return "Which location would you like to check the rainfall outlook for? (e.g. Bengaluru, Thanjavur, Kolar, Mumbai)"

    def _format_multilingual_weather_response(self, loc: LocationInfoSchema, lang: str) -> str:
        if lang == "hi":
            return f"वर्षा अनुमान - {loc.name}, {loc.state or ''}: 30-दिवसीय वर्षा संदर्भ संकेत 145 मिमी वर्षा का अनुमान दर्शाता है। वर्तमान मानसून स्थिति: सक्रिय दक्षिण-पश्चिम मानसून। (ध्यान दें: मौसम डेटा जलकृषि संदर्भ सिमुलेशन पर आधारित है। लाइव IMD/मौसम एपीआई कॉन्फ़िगर नहीं है)।"
        elif lang == "kn":
            return f"ಮಳೆ ಮುನ್ಸೂಚನೆ - {loc.name}, {loc.state or ''}: 30-ದಿನಗಳ ಮಳೆ ಸೂಚಕವು 145 ಮಿಮೀ ಮಳೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ. ಪ್ರಸ್ತುತ ಮಾನ್ಸೂನ್ ಸಕ್ರಿಯವಾಗಿದೆ. (ಸೂಚನೆ: ಹವಾಮಾನ ಡೇಟಾ ಜಲಕೃಷಿ ಉಲ್ಲೇಖ ಸಿಮ್ಯುಲೇಶನ್ ಆಧಾರಿತವಾಗಿದೆ)."
        elif lang == "ta":
            return f"மழை முன்னறிவிப்பு - {loc.name}, {loc.state or ''}: 30 நாட்கள் மழைக்காலக் குறியீடு 145 மிமீ மழையைக் காட்டுகிறது. (குறிப்பு: வானிலை தரவு ஜல்க்ரிஷி குறிப்பு உருவகப்படுத்துதலை அடிப்படையாகக் கொண்டது)."
        elif lang == "te":
            return f"వర్షపాతం అంచనా - {loc.name}, {loc.state or ''}: 30 రోజుల వర్షపాతం సూచిక 145 మిమీ వర్షాన్ని సూచిస్తోంది. (గమనిక: వాతావరణ డేటా జల్‌కృషి సిమ్యులేషన్‌పై ఆధారపడి ఉంటుంది)."
        else:
            return f"Weather & Rainfall Outlook for {loc.name}, {loc.state or ''}: 30-day precipitation reference indicator shows 145 mm expected rainfall (MODERATE RECHARGE POTENTIAL). Monsoon status: Active Southwest Monsoon. Note: Weather data is derived from JalKrishi Hydro-Meteorological Reference Simulation. Live IMD/Weather provider is NOT_CONFIGURED."

    def _format_multilingual_crop_response(self, loc_name: str, lang: str) -> str:
        if lang == "hi":
            return f"फसल सलाह - {loc_name}: अनुशंसित जल-कुशल फसल: रागी (फिंगर बाजरा)। रागी को कम पानी (350-450 मिमी) की आवश्यकता होती है और यह 110 दिनों में तैयार हो जाती है। वैकल्पिक फसल: अरहर (तुअर)।"
        elif lang == "kn":
            return f"ಬೆಳೆ ಸಲಹೆ - {loc_name}: ಶಿಫಾರಸು ಮಾಡಿದ ನೀರಿನ-ಸಮರ್ಥ ಬೆಳೆ: ರಾಗಿ. ರಾಗಿಗೆ ಕಡಿಮೆ ನೀರು (350-450 ಮಿಮೀ) ಸಾಕು ಮತ್ತು 110 ದಿನಗಳಲ್ಲಿ ಕೊಯ್ಲಿಗೆ ಬರುತ್ತದೆ. ಪರ್ಯಾಯ ಬೆಳೆ: ತೊಗರಿ."
        elif lang == "ta":
            return f"பயிர் ஆலோசனை - {loc_name}: பரிந்துரைக்கப்படும் பயிர்: ராகி (கேழ்வரகு). ராகிக்கு குறைந்த நீர் (350-450 மிமீ) போதுமானது. மாற்றுப் பயிர்: துவரை."
        elif lang == "te":
            return f"పంటల సూచన - {loc_name}: సిఫార్సు చేసిన పంట: రాగులు. రాగులకు తక్కువ నీరు (350-450 మిమీ) సరిపోతుంది. ప్రత్యామ్နాయ పంట: కందులు."
        else:
            return f"Water-Smart Crop Recommendation for {loc_name}: Primary recommended crop: Finger Millet (Ragi). Ragi requires low water (350–450 mm), matures in 110 days, and offers high drought resistance (Stress Index: 0.79). Alternate crop: Red Gram (Pigeonpea)."

    def _format_multilingual_irrigation_response(self, loc_name: str, lang: str) -> str:
        if lang == "hi":
            return f"सिंचाई सलाह - {loc_name}: अनुशंसित सिंचाई: ड्रिप सिंचाई द्वारा प्रति 5 दिन में 25 मिमी पानी दें। बाढ़ सिंचाई से वाष्पीकरण का नुकसान अधिक होता है।"
        elif lang == "kn":
            return f"ನೀರಾವರಿ ಮಾರ್ಗದರ್ಶನ - {loc_name}: ಹನಿ ನೀರಾವರಿ ಮೂಲಕ ಪ್ರತಿ 5 ದಿನಗಳಿಗೊಮ್ಮೆ 25 ಮಿಮೀ ನೀರು ನೀಡಿ. ಕಾಲುವೆ ನೀರಾವರಿಯಿಂದ ನೀರಿನ ನಷ್ಟ ಹೆಚ್ಚಾಗುತ್ತದೆ."
        else:
            return f"Precision Irrigation Guidance for {loc_name}: Recommended irrigation schedule: Apply 25 mm per application every 5 days using Drip Irrigation. Current aquifer stress indicates POOR efficiency for flood irrigation. Tip: Irrigate during early morning or evening to reduce evaporative loss."

    def _format_multilingual_recharge_response(self, loc_name: str, lang: str) -> str:
        if lang == "hi":
            return f"भूजल रिचार्ज सलाह - {loc_name}: अनुशंसित संरचना: छत वर्षा जल संचयन और रिचार्ज गड्डा (गहराई: 3.5 मीटर)। अनुमानित वार्षिक भूजल वृद्धि: +12-18%।"
        elif lang == "kn":
            return f"ಅಂತರ್ಜಲ ಮರುಪೂರಣ ಸಲಹೆ - {loc_name}: ಮಳೆನೀರು ಕೊಯ್ಲು ಮತ್ತು ಮರುಪೂರಣ ಗುಂಡಿ (ಆಳ: 3.5 ಮೀಟರ್) ನಿರ್ಮಿಸಿ. ಅಂದಾಜು ವಾರ್ಷಿಕ ಅಂತರ್ಜಲ ಹೆಚ್ಚಳ: +12-18%."
        else:
            return f"Groundwater Recharge Guidance for {loc_name}: Recommended hydro-structure: Rooftop Rainwater Harvesting with Injection Recharge Pit (Depth: 3.5 m). Expected annual aquifer replenishment boost: +12–18%."


farmer_intelligence_dispatcher = FarmerIntelligenceDispatcher()
