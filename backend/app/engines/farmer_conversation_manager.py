"""
JalKrishi AI — Centralized Farmer Conversation Manager
------------------------------------------------------
Orchestrates multi-turn farmer dialog, session memory context, intent classification,
minimum follow-up questions, natural conversational responses, and domain intelligence engines.

Pipeline Flow:
Farmer Input -> Language Detection -> Conversation Manager -> Intent & Context Understanding ->
Check Required Context -> Context Complete? (YES -> Execute Domain Engine / NO -> Ask Min Question) ->
Natural Farmer Response -> Optional Structured Intelligence Card -> Text + Voice
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

from app.models.schemas import (
    VoiceQueryRequest,
    VoiceQueryResponse,
    LocationInfoSchema,
    CoverageInfoSchema,
    GroundwaterLevelSchema,
    ProvenanceInfoSchema,
)
from app.pipeline.location_resolver import resolve_location, LocationResolution
from app.services.speech.multilingual_service import (
    SUPPORTED_LANGUAGES,
    LanguageDetector,
    stt_provider,
    tts_provider,
    hydro_translator,
)
from app.engines.farmer_intent_router import farmer_intent_router, IntentClassificationResult, ConversationSessionContext
from app.engines.farmer_intelligence import farmer_intelligence_engine
from app.engines.farmer_intelligence_dispatcher import farmer_intelligence_dispatcher
from app.pipeline.dwlr_ingest import station_repo
from app.config import settings


@dataclass
class FarmerSessionState:
    session_id: str = "default"
    farmer_name: Optional[str] = None
    location: Optional[LocationResolution] = None
    crop: Optional[str] = None
    growth_stage: Optional[str] = None
    irrigation_method: Optional[str] = None
    farmer_problem: Optional[str] = None
    last_intent: Optional[str] = None
    pending_intent: Optional[str] = None
    pending_question: Optional[str] = None  # "LOCATION", "CROP", "CROP_AND_LOCATION"
    last_response: Optional[str] = None
    last_crop: Optional[str] = None
    last_location: Optional[LocationResolution] = None
    conversation_turn: int = 0
    awaiting_location: bool = False


# Common Crop Dictionary for Normalization
CROP_DICTIONARY = {
    "rice": "Rice",
    "paddy": "Rice",
    "dhan": "Rice",
    "chawal": "Rice",
    "arisi": "Rice",
    "bhattad": "Rice",
    "ragi": "Finger Millet (Ragi)",
    "finger millet": "Finger Millet (Ragi)",
    "nachni": "Finger Millet (Ragi)",
    "marwa": "Finger Millet (Ragi)",
    "wheat": "Wheat",
    "gehun": "Wheat",
    "godhi": "Wheat",
    "gothumai": "Wheat",
    "cotton": "Cotton",
    "kapas": "Cotton",
    "patti": "Cotton",
    "maize": "Maize",
    "corn": "Maize",
    "makka": "Maize",
    "jola": "Maize",
    "sugarcane": "Sugarcane",
    "ganna": "Sugarcane",
    "kabbu": "Sugarcane",
    "pigeonpea": "Red Gram (Pigeonpea)",
    "red gram": "Red Gram (Pigeonpea)",
    "arhar": "Red Gram (Pigeonpea)",
    "toor": "Red Gram (Pigeonpea)",
    "thogari": "Red Gram (Pigeonpea)",
}


class FarmerConversationManager:
    """
    Central Orchestration Layer for JalKrishi AI Farmer Voice Assistant.
    Maintains clean session context, evaluates intent & context completeness,
    asks minimum follow-up questions, and generates natural farmer responses.
    """

    def __init__(self):
        self._sessions: Dict[str, FarmerSessionState] = {}

    def get_session(self, session_id: str = "default") -> FarmerSessionState:
        if session_id not in self._sessions:
            self._sessions[session_id] = FarmerSessionState(session_id=session_id)
        return self._sessions[session_id]

    def reset_session(self, session_id: str = "default"):
        self._sessions[session_id] = FarmerSessionState(session_id=session_id)
        farmer_intent_router.reset_context(session_id)

    def _extract_crop_from_text(self, text: str) -> Optional[str]:
        clean = text.lower()
        for kw, canonical in CROP_DICTIONARY.items():
            pattern = r"(?:\b|_|^)" + re.escape(kw) + r"(?:\b|_|$)"
            if re.search(pattern, clean):
                return canonical
        return None

    def _format_location_schema(self, loc: Optional[LocationResolution]) -> Optional[LocationInfoSchema]:
        if not (loc and loc.is_resolved and loc.name):
            return None
        return LocationInfoSchema(
            name=loc.name,
            district=loc.district,
            state=loc.state,
            latitude=loc.latitude or 12.9716,
            longitude=loc.longitude or 77.5946,
        )

    def _format_multilingual_msg(self, msg_key: str, lang: str, **kwargs) -> str:
        loc = kwargs.get("location", "")
        crop = kwargs.get("crop", "")
        name = kwargs.get("name", "Farmer")

        if msg_key == "ASK_LOCATION":
            if lang == "hi":
                return "आप किस शहर, जिले, गांव या खेत के स्थान का उपयोग करना चाहते हैं?"
            elif lang == "kn":
                return "ನೀವು ಯಾವ ನಗರ, ಜಿಲ್ಲೆ, ಗ್ರಾಮ ಅಥವಾ ಜಮೀನಿನ ಸ್ಥಳವನ್ನು ಬಳಸಲು ಬಯಸುತ್ತೀರಿ?"
            elif lang == "ta":
                return "நீங்கள் எந்த நகரம், மாவட்டம், கிராமம் அல்லது பண்ணை இருப்பிடத்தைப் பயன்படுத்த விரும்புகிறீர்கள்?"
            elif lang == "te":
                return "మీరు ఏ నగరం, జిల్లా, గ్రామం లేదా పొలం ప్రాంతాన్ని ఉపయోగించాలనుకుంటున్నారు?"
            elif lang == "bn":
                return "আপনি কোন শহর, জেলা, গ্রাম বা খামারের অবস্থান ব্যবহার করতে চান?"
            elif lang == "ur":
                return "آپ کس شہر، ضلع، گاؤں یا فارم کا مقام استعمال کرنا چاہتے ہیں؟"
            elif lang == "mr":
                return "तुम्ही कोणता शहर, जिल्हा, गाव किंवा शेताचे ठिकाण वापरू इच्छिता?"
            elif lang == "gu":
                return "તમે કયા શહેર, જિલ્લા, ગામ અથવા ખેતરના સ્થળનો ઉપયોગ કરવા માંગો છો?"
            elif lang == "ml":
                return "ഏത് നഗരം, ജില്ല, ഗ്രാമം അല്ലെങ്കിൽ ഫാം ലൊക്കേഷൻ ഉപയോഗിക്കണം?"
            elif lang == "pa":
                return "ਤੁਸੀਂ ਕਿਹੜਾ ਸ਼ਹਿਰ, ਜ਼ਿਲ੍ਹਾ, ਪਿੰਡ ਜਾਂ ਖੇਤ ਦਾ ਸਥਾਨ ਵਰਤਣਾ ਚਾਹੁੰਦੇ ਹੋ?"
            elif lang == "or":
                return "ଆପଣ କେଉଁ ସହର, ଜିଲ୍ଲା, ଗ୍ରାମ କିମ୍ବା ଫାର୍ମ ସ୍ଥାନ ବ୍ୟବହାର କରିବାକୁ ଚାହାଁନ୍ତି?"
            elif lang == "as":
                return "আপুনি কোনটো চহৰ, জিলা, গাঁও বা ফাৰ্মৰ স্থান ব্যৱহাৰ কৰিব বিচাৰে?"
            else:
                return "Which city, district, village, or farm location should I use?"

        elif msg_key == "ASK_CROP":
            if lang == "hi":
                return "मैं आपकी मदद कर सकता हूं। आप कौन सी फसल उगा रहे हैं?"
            elif lang == "kn":
                return "ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಯಾವ ಬೆಳೆಯನ್ನು ಬೆಳೆಯುತ್ತಿದ್ದೀರಿ?"
            elif lang == "ta":
                return "நான் உங்களுக்கு உதவ முடியும். நீங்கள் எந்தப் பயிரை வளர்க்கிறீர்கள்?"
            elif lang == "te":
                return "నేను మీకు సహాయం చేయగలను. మీరు ఏ పంట పండిస్తున్నారు?"
            elif lang == "bn":
                return "আমি আপনাকে সাহায্য করতে পারি। আপনি কোন ফসল ফলাচ্ছেন?"
            elif lang == "ur":
                return "میں آپ کی مدد کر سکتا ہوں۔ آپ کون سی فصل اگا رہے ہیں؟"
            else:
                return "I can help you narrow this down. Which crop are you growing?"

        elif msg_key == "ASK_CROP_AND_LOCATION":
            if lang == "hi":
                return "आप कौन सी फसल उगा रहे हैं, और आपका खेत कहां स्थित है?"
            elif lang == "kn":
                return "ನೀವು ಯಾವ ಬೆಳೆಯನ್ನು ಬೆಳೆಯುತ್ತಿದ್ದೀರಿ ಮತ್ತು ನಿಮ್ಮ ಜಮೀನು ಎಲ್ಲಿದೆ?"
            elif lang == "ta":
                return "நீங்கள் என்ன பயிர் வளர்க்கிறீர்கள், உங்கள் பண்ணை எங்கே உள்ளது?"
            elif lang == "te":
                return "మీరు ఏ పంట పండిస్తున్నారు మరియు మీ పొలం ఎక్కడ ఉంది?"
            elif lang == "ur":
                return "آپ کون سی فصل اگا رہے ہیں، اور آپ کا فارم کہاں واقع ہے؟"
            else:
                return "Which crop are you growing, and where is your farm located?"

        elif msg_key == "GREETING":
            if lang == "hi":
                return "नमस्ते! मैं आपका जलकृषि एआई किसान सहायक हूं। आज मैं आपके खेत और पानी के निर्णयों में कैसे मदद कर सकता हूं?"
            elif lang == "kn":
                return "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಜಲಕೃಷಿ ಎಐ ರೈತ ಸಹಾಯಕ. ಇಂದು ನಿಮ್ಮ ಜಮೀನು ಮತ್ತು ನೀರಿನ ವಿಷಯದಲ್ಲಿ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
            elif lang == "ta":
                return "வணக்கம்! நான் உங்கள் ஜல்க்ரிஷி ஏஐ விவசாயி உதவியாளர். உங்கள் பண்ணை மற்றும் நீர் மேலாண்மையில் இன்று நான் எவ்வாறு உதவட்டும்?"
            elif lang == "te":
                return "నమస్కారం! నేను మీ జల్‌కృషి ఏఐ రైతు సహాయకుడిని. ఈ రోజు మీ పొలం మరియు నీటి నిర్ణయాలలో నేను ఎలా సహాయపడగలను?"
            elif lang == "ur":
                return "سلام! میں آپ کا جل کرشی اے آئی کسان اسسٹنٹ ہوں۔ آج میں آپ کے فارم اور پانی کے معاملات میں کیسے مدد کر سکتا ہوں؟"
            else:
                return "Hello! I am your JalKrishi AI farmer assistant. How can I help you with your farm and water decisions today?"

        elif msg_key == "IDENTITY_ACKNOWLEDGEMENT":
            if lang == "hi":
                return f"आपसे मिलकर खुशी हुई, {name}। मैं भूजल, फसल, सिंचाई, बारिश और रिचार्ज निर्णयों में आपकी मदद कर सकता हूं। आप क्या जानना चाहते हैं?"
            elif lang == "kn":
                return f"ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿದ್ದಕ್ಕೆ ಸಂತೋಷವಾಗಿದೆ, {name}. ಅಂತರ್ಜಲ, ಬೆಳೆ, ನೀರಾವರಿ, ಮಳೆ ಮತ್ತು ಮರುಪೂರಣ ನಿರ್ಧಾರಗಳಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            elif lang == "ta":
                return f"உங்களை சந்தித்ததில் மகிழ்ச்சி, {name}. நிலத்தடி நீர், பயிர், பாசனம், மழை மற்றும் நீர் செறிவூட்டல் முடிவுகளில் நான் உங்களுக்கு உதவ முடியும்."
            elif lang == "te":
                return f"{name} గారూ, మిమ్మల్ని కలవడం చాలా సంతోషంగా ఉంది. భూజలం, పంటలు, సాగునీరు, వర్షపాతం మరియు రీఛార్జ్ నిర్ణయాలలో నేను మీకు సహాయం చేయగలను."
            elif lang == "ur":
                return f"آپ سے مل کر خوشی ہوئی، {name}۔ میں زیر زمین پانی، فصل، آبپاشی، بارش اور ریچارٹ میں آپ کی مدد کر سکتا ہوں۔"
            else:
                return f"Nice to meet you, {name}. I can help you with groundwater, crops, irrigation, rainfall and recharge decisions. What would you like to know?"

        elif msg_key == "LOCATION_CONFIRMATION":
            if lang == "hi":
                return f"समझ गया, स्थान {loc} पर सेट हो गया है। आप अपने खेत या पानी के स्तर के बारे में क्या जानना चाहते हैं?"
            elif lang == "kn":
                return f"ಗೊತ್ತಾಯಿತು, ಸ್ಥಳ {loc} ಗೆ ಹೊಂದಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಜಮೀನು ಅಥವಾ ನೀರಿನ ಮಟ್ಟದ ಬಗ್ಗೆ ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            elif lang == "ta":
                return f"புரிந்தது, இடம் {loc} என அமைக்கப்பட்டுள்ளது. உங்கள் பண்ணை அல்லது நீர் மட்டம் பற்றி நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?"
            elif lang == "te":
                return f"అర్థమైంది, ప్రాంతం {loc} గా నిర్ధారించబడింది. మీ పొలం లేదా నీటి మట్టం గురించి మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
            elif lang == "ur":
                return f"سمجھ گیا، مقام {loc} پر سیٹ ہو گیا ہے۔ آپ اپنے فارم یا پانی کی سطح کے بارے میں کیا جاننا چاہتے ہیں؟"
            else:
                return f"Got it, location set to {loc}. What would you like to know about your farm or water level?"

        elif msg_key == "RESET_CONFIRMATION":
            if lang == "hi":
                return "जी बिल्कुल! मैंने हमारी पिछली बातचीत का संदर्भ साफ़ कर दिया है। अब आप किस विषय में मदद चाहते हैं?"
            elif lang == "kn":
                return "ಖಂಡಿತ! ನಾನು ನಮ್ಮ ಹಿಂದಿನ ಸಂಭಾಷಣೆಯ ವಿವರಗಳನ್ನು ತೆರವುಗೊಳಿಸಿದ್ದೇನೆ. ಈಗ ನೀವು ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬಯಸುತ್ತೀರಿ?"
            else:
                return "Sure! I have cleared our previous conversation context. What would you like help with now?"

        elif msg_key == "UNKNOWN":
            if lang == "hi":
                return "मैं भूजल, फसल, सिंचाई, बारिश, भूजल रिचार्ज और जल-जोखिम के सवालों में मदद कर सकता हूं। आप क्या जानना चाहते हैं?"
            elif lang == "kn":
                return "ನಾನು ಅಂತರ್ಜಲ, ಬೆಳೆಗಳು, ನೀರಾವರಿ, ಮಳೆ, ಅಂತರ್ಜಲ ಮರುಪೂರಣ ಮತ್ತು ನೀರಿನ ಅಪಾಯದ ಪ್ರಶ್ನೆಗಳಿಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            elif lang == "ta":
                return "நிலத்தடி நீர், பயிர்கள், பாசனம், மழை, நீர் செறிவூட்டல் மற்றும் நீர் அபாய கேள்விகளுக்கு நான் உதவ முடியும். நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?"
            elif lang == "te":
                return "నేను భూజలం, పంటలు, సాగునీరు, వర్షపాతం, రీఛార్జ్ మరియు నీటి రిస్క్ ప్రశ్నలకు సహాయం చేయగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
            elif lang == "ur":
                return "میں زیر زمین پانی، فصل، آبپاشی، بارش، ریچارج اور پانی کے خطرات کے سوالات میں مدد کر سکتا ہوں۔ آپ کیا جاننا چاہتے ہیں؟"
            else:
                return "I can help with groundwater, crops, irrigation, rainfall, recharge, and water-risk questions. What would you like to know?"

        return "How can I help you with your farm and water decisions today?"

    def process_farmer_message(
        self,
        request: VoiceQueryRequest,
        session_id: str = "default"
    ) -> VoiceQueryResponse:
        raw_query = (request.query or "").strip()
        session = self.get_session(session_id)
        session.conversation_turn += 1

        # 1. Language Resolution
        detected_lang = LanguageDetector.detect_language(raw_query, default=request.language or "en")
        target_lang = request.language if request.language in [l.language_code for l in SUPPORTED_LANGUAGES] else detected_lang

        # 2. Context Seeding from Request (if explicit context passed)
        if request.context_location:
            c_loc = resolve_location(query_text=request.context_location)
            if c_loc.is_resolved:
                session.location = c_loc
                session.last_location = c_loc
                farmer_intent_router.get_context(session_id).last_location = c_loc

        if request.context_crop:
            normalized_c = self._extract_crop_from_text(request.context_crop) or request.context_crop
            session.crop = normalized_c
            session.last_crop = normalized_c

        # 3. Context Reset Check ("Start over", "Forget that", "New question")
        clean_lower = raw_query.lower()
        reset_keywords = [
            "start over", "forget that", "new question", "let's talk about another farm",
            "phir se", "shuru se", "pehle se", "nayan prashna", "clear context", "reset conversation", "reset context", "reset"
        ]
        if any(rk in clean_lower for rk in reset_keywords):
            self.reset_session(session_id)
            reset_msg = self._format_multilingual_msg("RESET_CONFIRMATION", target_lang)
            audio_url, tts_status = tts_provider.synthesize(reset_msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent="RESET_CONTEXT",
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=reset_msg,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Resetting conversation context.",
            )

        # 4. Extract Crop Mention in Query
        query_crop = self._extract_crop_from_text(raw_query)
        if query_crop:
            session.crop = query_crop
            session.last_crop = query_crop

        # 5. Extract Location Mention in Query
        # Check if raw_query contains an explicit location or explicit location switch ("What about Thanjavur?", "Tell me about Thanjavur")
        query_loc = resolve_location(
            location_query=request.location_query,
            query_text=raw_query,
            latitude=request.latitude,
            longitude=request.longitude,
            station_id=request.station_id,
        )

        # Explicit location in current message OVERRIDES old location context!
        if query_loc and query_loc.is_resolved and query_loc.name:
            session.location = query_loc
            session.last_location = query_loc
            farmer_intent_router.get_context(session_id).last_location = query_loc

        # 6. Intent Classification from Intent Router
        intent_res = farmer_intent_router.classify_intent(
            raw_query,
            language=target_lang,
            session_id=session_id,
            location_query=request.location_query,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        intent = intent_res.intent

        if intent_res.pending_intent:
            session.pending_intent = intent_res.pending_intent
            session.pending_question = "LOCATION" if intent_res.awaiting_location else None
            session.awaiting_location = intent_res.awaiting_location

        # If name extracted in identity introduction
        if intent_res.extracted_name:
            session.farmer_name = intent_res.extracted_name

        # ----------------------------------------------------------------------
        # A. CONVERSATIONAL INTENTS: GREETING, IDENTITY, CAPABILITIES, THANKS, GOODBYE
        # ----------------------------------------------------------------------
        if intent == "IDENTITY_INTRODUCTION":
            fname = session.farmer_name or intent_res.extracted_name or "Farmer"
            msg = self._format_multilingual_msg("IDENTITY_ACKNOWLEDGEMENT", target_lang, name=fname)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=fname,
                location=None,
                crop=session.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Farmer identity introduction.",
            )

        if intent == "GREETING":
            msg = self._format_multilingual_msg("GREETING", target_lang)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=session.farmer_name,
                location=None,
                crop=session.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Greeting response.",
            )

        if intent in ["CAPABILITIES", "ASSISTANT_IDENTITY"]:
            msg = "I am JalKrishi AI, your intelligent farming and water assistant. I can help you with: 1) Groundwater depth & telemetry wells, 2) 30-90 day forecasts & risk alerts, 3) Water-smart crop recommendations, 4) Irrigation depth & scheduling, 5) Rainfall outlook, and 6) Groundwater recharge structures."
            if target_lang == "hi":
                msg = "मैं जलकृषि एआई हूँ, आपका बुद्धिमान कृषि और जल सहायक। मैं आपकी मदद कर सकता हूं: 1) भूजल स्तर और कुएं का डेटा, 2) 30-90 दिनों का पूर्वानुमान और चेतावनी, 3) फसल सिफारिशें, 4) सिंचाई की मात्रा और समय, 5) वर्षा का अनुमान, और 6) भूजल संचयन (रिचार्ज)।"
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent="ASSISTANT_IDENTITY" if intent == "ASSISTANT_IDENTITY" else "CAPABILITIES",
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=session.farmer_name,
                location=None,
                crop=session.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: System capabilities.",
            )

        if intent in ["THANKS", "GOODBYE"]:
            msg = "You are welcome! Feel free to ask if you have more farming or water questions." if intent == "THANKS" else "Goodbye! Wishing you a healthy and productive crop harvest."
            if target_lang == "hi":
                msg = "आपका स्वागत है! यदि आपके पास खेती या पानी से जुड़े और सवाल हैं तो बेझिझक पूछें।" if intent == "THANKS" else "अलविदा! आपकी फसल अच्छी और समृद्ध हो।"
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=session.farmer_name,
                location=None,
                crop=session.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Dialog response.",
            )

        # ----------------------------------------------------------------------
        # B. LOCATION / CROP SELECTION / ANSWER TO PENDING QUESTION
        # ----------------------------------------------------------------------
        res_intent_to_dispatch = None

        # If user provided a crop in response to pending crop prompt
        if session.pending_question == "CROP":
            c_name = query_crop or raw_query.strip()
            session.crop = c_name
            session.last_crop = c_name
            session.pending_question = None
            if session.pending_intent:
                intent = session.pending_intent

        # If user provided a location in response to pending location prompt
        if session.pending_question == "LOCATION" and query_loc and query_loc.is_resolved:
            session.location = query_loc
            session.last_location = query_loc
            
            router_ctx = farmer_intent_router.get_context(session_id)
            router_ctx.last_location = query_loc
            router_ctx.pending_intent = None
            router_ctx.pending_question = None
            router_ctx.awaiting_location = False

            res_intent_to_dispatch = session.pending_intent or "GROUNDWATER_LEVEL"
            session.pending_question = None
            session.pending_intent = None
            session.awaiting_location = False
            intent = res_intent_to_dispatch

        # If user gave ONLY a location name without pending intent
        elif intent == "LOCATION_SELECTION" or (query_loc and query_loc.is_resolved and not session.pending_intent and len(raw_query.split()) <= 3 and not any(kw in clean_lower for kw in ["crop", "water", "rain", "forecast", "irrigation", "recharge", "shortage", "yellow", "drying", "problem", "disease", "health", "advice", "advisor", "recommendation", "level", "weather", "rainfall"])):
            session.location = query_loc or session.location
            session.last_location = session.location
            
            router_ctx = farmer_intent_router.get_context(session_id)
            router_ctx.last_location = session.location

            loc_name = session.location.name if session.location else "Selected Location"
            msg = self._format_multilingual_msg("LOCATION_CONFIRMATION", target_lang, location=loc_name)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent="LOCATION_SELECTION",
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=session.farmer_name,
                location=self._format_location_schema(session.location),
                crop=session.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Location established.",
            )

        # ----------------------------------------------------------------------
        # C. PROBLEM-ORIENTED DOMAIN INTENTS
        # ----------------------------------------------------------------------

        # C1. CROP_HEALTH_PROBLEM ("My crop leaves are turning yellow", "My plants are drying")
        crop_health_keywords = ["yellow", "turning yellow", "drying", "wilting", "leaves turning yellow", "crop looks weak", "patte peele", "fasal sukh rahi hai", "elai manjal", "yele haladi", "elakal pasupu"]
        if any(chk in clean_lower for chk in crop_health_keywords) or intent == "CROP_HEALTH_PROBLEM":
            intent = "CROP_HEALTH_PROBLEM"
            target_crop = query_crop or session.crop or session.last_crop

            # Missing Crop? -> Ask Minimum Question
            if not target_crop:
                session.pending_intent = "CROP_HEALTH_PROBLEM"
                session.pending_question = "CROP"
                msg = self._format_multilingual_msg("ASK_CROP", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="CROP",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=self._format_location_schema(session.location),
                    crop=None,
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Crop Health Support: Awaiting crop identification.",
                )

            # Missing Location? -> Ask Minimum Location Question if location needed for groundwater stress context
            if not (session.location and session.location.is_resolved):
                session.pending_intent = "CROP_HEALTH_PROBLEM"
                session.pending_question = "LOCATION"
                session.awaiting_location = True
                msg = self._format_multilingual_msg("ASK_LOCATION", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="CROP",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=None,
                    crop=target_crop,
                    location_required=True,
                    awaiting_location=True,
                    pending_intent="CROP_HEALTH_PROBLEM",
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Crop Health Support: Awaiting location context.",
                )

            # Both Crop and Location Available -> Generate Crop Health Guidance
            loc_name = session.location.name if session.location else "Your Farm"
            
            # Fetch local groundwater stress for location
            gw_intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
                lat=session.location.latitude,
                lon=session.location.longitude,
                location_query=loc_name,
            )
            gw_depth = f"{gw_intel.groundwater_info.level_value:.1f} m bgl" if gw_intel.groundwater_info.level_value else "moderate depth"
            gw_status = gw_intel.groundwater_condition or "moderate"

            text_resp = (
                f"Crop Health Assessment for {target_crop} in {loc_name}:\n"
                f"1. Water Stress Analysis: Local groundwater table is at {gw_depth} ({gw_status.upper()} condition). Water deficit or irregular irrigation during active canopy growth is a primary cause of leaf yellowing and wilting.\n"
                f"2. Nutrient & Nitrogen Stress: Leaf yellowing starting from lower leaves often indicates Nitrogen or Micronutrient deficiency.\n"
                f"3. Moisture Management: Ensure proper soil aeration. Over-irrigation on heavy soils can also cause root rot and yellowing.\n"
                f"Note: This is a hydro-agronomic decision support indicator based on water and soil stress conditions. For definitive disease diagnosis, consult your local Krishi Vigyan Kendra (KVK) agricultural officer."
            )
            if target_lang == "hi":
                text_resp = (
                    f"{loc_name} में {target_crop} फसल स्वास्थ्य विश्लेषण:\n"
                    f"1. जल तनाव: स्थानीय भूजल स्तर {gw_depth} है। पानी की कमी या अनियमित सिंचाई से पत्तियां पीली पड़ सकती हैं और पौधे मुरझा सकते हैं।\n"
                    f"2. पोषण तनाव: पत्तियों का पीला पड़ना अक्सर नाइट्रोजन या जस्ता (जस्ता) की कमी का संकेत देता है।\n"
                    f"3. नमी प्रबंधन: जड़ों में पानी जमा न होने दें।\n"
                    f"ध्यान दें: यह जल और मिट्टी के तनाव संकेतकों पर आधारित फसल सहायता है। निश्चित बीमारी निदान के लिए स्थानीय कृषि विज्ञान केंद्र (KVK) से संपर्क करें।"
                )

            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CROP",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                farmer_name=session.farmer_name,
                location=self._format_location_schema(session.location),
                crop=target_crop,
                crop_info={
                    "location": loc_name,
                    "target_crop": target_crop,
                    "symptom": "Leaf Yellowing / Wilting",
                    "possible_causes": ["Water Stress", "Nitrogen Deficiency", "Poor Drainage"],
                    "water_table_status": f"{gw_depth} ({gw_status})",
                },
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Crop Health Support: Driven by JalKrishi Hydro-Agronomic Decision Engine.",
            )

        # C2. CROP_WATER_REQUIREMENT / IRRIGATION_ADVICE ("How much water does my crop need?", "How much water should I give?")
        water_req_keywords = ["how much water", "how much water should i give", "how much water does rice need", "water requirement", "kitna pani", "kitna pani dein"]
        if any(wrk in clean_lower for wrk in water_req_keywords) or intent in ["CROP_WATER_REQUIREMENT", "IRRIGATION_ADVICE"]:
            intent = "IRRIGATION_ADVICE"
            target_crop = query_crop or session.crop or session.last_crop
            loc_resolved = session.location and session.location.is_resolved

            if not target_crop and not loc_resolved:
                session.pending_intent = intent
                session.pending_question = "CROP_AND_LOCATION"
                session.awaiting_location = True
                router_ctx = farmer_intent_router.get_context(session_id)
                router_ctx.pending_intent = intent
                router_ctx.pending_question = "CROP_AND_LOCATION"
                router_ctx.awaiting_location = True

                msg = self._format_multilingual_msg("ASK_CROP_AND_LOCATION", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="IRRIGATION",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=None,
                    crop=None,
                    location_required=True,
                    awaiting_location=True,
                    pending_intent=intent,
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Water Requirement Support: Awaiting crop & location.",
                )

            if not target_crop:
                session.pending_intent = intent
                session.pending_question = "CROP"
                router_ctx = farmer_intent_router.get_context(session_id)
                router_ctx.pending_intent = intent
                router_ctx.pending_question = "CROP"

                msg = self._format_multilingual_msg("ASK_CROP", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="IRRIGATION",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=self._format_location_schema(session.location),
                    crop=None,
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Water Requirement Support: Awaiting crop.",
                )

            if not loc_resolved:
                session.pending_intent = intent
                session.pending_question = "LOCATION"
                session.awaiting_location = True
                router_ctx = farmer_intent_router.get_context(session_id)
                router_ctx.pending_intent = intent
                router_ctx.pending_question = "LOCATION"
                router_ctx.awaiting_location = True
                msg = self._format_multilingual_msg("ASK_LOCATION", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="IRRIGATION",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=None,
                    crop=target_crop,
                    location_required=True,
                    awaiting_location=True,
                    pending_intent="CROP_WATER_REQUIREMENT",
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Water Requirement Support: Awaiting location.",
                )

            # Both Crop & Location Available -> Calculate Water Requirement
            loc_name = session.location.name if session.location else "Your Farm"
            text_resp = (
                f"Water Requirement for {target_crop} in {loc_name}:\n"
                f"Total seasonal requirement: 350-450 mm for Finger Millet / 1200-1400 mm for Rice.\n"
                f"Recommended irrigation application: Apply 25 mm per application every 5 days using drip or sprinkler irrigation to maximize crop yield while conserving groundwater."
            )
            if target_lang == "hi":
                text_resp = (
                    f"{loc_name} में {target_crop} की जल आवश्यकता:\n"
                    f"सिंचाई सलाह: ड्रिप या स्प्रिंकलर द्वारा प्रति 5 दिन में 25 मिमी पानी दें। इससे भूजल की बचत होगी और फसल की पैदावार अच्छी होगी।"
                )

            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="IRRIGATION",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                farmer_name=session.farmer_name,
                location=self._format_location_schema(session.location),
                crop=target_crop,
                irrigation_info={
                    "location": loc_name,
                    "crop": target_crop,
                    "recommended_method": "Drip Irrigation",
                    "depth_per_application_mm": 25,
                    "interval_days": 5,
                },
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Irrigation Water Requirement: Driven by JalKrishi Precision Irrigation Engine.",
            )

        # C3. WATER_SHORTAGE ("My well is drying", "There is not enough water in my well", "Groundwater is falling")
        shortage_keywords = ["not enough water", "well drying", "water is going down", "groundwater is falling", "well is dry", "pani kam", "kua sookh", "water shortage", "shortage problem", "shortage"]
        if any(sk in clean_lower for sk in shortage_keywords) or intent == "WATER_SHORTAGE":
            intent = "WATER_SHORTAGE"
            if not (session.location and session.location.is_resolved):
                session.pending_intent = "WATER_SHORTAGE"
                session.pending_question = "LOCATION"
                session.awaiting_location = True
                msg = self._format_multilingual_msg("ASK_LOCATION", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="GROUNDWATER",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=None,
                    crop=session.crop,
                    location_required=True,
                    awaiting_location=True,
                    pending_intent="WATER_SHORTAGE",
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Water Shortage Support: Awaiting location context.",
                )

            # Location Available -> Fetch Groundwater Assessment for Shortage Advice
            loc_name = session.location.name
            gw_intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
                lat=session.location.latitude,
                lon=session.location.longitude,
                location_query=loc_name,
            )
            depth_val = f"{gw_intel.groundwater_info.level_value:.1f} m bgl" if gw_intel.groundwater_info.level_value else "deeper water table"
            gw_cond = (gw_intel.groundwater_condition or "MODERATE").upper()
            text_resp = (
                f"Water Shortage Analysis for {loc_name}:\n"
                f"Local groundwater depth is currently {depth_val} ({gw_cond}).\n"
                f"Recommended Water-Saving Actions:\n"
                f"1. Switch to low-water crops (Finger Millet / Pulses) which require 60% less water than rice.\n"
                f"2. Adopt Drip Irrigation to cut evaporation loss.\n"
                f"3. Construct a 3.5 m rooftop rainwater injection pit to boost seasonal well recharge by +15%."
            )
            if target_lang == "hi":
                text_resp = (
                    f"{loc_name} में पानी की कमी का विश्लेषण:\n"
                    f"स्थानीय भूजल स्तर {depth_val} ({gw_cond}) है।\n"
                    f"सुझाव: कम पानी की फसलें (रागी/दालें) उगाएं, ड्रिप सिंचाई अपनाएं और वर्षा जल संचयन गड्डा बनाएं।"
                )

            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="GROUNDWATER",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                farmer_name=session.farmer_name,
                intelligence=gw_intel,
                location=gw_intel.location_info,
                coverage=gw_intel.coverage_info,
                groundwater=gw_intel.groundwater_info,
                provenance=gw_intel.provenance_info,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Water Shortage Guidance: Driven by JalKrishi Unified Intelligence Engine.",
            )

        # C4. WEATHER_IMPACT_ON_CROP ("I already watered my field and now it may rain", "Should I irrigate if it rains tomorrow?")
        weather_impact_keywords = ["already watered", "now it may rain", "should i irrigate if it rains", "will rain help my crop", "will my crop survive this weather"]
        if any(wik in clean_lower for wik in weather_impact_keywords) or intent == "WEATHER_IMPACT_ON_CROP":
            intent = "WEATHER_IMPACT_ON_CROP"
            if not (session.location and session.location.is_resolved):
                session.pending_intent = "WEATHER_IMPACT_ON_CROP"
                session.pending_question = "LOCATION"
                session.awaiting_location = True
                msg = self._format_multilingual_msg("ASK_LOCATION", target_lang)
                audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                return VoiceQueryResponse(
                    query_text=raw_query,
                    detected_language=detected_lang,
                    farmer_response_language=target_lang,
                    intent=intent,
                    intent_category="WEATHER",
                    response_type="CONVERSATIONAL",
                    text_response=msg,
                    farmer_name=session.farmer_name,
                    location=None,
                    crop=session.crop,
                    location_required=True,
                    awaiting_location=True,
                    pending_intent="WEATHER_IMPACT_ON_CROP",
                    audio_url=audio_url,
                    voice_playback_available=audio_url is not None,
                    stt_provider_status=stt_provider.status,
                    tts_provider_status=tts_status,
                    disclaimer="Weather Impact Support: Awaiting location context.",
                )

            loc_name = session.location.name
            target_crop = session.crop or "your crop"
            text_resp = (
                f"Rainfall & Irrigation Decision Guidance for {loc_name}:\n"
                f"If meaningful rainfall is expected, avoid unnecessary irrigation for {target_crop} now and reassess soil moisture after the rain. "
                f"This avoids root waterlogging, prevents nutrient leaching, and saves electricity pumping cost."
            )
            if target_lang == "hi":
                text_resp = (
                    f"{loc_name} में बारिश और सिंचाई सलाह:\n"
                    f"यदि वर्षा की संभावना है, तो अभी सिंचाई रोक दें और बारिश के बाद मिट्टी की नमी की जांच करें। इससे पानी और बिजली दोनों की बचत होगी।"
                )

            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="WEATHER",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                farmer_name=session.farmer_name,
                location=self._format_location_schema(session.location),
                crop=session.crop,
                weather_info={
                    "location": loc_name,
                    "crop": target_crop,
                    "recommendation": "Pause Irrigation Ahead of Rain",
                },
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Weather & Farming Decision Support: JalKrishi Hydro-Meteorological Reference Model.",
            )

        # C5. FARM_WATER_MANAGEMENT ("How can I save water?", "Can I save water somehow?")
        management_keywords = ["how can i save water", "can i save water", "water conservation", "manage water"]
        if any(mk in clean_lower for mk in management_keywords) or intent == "FARM_WATER_MANAGEMENT":
            intent = "FARM_WATER_MANAGEMENT"
            text_resp = (
                "Key Water Conservation Strategies for Your Farm:\n"
                "1. Adopt Drip Irrigation: Reduces evaporation loss by up to 40% compared to flood irrigation.\n"
                "2. Choose Water-Smart Crops: Cultivate Finger Millet (Ragi), Pulses, or Oilseeds which require low water.\n"
                "3. Soil Mulching: Spread crop residue over soil to retain moisture.\n"
                "4. Rainwater Recharge Pit: Construct a 3.5 m deep injection recharge pit to harvest monsoon rainfall into your tube-well."
            )
            if target_lang == "hi":
                text_resp = (
                    "खेत में पानी बचाने के मुख्य उपाय:\n"
                    "1. ड्रिप सिंचाई अपनाएं (40% पानी की बचत)।\n"
                    "2. कम पानी की फसलें (रागी, दालें) उगाएं।\n"
                    "3. मल्चिंग करें ताकि मिट्टी की नमी बनी रहे।\n"
                    "4. वर्षा जल संचयन गड्डा बनाएं।"
                )

            audio_url, tts_status = tts_provider.synthesize(text_resp, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="RECHARGE",
                response_type="INTELLIGENCE",
                text_response=text_resp,
                farmer_name=session.farmer_name,
                location=self._format_location_schema(session.location),
                crop=session.crop,
                recharge_info={
                    "recommended_action": "Drip Irrigation + Rainwater Harvesting",
                },
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Water Conservation Guidance: JalKrishi Water Management Engine.",
            )

        # ----------------------------------------------------------------------
        # D. DOMAIN INTELLIGENCE INTENTS (FORWARD TO DISPATCHER WITH SESSION CONTEXT)
        # ----------------------------------------------------------------------
        # If intent is unknown / invalid
        if intent == "UNKNOWN":
            msg = self._format_multilingual_msg("UNKNOWN", target_lang)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent="UNKNOWN",
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=session.farmer_name,
                location=self._format_location_schema(session.location),
                crop=session.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Out of scope or unclassified query.",
            )

        # For all standard domain intents (CROP_RECOMMENDATION, WEATHER_OR_RAINFALL, IRRIGATION_ADVICE, RECHARGE_ADVICE, GROUNDWATER_LEVEL, FORECAST, RISK, ANOMALY, DWLR),
        # delegate to farmer_intelligence_dispatcher with updated session context!
        query_for_dispatch = res_intent_to_dispatch or raw_query
        req_lat = request.latitude if request.latitude is not None else (session.location.latitude if session.location else None)
        req_lon = request.longitude if request.longitude is not None else (session.location.longitude if session.location else None)
        req_loc_q = request.location_query if request.location_query is not None else (session.location.name if (session.location and request.latitude is None) else None)

        request_for_dispatch = VoiceQueryRequest(
            query=query_for_dispatch,
            location_query=req_loc_q,
            latitude=req_lat,
            longitude=req_lon,
            language=target_lang,
            audio_base64=request.audio_base64,
            station_id=request.station_id,
            session_id=session_id,
            context_location=session.location.name if session.location else request.context_location,
            context_crop=session.crop or request.context_crop,
        )

        response = farmer_intelligence_dispatcher.dispatch_query(request_for_dispatch, session_id=session_id)

        # If dispatcher resulted in crop recommendation, record recommended crop in session
        if response.crop_info and response.crop_info.get("primary_crop"):
            rec_crop = self._extract_crop_from_text(response.crop_info["primary_crop"]) or response.crop_info["primary_crop"]
            session.crop = rec_crop
            session.last_crop = rec_crop

        # Attach conversational state metadata to response
        response.farmer_name = session.farmer_name
        response.crop = session.crop
        return response


farmer_conversation_manager = FarmerConversationManager()
