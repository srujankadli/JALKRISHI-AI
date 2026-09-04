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
        from app.engines.farmer_dialogue_manager import farmer_dialogue_manager
        return farmer_dialogue_manager.process_message(request, session_id=session_id)


farmer_conversation_manager = FarmerConversationManager()

