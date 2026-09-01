import re
import math
from typing import Dict, Any, Optional, Tuple, List
from app.models.schemas import (
    WhatsAppIntentEnum,
    WhatsAppAction,
    WhatsAppWebhookRequest,
    WhatsAppWebhookResponse,
    SoilType,
    CropSeason,
    WaterAvailabilityLevel,
    RainfallCondition,
    CropEvaluationCriteriaSchema,
)
from app.pipeline.dwlr_ingest import station_repo
from app.engines.forecasting import forecasting_engine
from app.engines.anomaly_detector import anomaly_engine
from app.engines.crop_recommender import crop_engine


class ConversationSession:
    def __init__(self, conversation_id: str):
        self.conversation_id = conversation_id
        self.language: str = "en"
        self.state: Optional[str] = None
        self.district: Optional[str] = None
        self.station_id: Optional[str] = None
        self.last_intent: Optional[WhatsAppIntentEnum] = None
        self.pending_action: Optional[str] = None
        self.soil_type: Optional[str] = "Loamy"
        self.season: Optional[str] = "Rabi"
        self.rainfall_condition: Optional[str] = "Normal"
        self.water_availability: Optional[str] = "Limited"


class WhatsAppConversationalService:
    def __init__(self):
        self.sessions: Dict[str, ConversationSession] = {}
        self._init_district_mappings()

    def _init_district_mappings(self):
        # Build district to state lookup from repository
        self.district_to_state: Dict[str, str] = {}
        self.all_districts: List[str] = []
        self.all_states: List[str] = []

        all_stations = station_repo.get_all()
        for s in all_stations:
            dist_lower = s.district.lower().strip()
            state_lower = s.state.lower().strip()
            if dist_lower not in self.district_to_state:
                self.district_to_state[dist_lower] = s.state
                self.all_districts.append(s.district)
            if s.state not in self.all_states:
                self.all_states.append(s.state)

        # Hindi phonetic dictionary for states and key agricultural districts
        self.hindi_translations = {
            "कोलार": ("Kolar", "Karnataka"),
            "संगरूर": ("Sangrur", "Punjab"),
            "जयपुर": ("Jaipur", "Rajasthan"),
            "जोधपुर": ("Jodhpur", "Rajasthan"),
            "पुणे": ("Pune", "Maharashtra"),
            "नासिक": ("Nashik", "Maharashtra"),
            "कर्नाटका": ("Karnataka", "Karnataka"),
            "पंजाब": ("Punjab", "Punjab"),
            "राजस्थान": ("Rajasthan", "Rajasthan"),
            "महाराष्ट्र": ("Maharashtra", "Maharashtra"),
            "हरियाणा": ("Haryana", "Haryana"),
            "उत्तर प्रदेश": ("Uttar Pradesh", "Uttar Pradesh"),
            "मध्य प्रदेश": ("Madhya Pradesh", "Madhya Pradesh"),
            "तमिलनाडु": ("Tamil Nadu", "Tamil Nadu"),
            "तेलंगाना": ("Telangana", "Telangana"),
            "बठिंडा": ("Bathinda", "Punjab"),
            "पटियाला": ("Patiala", "Punjab"),
            "लुधियाना": ("Ludhiana", "Punjab"),
            "बेलगावी": ("Belagavi", "Karnataka"),
            "मैसूर": ("Mysuru", "Karnataka"),
            "मंड्या": ("Mandya", "Karnataka"),
            "हसन": ("Hassan", "Karnataka"),
        }

    def get_or_create_session(self, conv_id: Optional[str], language: Optional[str] = "en") -> ConversationSession:
        session_id = conv_id if conv_id and conv_id.strip() else "demo-session-farmer-01"
        if session_id not in self.sessions:
            session = ConversationSession(session_id)
            session.language = "hi" if language == "hi" else "en"
            self.sessions[session_id] = session
        elif language:
            self.sessions[session_id].language = language
        return self.sessions[session_id]

    def _detect_language(self, text: str, current_lang: str) -> str:
        # Check for Devanagari Unicode block
        for ch in text:
            if "\u0900" <= ch <= "\u097f":
                return "hi"
        return current_lang

    def _resolve_entities(self, text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Extracts station_id, district, state from raw text.
        """
        raw_clean = text.strip()
        text_lower = raw_clean.lower()

        # 1. Direct Station Code Matching (e.g. DWLR-PB-001 or dwlr-ka-012)
        st_match = re.search(r"dwlr-[a-z]{2}-\d{3,4}", text_lower)
        if st_match:
            st_code = st_match.group(0).upper()
            st_obj = station_repo.get_by_id(st_code)
            if st_obj:
                return st_obj.id, st_obj.district, st_obj.state

        # 2. Hindi location lookup
        for hi_word, (dist_or_state, st_name) in self.hindi_translations.items():
            if hi_word in raw_clean:
                if dist_or_state in self.all_states:
                    return None, None, dist_or_state
                return None, dist_or_state, st_name

        # 3. English District Lookup
        for dist_lower, state_name in self.district_to_state.items():
            # Check whole word match or substring
            pattern = r"\b" + re.escape(dist_lower) + r"\b"
            if re.search(pattern, text_lower):
                # Find canonical district name
                canonical_district = next((d for d in self.all_districts if d.lower() == dist_lower), dist_lower.title())
                return None, canonical_district, state_name

        # 4. English State Lookup
        for state_name in self.all_states:
            pattern = r"\b" + re.escape(state_name.lower()) + r"\b"
            if re.search(pattern, text_lower):
                return None, None, state_name

        return None, None, None

    def _detect_intent(self, text: str, session: ConversationSession) -> WhatsAppIntentEnum:
        t_clean = text.strip().lower()

        # 1. Number Shortcuts
        if t_clean == "1":
            return WhatsAppIntentEnum.WATER_STATUS
        if t_clean == "2":
            return WhatsAppIntentEnum.FORECAST
        if t_clean == "3":
            return WhatsAppIntentEnum.CROP_RECOMMENDATION
        if t_clean == "4":
            return WhatsAppIntentEnum.ANOMALIES

        # 2. Station ID pattern
        if re.search(r"dwlr-[a-z]{2}-\d{3,4}", t_clean):
            return WhatsAppIntentEnum.STATION_DETAILS

        # 3. Help Intent
        if any(w in t_clean for w in ["help", "मदद", "सहायता", "commands", "menu", "option", "options", "कमांड"]):
            return WhatsAppIntentEnum.HELP

        # 4. Greeting Intent
        if any(w in t_clean for w in ["hi", "hello", "hey", "नमस्ते", "नमस्कार", "pranam", "प्रणाम", "start", "शुरू", "hola"]):
            return WhatsAppIntentEnum.GREETING

        # 5. Nearest Station Intent
        if any(w in t_clean for w in ["nearest", "near", "pass", "paas", "पास", "नजदीक", "नजदीकी", "my station", "closest", "आसपास"]):
            return WhatsAppIntentEnum.NEAREST_STATION

        # 6. Crop Recommendation Intent
        if any(w in t_clean for w in ["crop", "crops", "फसल", "kheti", "खेती", "sow", "grow", "recommend", "agriculture", "बुवाई", "पैदावार", "कम पानी"]):
            return WhatsAppIntentEnum.CROP_RECOMMENDATION

        # 7. Forecast Intent
        if any(w in t_clean for w in ["forecast", "भविष्यवाणी", "predict", "future", "ahead", "projection", "आगे का", "कल का", "आने वाले"]):
            return WhatsAppIntentEnum.FORECAST

        # 8. Anomaly / Alert Intent
        if any(w in t_clean for w in ["alert", "alerts", "warning", "warnings", "anomaly", "anomalies", "खतरा", "चेतावनी", "गिरावट", "आपातकाल", "अलर्ट"]):
            return WhatsAppIntentEnum.ANOMALIES

        # 9. Water Status Intent
        if any(w in t_clean for w in ["water", "पानी", "jal", "जल", "level", "depth", "groundwater", "भूजल", "स्थिति", "paani", "status", "kitna"]):
            return WhatsAppIntentEnum.WATER_STATUS

        # 10. Check if only a location was sent (e.g. "Kolar", "Sangrur")
        st_id, dist, state = self._resolve_entities(t_clean)
        if st_id or dist or state:
            return WhatsAppIntentEnum.WATER_STATUS

        return WhatsAppIntentEnum.UNKNOWN

    def _find_nearest_station(self, lat: float, lon: float):
        stations = station_repo.get_all()
        best_station = None
        min_dist_km = float("inf")

        for s in stations:
            # Haversine distance
            dlat = math.radians(s.latitude - lat)
            dlon = math.radians(s.longitude - lon)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(s.latitude)) * math.sin(dlon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            dist_km = 6371 * c

            if dist_km < min_dist_km:
                min_dist_km = dist_km
                best_station = s

        return best_station, round(min_dist_km, 1)

    def process_message(self, request: WhatsAppWebhookRequest) -> WhatsAppWebhookResponse:
        session = self.get_or_create_session(request.conversation_id, request.language)
        session.language = self._detect_language(request.message, session.language)
        is_hindi = session.language == "hi"

        # Resolve explicit or implied location/station
        st_id, dist, state = self._resolve_entities(request.message)
        if st_id:
            session.station_id = st_id
        if dist:
            session.district = dist
        if state:
            session.state = state

        # If location not mentioned in current message, keep previous context if available
        active_district = dist or session.district or "Kolar"
        active_state = state or session.state or self.district_to_state.get(active_district.lower(), "Karnataka")
        active_station_id = st_id or session.station_id

        intent = self._detect_intent(request.message, session)
        session.last_intent = intent

        # Route by intent
        if intent == WhatsAppIntentEnum.GREETING:
            return self._build_greeting_response(session, is_hindi)

        elif intent == WhatsAppIntentEnum.HELP:
            return self._build_help_response(session, is_hindi)

        elif intent == WhatsAppIntentEnum.NEAREST_STATION:
            return self._build_nearest_station_response(session, request.latitude, request.longitude, is_hindi)

        elif intent == WhatsAppIntentEnum.STATION_DETAILS:
            return self._build_station_details_response(session, active_station_id, is_hindi)

        elif intent == WhatsAppIntentEnum.FORECAST:
            return self._build_forecast_response(session, active_district, active_station_id, is_hindi)

        elif intent == WhatsAppIntentEnum.CROP_RECOMMENDATION:
            return self._build_crop_recommendation_response(session, active_district, active_state, is_hindi)

        elif intent == WhatsAppIntentEnum.ANOMALIES:
            return self._build_anomalies_response(session, active_district, is_hindi)

        elif intent == WhatsAppIntentEnum.WATER_STATUS:
            return self._build_water_status_response(session, active_district, active_state, is_hindi)

        else:
            return self._build_unknown_response(session, is_hindi)

    # -------------------------------------------------------------
    # Response Builders
    # -------------------------------------------------------------

    def _build_greeting_response(self, session: ConversationSession, is_hindi: bool) -> WhatsAppWebhookResponse:
        if is_hindi:
            reply = (
                "🌾 *जलकृषि एआई (JalKrishi AI) में आपका स्वागत है!*\n"
                "“अपना पानी जानें, समझदारी से फसल उगाएं।”\n\n"
                "मैं आपके क्षेत्र का रियल-टाइम भूजल स्तर, पूर्वानुमान और फसल सलाह बता सकता हूँ।\n\n"
                "👉 *आप यह पूछ सकते हैं:*\n"
                "• “कोलार में पानी की स्थिति”\n"
                "• “संगरूर का पूर्वानुमान”\n"
                "• “कम पानी वाली फसलें”\n"
                "• “कोई चेतावनी या अलर्ट?”\n\n"
                "या तुरंत शॉर्टकट टाइप करें:\n"
                "*1* पानी की स्थिति\n"
                "*2* 30-दिन पूर्वानुमान\n"
                "*3* फसल सलाह\n"
                "*4* अलर्ट व खतरे\n\n"
                "_डेमो सिमुलेशन मोड (5,260 DWLR नेटवर्क)_"
            )
        else:
            reply = (
                "🌾 *Welcome to JalKrishi AI!*\n"
                "“Know Your Water. Grow Smarter.”\n\n"
                "I provide real-time DWLR groundwater telemetry, depletion forecasts, and water-smart crop guidance for your farm.\n\n"
                "👉 *You can ask:*\n"
                "• “Kolar water status”\n"
                "• “Sangrur forecast”\n"
                "• “What crop should I grow?”\n"
                "• “Any warnings or alerts?”\n\n"
                "Or quickly type a shortcut number:\n"
                "*1* Water Status\n"
                "*2* 30-Day Forecast\n"
                "*3* Crop Advice\n"
                "*4* Anomaly Alerts\n\n"
                "_Demo Simulation Mode (5,260 DWLR Network)_"
            )

        actions = [
            WhatsAppAction(label="💧 Water Status", action="water"),
            WhatsAppAction(label="🔮 Forecast", action="forecast"),
            WhatsAppAction(label="🌱 Crop Advice", action="crop"),
            WhatsAppAction(label="⚠️ Alerts", action="alerts"),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.GREETING,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
            context={"last_intent": "GREETING"},
        )

    def _build_help_response(self, session: ConversationSession, is_hindi: bool) -> WhatsAppWebhookResponse:
        if is_hindi:
            reply = (
                "ℹ️ *जलकृषि एआई — सहायता व कमांड गाइड*\n\n"
                "आप किसी भी जिले, स्टेशन या अपनी भाषा में जानकारी ले सकते हैं:\n\n"
                "💧 *भूजल स्तर:* “कोलार पानी” या “पानी की स्थिति”\n"
                "🔮 *पूर्वानुमान:* “पंजाब पूर्वानुमान” या “भविष्यवाणी”\n"
                "🌱 *फसल सलाह:* “कौन सी फसल लगाऊं?” या “फसल”\n"
                "⚠️ *चेतावनी:* “क्या कोई चेतावनी है?” या “अलर्ट”\n"
                "📍 *नजदीकी कुआं:* “मेरा नजदीकी स्टेशन”\n\n"
                "⚡ *त्वरित शॉर्टकट:*\n"
                "• *1* — पानी\n"
                "• *2* — पूर्वानुमान\n"
                "• *3* — फसल\n"
                "• *4* — अलर्ट\n\n"
                "_डेमो सिमुलेशन — 5,260 डिजिटल वाटर लेवल रिकॉर्डर_"
            )
        else:
            reply = (
                "ℹ️ *JalKrishi AI — Farmer Command Guide*\n\n"
                "You can query water information for any district or station:\n\n"
                "💧 *Water Status:* “Kolar water” or “Water level”\n"
                "🔮 *Forecast:* “Kolar forecast” or “Future groundwater”\n"
                "🌱 *Crop Advisory:* “What crop should I grow?” or “Crop advice”\n"
                "⚠️ *Alerts:* “Any warnings?” or “Anomalies”\n"
                "📍 *Nearest Well:* “Nearest station” or share GPS location\n\n"
                "⚡ *Quick Number Shortcuts:*\n"
                "• *1* — Water Status\n"
                "• *2* — Forecast\n"
                "• *3* — Crop Advice\n"
                "• *4* — Alerts\n\n"
                "_Demo Simulation — 5,260 DWLR Observation Well Network_"
            )

        actions = [
            WhatsAppAction(label="💧 Water Status", action="water"),
            WhatsAppAction(label="🔮 Forecast", action="forecast"),
            WhatsAppAction(label="🌱 Crop Advice", action="crop"),
            WhatsAppAction(label="📍 Nearest Station", action="nearest"),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.HELP,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
        )

    def _build_water_status_response(self, session: ConversationSession, district: str, state: str, is_hindi: bool) -> WhatsAppWebhookResponse:
        stations = station_repo.filter_stations(district=district)
        if not stations:
            stations = station_repo.filter_stations(state=state)
        if not stations:
            stations = station_repo.get_all()[:10]

        total = len(stations)
        avg_depth = round(sum(s.waterLevel for s in stations) / total, 1) if total > 0 else 24.5
        avg_risk = round(sum(s.riskScore for s in stations) / total, 2) if total > 0 else 0.52
        crit_count = sum(1 for s in stations if s.status.value == "critical")
        warn_count = sum(1 for s in stations if s.status.value == "warning")
        fall_count = sum(1 for s in stations if s.trend.value == "falling")

        status_emoji = "🔴" if crit_count > 0.2 * total else "🟠" if warn_count + crit_count > 0.3 * total else "🟢"
        status_label_en = "Critical Stress" if crit_count > 0.2 * total else "Moderate / Warning" if warn_count + crit_count > 0.3 * total else "Safe & Favorable"
        status_label_hi = "अति संवेदनशील (गंभीर संकट)" if crit_count > 0.2 * total else "मध्यम / सतर्कता" if warn_count + crit_count > 0.3 * total else "सुरक्षित व अनुकूल"

        trend_label_en = "Falling (-0.2 m/mo)" if fall_count > 0.5 * total else "Stable"
        trend_label_hi = "नीचे गिर रहा है (गिरावट)" if fall_count > 0.5 * total else "स्थिर"

        if is_hindi:
            reply = (
                f"💧 *जलकृषि एआई — {district} ({state})*\n\n"
                f"भूजल स्थिति: {status_emoji} *{status_label_hi}*\n"
                f"📊 औसत गहराई: *{avg_depth} मीटर mbgl*\n"
                f"📉 वर्तमान रुझान: *{trend_label_hi}*\n"
                f"⚠️ जोखिम सूचकांक: *{int(avg_risk * 100)}/100* (निगरानी: {total} कुएं)\n\n"
                f"💡 *किसान सलाह:*\n"
                f"• {district} में भूजल स्तर नीचे जा रहा है। सिंचाई का समय रात में रखें।\n"
                f"• अधिक पानी वाली धान/गन्ना की जगह कम पानी वाली दलहन/मक्का चुनें।\n"
                f"• ड्रिप या स्प्रिंकलर से 35% पानी की बचत करें।\n\n"
                f"_डेमो सिमुलेशन — रियल-टाइम DWLR टेलीमेट्री_"
            )
        else:
            reply = (
                f"💧 *JalKrishi AI — {district} ({state})*\n\n"
                f"Water Status: {status_emoji} *{status_label_en}*\n"
                f"📊 Current Depth: *{avg_depth} m mbgl*\n"
                f"📉 Groundwater Trend: *{trend_label_en}*\n"
                f"⚠️ Risk Index: *{int(avg_risk * 100)}/100* (Monitored wells: {total})\n\n"
                f"💡 *What this means for your farm:*\n"
                f"• The water table is depleting. Continuous tube-well pumping should be controlled.\n"
                f"• Prioritize water-efficient crops (Gram, Mustard, Millets) over flood irrigation.\n"
                f"• Adopt drip/micro-sprinklers to reduce extraction load.\n\n"
                f"_Demo Simulation — 5,260 Simulated DWLR Nodes_"
            )

        actions = [
            WhatsAppAction(label="🔮 View Forecast", action="forecast", payload={"district": district}),
            WhatsAppAction(label="🌱 Crop Advice", action="crop", payload={"district": district}),
            WhatsAppAction(label="⚠️ Check Alerts", action="alerts", payload={"district": district}),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.WATER_STATUS,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
            context={"district": district, "state": state, "avg_depth": avg_depth},
        )

    def _build_station_details_response(self, session: ConversationSession, station_id: Optional[str], is_hindi: bool) -> WhatsAppWebhookResponse:
        st = station_repo.get_by_id(station_id) if station_id else None
        if not st:
            st = station_repo.get_all()[0]

        session.station_id = st.id
        session.district = st.district
        session.state = st.state

        if is_hindi:
            reply = (
                f"📍 *स्टेशन विवरण: {st.stationName}*\n"
                f"आईडी: `{st.id}` | ब्लॉक: {st.block}, {st.district}\n\n"
                f"💧 वर्तमान जल स्तर: *{st.waterLevel} मीटर mbgl*\n"
                f"⚡ स्थिति: *{st.status.value.upper()}* ({st.trend.value})\n"
                f"🎯 क्रिटिकल सीमा: *{st.criticalThreshold} मीटर*\n"
                f"⏳ संकट में बचे दिन: *{st.daysToCritical or 'सुरक्षित'} दिन*\n"
                f"📡 टेलीमेट्री स्थिति: *{st.telemetryStatus.value.upper()}*\n\n"
                f"_डेमो सिमुलेशन — जलकृषि DWLR टेलीमेट्री_"
            )
        else:
            reply = (
                f"📍 *Station Telemetry: {st.stationName}*\n"
                f"ID: `{st.id}` | Block: {st.block}, {st.district} ({st.state})\n\n"
                f"💧 Current Water Depth: *{st.waterLevel} m mbgl*\n"
                f"⚡ Status: *{st.status.value.upper()}* (Trend: {st.trend.value})\n"
                f"🎯 Critical Threshold: *{st.criticalThreshold} m*\n"
                f"⏳ Days to Critical: *{st.daysToCritical or 'Safe'} Days*\n"
                f"📡 Telemetry Sensor: *{st.telemetryStatus.value.upper()}* (Daily sync)\n\n"
                f"_Demo Simulation Mode — Simulated Telemetry_"
            )

        actions = [
            WhatsAppAction(label="🔮 Forecast This Well", action="forecast", payload={"station_id": st.id}),
            WhatsAppAction(label="🌱 Crop Advice", action="crop", payload={"station_id": st.id}),
            WhatsAppAction(label="⚠️ Station Alerts", action="alerts", payload={"station_id": st.id}),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.STATION_DETAILS,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
            context={"station_id": st.id, "district": st.district},
        )

    def _build_nearest_station_response(self, session: ConversationSession, lat: Optional[float], lon: Optional[float], is_hindi: bool) -> WhatsAppWebhookResponse:
        if lat is not None and lon is not None:
            st, dist_km = self._find_nearest_station(lat, lon)
            session.station_id = st.id
            session.district = st.district
            session.state = st.state

            if is_hindi:
                reply = (
                    f"📍 *आपका सबसे नजदीकी DWLR कुआं मिल गया है!*\n\n"
                    f"स्टेशन: *{st.stationName}* ({st.id})\n"
                    f"दूरी: *~{dist_km} किमी*\n"
                    f"स्थान: {st.block}, {st.district}, {st.state}\n"
                    f"💧 वर्तमान भूजल स्तर: *{st.waterLevel} मीटर mbgl*\n"
                    f"📉 रुझान: *{st.trend.value}* (जोखिम: {int(st.riskScore * 100)}/100)\n\n"
                    f"क्या आप इसका 30-दिन का पूर्वानुमान या फसल सलाह देखना चाहते हैं?"
                )
            else:
                reply = (
                    f"📍 *Nearest DWLR Observation Well Located!*\n\n"
                    f"Station: *{st.stationName}* (`{st.id}`)\n"
                    f"Distance: *~{dist_km} km* from your GPS location\n"
                    f"Location: {st.block}, {st.district}, {st.state}\n"
                    f"💧 Water Table Depth: *{st.waterLevel} m mbgl*\n"
                    f"📉 Trend: *{st.trend.value.upper()}* (Risk: {int(st.riskScore * 100)}/100)\n\n"
                    f"Would you like a 30-day forecast or crop advice for this well?"
                )

            actions = [
                WhatsAppAction(label="🔮 30-Day Forecast", action="forecast", payload={"station_id": st.id}),
                WhatsAppAction(label="🌱 Crop Advice", action="crop", payload={"station_id": st.id}),
            ]
        else:
            if is_hindi:
                reply = (
                    "📍 *नजदीकी भूजल कुआं खोजने के लिए:*\n\n"
                    "कृपया अपना व्हाट्सएप GPS लोकेशन भेजें, या अपने जिले का नाम लिखें (जैसे: *कोलार* या *संगरूर*)।"
                )
            else:
                reply = (
                    "📍 *To find your nearest DWLR well:*\n\n"
                    "Please tap the clip icon to share your GPS location, or reply with your district name (e.g. *Kolar* or *Sangrur*)."
                )

            actions = [
                WhatsAppAction(label="📍 Share Kolar GPS (Demo)", action="nearest", payload={"lat": 13.13, "lon": 78.13}),
                WhatsAppAction(label="💧 Kolar Water", action="water", payload={"district": "Kolar"}),
            ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.NEAREST_STATION,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
        )

    def _build_forecast_response(self, session: ConversationSession, district: str, station_id: Optional[str], is_hindi: bool) -> WhatsAppWebhookResponse:
        st = station_repo.get_by_id(station_id) if station_id else None
        if not st:
            d_stations = station_repo.filter_stations(district=district)
            st = d_stations[0] if d_stations else station_repo.get_all()[0]

        fc = forecasting_engine.forecast_station(st.id, horizon_days=30)
        p30 = fc.forecast_points[-1].predicted_depth if fc.forecast_points else st.waterLevel + 0.3
        days_crit = fc.days_to_critical or 120

        if is_hindi:
            reply = (
                f"🔮 *जलकृषि 30-दिवसीय भूजल पूर्वानुमान — {st.district}*\n"
                f"कुआं: {st.stationName} (`{st.id}`)\n\n"
                f"📊 वर्तमान गहराई: *{fc.current_depth} मीटर*\n"
                f"📉 30 दिन बाद अनुमानित गहराई: *{p30} मीटर*\n"
                f"⏳ क्रिटिकल थ्रेशोल्ड में बचे दिन: *{days_crit} दिन*\n"
                f"🎯 मॉडल विश्वसनीयता: *{int(fc.confidence * 100)}%*\n\n"
                f"🌾 *किसान कार्रवाई गाइड:*\n"
                f"{fc.farmer_guidance}\n\n"
                f"_डेमो सिमुलेशन — 30-दिन हाइड्रो-डायनामिक मॉडल_"
            )
        else:
            reply = (
                f"🔮 *JalKrishi 30-Day Groundwater Forecast — {st.district}*\n"
                f"Station: {st.stationName} (`{st.id}`)\n\n"
                f"📊 Current Depth: *{fc.current_depth} m mbgl*\n"
                f"📉 Projected Depth (30d): *{p30} m mbgl*\n"
                f"⏳ Days to Critical: *{days_crit} Days* ({fc.days_to_critical_urgency})\n"
                f"🎯 Model Confidence: *{int(fc.confidence * 100)}%*\n\n"
                f"🌾 *Recommended Action:*\n"
                f"{fc.farmer_guidance}\n\n"
                f"_Demo Simulation — 30-Day Hydrodynamic Trajectory_"
            )

        actions = [
            WhatsAppAction(label="🌱 Suitable Crops", action="crop", payload={"station_id": st.id}),
            WhatsAppAction(label="💧 Water Status", action="water", payload={"district": st.district}),
            WhatsAppAction(label="⚠️ Alerts", action="alerts", payload={"station_id": st.id}),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.FORECAST,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
            context={"station_id": st.id, "projected_depth_30d": p30, "days_to_critical": days_crit},
        )

    def _build_crop_recommendation_response(self, session: ConversationSession, district: str, state: str, is_hindi: bool) -> WhatsAppWebhookResponse:
        from app.models.schemas import CropRecommendationRequest

        req = CropRecommendationRequest(
            state=state,
            district=district,
            soil_type=SoilType.LOAMY,
            season=CropSeason.RABI,
            water_availability=WaterAvailabilityLevel.LIMITED,
            rainfall_condition=RainfallCondition.NORMAL,
        )

        res = crop_engine.evaluate_recommendations(req)
        top1 = res.top_recommendations[0] if res.top_recommendations else None
        top2 = res.top_recommendations[1] if len(res.top_recommendations) > 1 else top1
        top3 = res.top_recommendations[2] if len(res.top_recommendations) > 2 else top1
        avoid = res.not_recommended[0] if res.not_recommended else None

        if not top1:
            top_name = "Chickpea / Bengal Gram (Chana)"
            top_score = 92.0
            top_w = 280
            top_reason = "Low water footprint protects stressed aquifer reserves."
        else:
            top_name = top1.crop_name
            top_score = top1.overall_score
            top_w = top1.water_requirement_mm
            top_reason = top1.reasons[0] if top1.reasons else "Optimally matches current limited water conditions."

        if is_hindi:
            reply = (
                f"🌱 *जलकृषि फसल सलाहकार — {district} ({state})*\n"
                f"मिट्टी: दोमट (Loamy) | मौसम: रबी (Rabi) | पानी: सीमित\n\n"
                f"🥇 *1. {top1.local_name or top_name}* (स्कोर: *{top_score}/100*)\n"
                f"   • पानी की आवश्यकता: {top_w} मिमी (कम)\n"
                f"   • कारण: {top_reason}\n\n"
            )
            if top2 and top2 != top1:
                reply += (
                    f"🥈 *2. {top2.local_name or top2.crop_name}* (स्कोर: *{top2.overall_score}/100*)\n"
                    f"   • पानी: {top2.water_requirement_mm} मिमी | {top2.tier}\n\n"
                )
            if top3 and top3 != top1:
                reply += (
                    f"🥉 *3. {top3.local_name or top3.crop_name}* (स्कोर: *{top3.overall_score}/100*)\n"
                    f"   • पानी: {top3.water_requirement_mm} मिमी | {top3.tier}\n\n"
                )
            if avoid:
                reply += (
                    f"⚠️ *इन फसलों से बचें (Not Recommended):*\n"
                    f"❌ *{avoid.local_name or avoid.crop_name}* — {avoid.reason}\n\n"
                )
            reply += "_डेमो सिमुलेशन — 5-कारक हाइड्रो-एग्रोनॉमिक मॉडल_"
        else:
            reply = (
                f"🌱 *JalKrishi Crop Advisor — {district} ({state})*\n"
                f"Soil: Loamy | Season: Rabi | Water: Limited\n\n"
                f"🥇 *1. {top_name}* — Score: *{top_score}/100*\n"
                f"   • Water Need: {top_w} mm (Low footprint)\n"
                f"   • Why: {top_reason}\n\n"
            )
            if top2 and top2 != top1:
                reply += (
                    f"🥈 *2. {top2.crop_name}* — Score: *{top2.overall_score}/100*\n"
                    f"   • Water Need: {top2.water_requirement_mm} mm | Tier: {top2.tier}\n\n"
                )
            if top3 and top3 != top1:
                reply += (
                    f"🥉 *3. {top3.crop_name}* — Score: *{top3.overall_score}/100*\n"
                    f"   • Water Need: {top3.water_requirement_mm} mm | Tier: {top3.tier}\n\n"
                )
            if avoid:
                reply += (
                    f"⚠️ *Crops to Avoid under Current Water Stress:*\n"
                    f"❌ *{avoid.crop_name}* — {avoid.reason}\n\n"
                )
            reply += "_Demo Simulation — 5-Factor Hydro-Agronomic Scoring Model_"

        actions = [
            WhatsAppAction(label="🔮 30-Day Forecast", action="forecast", payload={"district": district}),
            WhatsAppAction(label="💧 Water Status", action="water", payload={"district": district}),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.CROP_RECOMMENDATION,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
            context={"top_crop": top_name, "district": district},
        )

    def _build_anomalies_response(self, session: ConversationSession, district: str, is_hindi: bool) -> WhatsAppWebhookResponse:
        res = anomaly_engine.get_anomalies(district=district, limit=10)
        active_list = res.anomalies if res.anomalies else anomaly_engine.evaluate_all_anomalies()[:4]
        crit_count = sum(1 for a in active_list if a.severity.lower() == "critical")

        primary_anomaly = active_list[0] if active_list else None

        if is_hindi:
            reply = (
                f"⚠️ *जलकृषि चेतावनी केंद्र — {district}*\n\n"
                f"सक्रिय चेतावनियां: *{len(active_list)}* (गंभीर: {crit_count})\n\n"
            )
            if primary_anomaly:
                reply += (
                    f"🚨 *मुख्य अलर्ट:* {primary_anomaly.category}\n"
                    f"कुआं: {primary_anomaly.station_name} (`{primary_anomaly.station_id}`)\n"
                    f"विचलन: {primary_anomaly.deviation}\n"
                    f"विवरण: {primary_anomaly.description}\n"
                    f"सलाह: {primary_anomaly.recommended_action}\n\n"
                )
            reply += (
                "ℹ️ _नोट: संभावित असामान्य दोहन पैटर्न या संभावित सेंसर त्रुटि को प्रारंभिक जांच की आवश्यकता है।_\n"
                "_डेमो सिमुलेशन — जलकृषि विसंगति डिटेक्टर_"
            )
        else:
            reply = (
                f"⚠️ *JalKrishi Alert Center — {district}*\n\n"
                f"Active Telemetry Anomalies: *{len(active_list)}* (Critical: {crit_count})\n\n"
            )
            if primary_anomaly:
                reply += (
                    f"🚨 *Primary Alert:* {primary_anomaly.category}\n"
                    f"Station: {primary_anomaly.station_name} (`{primary_anomaly.station_id}`)\n"
                    f"Observed Deviation: {primary_anomaly.deviation}\n"
                    f"Context: {primary_anomaly.description}\n"
                    f"Action: {primary_anomaly.recommended_action}\n\n"
                )
            reply += (
                "ℹ️ _Note: Cautious evaluation mode. Possible abnormal extraction pattern or potential sensor error requires field verification._\n"
                "_Demo Simulation — 5-Pattern Anomaly Detector_"
            )

        actions = [
            WhatsAppAction(label="💧 Water Status", action="water", payload={"district": district}),
            WhatsAppAction(label="🔮 View Forecast", action="forecast", payload={"district": district}),
            WhatsAppAction(label="🌱 Crop Advice", action="crop", payload={"district": district}),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.ANOMALIES,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
            context={"anomalies_count": len(active_list), "district": district},
        )

    def _build_unknown_response(self, session: ConversationSession, is_hindi: bool) -> WhatsAppWebhookResponse:
        if is_hindi:
            reply = (
                "🤔 *क्षमा करें, मैं आपका प्रश्न पूरी तरह समझ नहीं पाया।*\n\n"
                "मैं भूजल स्तर, पूर्वानुमान, फसल सलाह और अलर्ट में आपकी मदद कर सकता हूँ।\n\n"
                "👉 *उदाहरण के लिए यह लिखकर भेजें:*\n"
                "• “कोलार में पानी”\n"
                "• “संगरूर का पूर्वानुमान”\n"
                "• “फसल सलाह”\n"
                "• “अलर्ट और चेतावनी”\n\n"
                "या तुरंत शॉर्टकट टाइप करें:\n"
                "*1* पानी  |  *2* पूर्वानुमान  |  *3* फसल  |  *4* अलर्ट"
            )
        else:
            reply = (
                "🤔 *I didn't quite catch that, but I can help with groundwater, forecasts, crop advice, and alerts!*\n\n"
                "👉 *Try asking:*\n"
                "• “Kolar water”\n"
                "• “Kolar forecast”\n"
                "• “Crop advice”\n"
                "• “Any warnings?”\n\n"
                "Or send a number:\n"
                "*1* Water Status  |  *2* Forecast  |  *3* Crop Advice  |  *4* Alerts"
            )

        actions = [
            WhatsAppAction(label="💧 Water Status", action="water"),
            WhatsAppAction(label="🔮 Forecast", action="forecast"),
            WhatsAppAction(label="🌱 Crop Advice", action="crop"),
            WhatsAppAction(label="❓ Help", action="help"),
        ]

        return WhatsAppWebhookResponse(
            conversation_id=session.conversation_id,
            intent=WhatsAppIntentEnum.UNKNOWN,
            language="hi" if is_hindi else "en",
            reply=reply,
            actions=actions,
        )


whatsapp_service = WhatsAppConversationalService()
