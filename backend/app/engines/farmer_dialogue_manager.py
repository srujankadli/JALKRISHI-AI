"""
JalKrishi AI — Conversational Farmer AI / Dialogue Manager
------------------------------------------------------------
Central multi-turn dialogue orchestration layer for JalKrishi AI.
Transforms single-turn farmer queries into interactive, contextual dialogues
while enforcing strict data provenance, 13-language multilingual support,
and the Minimum-Question Policy.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone

from app.config import settings
from app.models.schemas import (
    VoiceQueryRequest,
    VoiceQueryResponse,
    LocationInfoSchema,
    CoverageInfoSchema,
    GroundwaterLevelSchema,
    ProvenanceInfoSchema,
    GroundwaterIntelligenceSchema,
)
from app.pipeline.location_resolver import resolve_location, LocationResolution
from app.pipeline.dwlr_ingest import station_repo
from app.engines.farmer_intent_router import farmer_intent_router, IntentClassificationResult
from app.engines.farmer_intelligence_dispatcher import farmer_intelligence_dispatcher
from app.services.speech.multilingual_service import (
    SUPPORTED_LANGUAGES,
    LanguageDetector,
    stt_provider,
    tts_provider,
    hydro_translator,
)

logger = logging.getLogger("app.farmer_dialogue_manager")

# Standard agricultural crop lexicon across India
CROP_LEXICON = {
    "tomato": "tomato", "tamatar": "tomato", "ಟೊಮ್ಯಾಟೊ": "tomato", "தக்காளி": "tomato", "టమోటా": "tomato", "টমেটো": "tomato",
    "paddy": "paddy", "rice": "paddy", "dhan": "paddy", "chawal": "paddy", "ಭತ್ತ": "paddy", "நெல்": "paddy", "వరి": "paddy", "ধান": "paddy",
    "wheat": "wheat", "gehun": "wheat", "godhi": "wheat", "கோதுமை": "wheat", "గోధుమ": "wheat", "গম": "wheat", "ਕਣਕ": "wheat",
    "cotton": "cotton", "kapas": "cotton", "ಹತ್ತಿ": "cotton", "பருத்தி": "cotton", "పత్తి": "cotton", "তুলা": "cotton",
    "sugarcane": "sugarcane", "ganna": "sugarcane", "ಕಬ್ಬು": "sugarcane", "கரும்பு": "sugarcane", "చెరకు": "sugarcane", "আখ": "sugarcane",
    "maize": "maize", "corn": "maize", "makka": "maize", "ಮೆಕ್ಕೆಜೋಳ": "maize", "மக்காச்சோளம்": "maize", "మొక్కజొన్న": "maize",
    "finger millet": "ragi", "ragi": "ragi", "ರಾಗಿ": "ragi", "கேழ்வரகு": "ragi", "రాగి": "ragi",
    "groundnut": "groundnut", "peanut": "groundnut", "moongphali": "groundnut", "ಕಡಲೆಕಾಯಿ": "groundnut", "வேர்க்கடலை": "groundnut", "వేరుశనగ": "groundnut",
    "chickpea": "chickpea", "gram": "chickpea", "chana": "chickpea", "ಕಡಲೆ": "chickpea", "கொண்டைக்கடலை": "chickpea", "శనగలు": "chickpea",
    "onion": "onion", "pyaz": "onion", "kanda": "onion", "ಈರುಳ್ಳಿ": "onion", "வெங்காயம்": "onion", "ఉల్లిపాయ": "onion", "পেঁয়াজ": "onion",
    "potato": "potato", "aloo": "potato", "ಆಲೂಗಡ್ಡೆ": "potato", "உருளைக்கிழங்கு": "potato", "బంగాళాదుంప": "potato", "আলু": "potato",
    "mustard": "mustard", "sarson": "mustard", "ಸಾಸಿವೆ": "mustard", "கடுகு": "mustard", "ఆవాలు": "mustard", "সরিষা": "mustard",
    "soybean": "soybean", "soya": "soybean", "ಸೋಯಾಬೀನ್": "soybean", "சோயாபீன்": "soybean", "సోయాబీన్": "soybean",
    "pearl millet": "bajra", "bajra": "bajra", "ಸಜ್ಜೆ": "bajra", "கம்பு": "bajra", "సజ్జలు": "bajra",
    "sorghum": "jowar", "jowar": "jowar", "ಜೋಳ": "jowar", "சோளம்": "jowar", "జొన్నలు": "jowar",
}


class ConversationContext:
    """Multi-turn typed conversation slots for a farmer session."""
    def __init__(self, session_id: str = "default"):
        self.session_id: str = session_id
        self.farmer_name: Optional[str] = None
        self.location: Optional[LocationResolution] = None
        self.crop: Optional[str] = None
        self.growth_stage: Optional[str] = None
        self.irrigation_method: Optional[str] = None
        self.farmer_problem: Optional[str] = None
        self.last_intent: Optional[str] = None
        self.pending_intent: Optional[str] = None
        self.pending_question: Optional[str] = None
        self.last_response: Optional[str] = None
        self.last_crop: Optional[str] = None
        self.last_location: Optional[LocationResolution] = None
        self.conversation_turn: int = 0
        self.awaiting_location: bool = False
        self.awaiting_crop: bool = False


class FarmerDialogueManager:
    """
    Dialogue Manager orchestrating multi-turn context, location resolution,
    intent execution, and multilingual responses for JalKrishi AI.
    """
    def __init__(self):
        self._contexts: Dict[str, ConversationContext] = {}

    def get_context(self, session_id: str = "default") -> ConversationContext:
        if session_id not in self._contexts:
            self._contexts[session_id] = ConversationContext(session_id=session_id)
        return self._contexts[session_id]

    def reset_context(self, session_id: str = "default"):
        self._contexts[session_id] = ConversationContext(session_id=session_id)
        farmer_intent_router.reset_context(session_id)

    def _extract_crop(self, text: str) -> Optional[str]:
        clean = text.lower()
        for kw, canonical in CROP_LEXICON.items():
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
            latitude=loc.latitude or 0.0,
            longitude=loc.longitude or 0.0,
        )

    def _format_multilingual_prompt(self, key: str, lang: str, **kwargs) -> str:
        loc = kwargs.get("location", "")
        crop = kwargs.get("crop", "")
        name = kwargs.get("name", "Farmer")

        prompts: Dict[str, Dict[str, str]] = {
            "ASK_LOCATION": {
                "en": "Which location is your farm in?",
                "hi": "आपका खेत किस स्थान या जिले में स्थित है?",
                "kn": "ನಿಮ್ಮ ಜಮೀನು ಯಾವ ಸ್ಥಳ ಅಥವಾ ಜಿಲ್ಲೆಯಲ್ಲಿದೆ?",
                "ta": "உங்கள் பண்ணை எந்த இடம் அல்லது மாவட்டத்தில் உள்ளது?",
                "te": "మీ పొలం ఏ ప్రాంతం లేదా జిల్లాలో ఉంది?",
                "bn": "আপনার খামার কোন স্থানে বা জেলায় অবস্থিত?",
                "mr": "तुमचे शेत कोणत्या ठिकाणी किंवा जिल्ह्यात आहे?",
                "gu": "તમારું ખેતર કયા સ્થળે કે જિલ્લામાં આવેલું છે?",
                "ml": "നിങ്ങളുടെ ഫാം ഏത് സ്ഥലത്താണ് സ്ഥിതി ചെയ്യുന്നത്?",
                "pa": "ਤੁਹਾਡਾ ਖੇਤ ਕਿਹੜੇ ਸਥਾਨ ਜਾਂ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਹੈ?",
                "or": "ଆପଣଙ୍କ ଫାର୍ମ କେଉଁ ସ୍ଥାନ ବା ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ?",
                "as": "আপোনাৰ ফাৰ্ম কোনটো স্থান বা জিলাত অৱস্থিত?",
                "ur": "آپ کا فارم کس مقام یا ضلع میں واقع ہے؟",
            },
            "ASK_CROP": {
                "en": "Which crop are you growing or planning to grow?",
                "hi": "आप कौन सी फसल उगा रहे हैं या उगाने की योजना बना रहे हैं?",
                "kn": "ನೀವು ಯಾವ ಬೆಳೆಯನ್ನು ಬೆಳೆಯುತ್ತಿದ್ದೀರಿ ಅಥವಾ ಬೆಳೆಯಲು ಯೋಜಿಸುತ್ತಿದ್ದೀರಿ?",
                "ta": "நீங்கள் என்ன பயிர் வளர்க்கிறீர்கள் அல்லது பயிரிட திட்டமிட்டுள்ளீர்கள்?",
                "te": "మీరు ఏ పంట పండిస్తున్నారు లేదా పండించడానికి యోచిస్తున్నారు?",
                "bn": "আপনি কোন ফসল ফলাচ্ছেন বা ফলানোর পরিকল্পনা করছেন?",
                "mr": "तुम्ही कोणते पीक घेत आहात किंवा घेण्याचा विचार करत आहात?",
                "gu": "તમે કયો પાક ઉગાડી રહ્યા છો કે ઉગાડવાનું વિચારી રહ્યા છો?",
                "ml": "നിങ്ങൾ ഏത് വിളയാണ് കൃഷി ചെയ്യുന്നത്?",
                "pa": "ਤੁਸੀਂ ਕਿਹੜੀ ਫਸਲ ਉਗਾ ਰਹੇ ਹੋ?",
                "or": "ଆପଣ କେଉଁ ଫସଲ ଚାଷ କରୁଛନ୍ତି?",
                "as": "আপুনি কি শস্য খেতি কৰিছে?",
                "ur": "آپ کون سی فصل اگا رہے ہیں یا اگانے کا ارادہ رکھتے ہیں؟",
            },
            "GREETING": {
                "en": "Hello! I am your JalKrishi AI farmer assistant. How can I help with your farm today?",
                "hi": "नमस्ते! मैं आपका जलकृषि एआई किसान सहायक हूं। आज मैं आपके खेत और पानी के निर्णयों में कैसे मदद कर सकता हूं?",
                "kn": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಜಲಕೃಷಿ ಎಐ ರೈತ ಸಹಾಯಕ. ಇಂದು ನಿಮ್ಮ ಜಮೀನು ಮತ್ತು ನೀರಿನ ನಿರ್ಧಾರಗಳಲ್ಲಿ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
                "ta": "வணக்கம்! நான் உங்கள் ஜல்க்ரிஷி ஏஐ விவசாயி உதவியாளர். இன்று உங்கள் பண்ணை மற்றும் நீர் மேலாண்மையில் எவ்வாறு உதவட்டும்?",
                "te": "నమస్కారం! నేను మీ జల్‌కృషి ఏఐ రైతు సహాయకుడిని. ఈ రోజు మీ పొలం మరియు నీటి నిర్ణయాలలో నేను ఎలా సహాయపడగలను?",
                "bn": "নমস্কার! আমি আপনার জলকৃষি এআই কৃষক সহকারী। আজ আপনার খামার ও জল সিদ্ধান্তে আমি কিভাবে সাহায্য করতে পারি?",
                "mr": "नमस्कार! मी तुमचा जलकृषी एआय शेतकरी सहाय्यक आहे. आज मी तुमच्या शेतीच्या आणि पाण्याच्या निर्णयात कशी मदत करू?",
                "gu": "નમસ્તે! હું તમારો જલકૃષિ AI ખેડૂત સહાયક છું. આજે હું તમારા ખેતર અને પાણીના નિર્ણયોમાં કેવી રીતે મદદ કરી શકું?",
                "ml": "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ജൽകൃഷി എഐ കർഷക സഹായിയാണ്. നിങ്ങളുടെ ഫാമിനെ സഹായിക്കാൻ ഞാൻ എന്തുചെയ്യണം?",
                "pa": "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਜਲਕ੍ਰਿਸ਼ੀ ਏਆਈ ਕਿਸਾਨ ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੇ ਖੇਤ ਲਈ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
                "or": "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ ଜଳକୃଷି ଏଆଇ କୃଷକ ସହାୟକ। ଆଜି ମୁଁ ଆପଣଙ୍କ ଫାର୍ମ କାର୍ଯ୍ୟରେ କିପରି ସାହାଯ୍ୟ କରିବି?",
                "as": "নমস্কাৰ! মই আপোনাৰ জলকৃষি এআই কৃষক সহায়ক। আজি আপোনাৰ ফাৰ্মৰ সিদ্ধান্তত মই কেনেকৈ সহায় কৰিব পাৰো?",
                "ur": "سلام! میں آپ کا جل کرشی اے آئی کسان اسسٹنٹ ہوں۔ آج میں آپ کے فارم اور پانی کے معاملات میں کیسے مدد کر سکتا ہوں؟",
            },
            "IDENTITY": {
                "en": f"Nice to meet you, {name}. How can I help with your farm?",
                "hi": f"आपसे मिलकर खुशी हुई, {name}। मैं आपके खेत और पानी के निर्णयों में कैसे मदद कर सकता हूं?",
                "kn": f"ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿದ್ದಕ್ಕೆ ಸಂತೋಷವಾಗಿದೆ, {name}. ನಿಮ್ಮ ಜಮೀನಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
                "ta": f"உங்களை சந்தித்ததில் மகிழ்ச்சி, {name}. உங்கள் பண்ணைக்கு நான் எவ்வாறு உதவட்டும்?",
                "te": f"{name} గారూ, మిమ్మల్ని కలవడం సంతోషంగా ఉంది. మీ పొలానికి నేను ఎలా సహాయపడగలను?",
                "bn": f"আপনার সাথে পরিচিত হয়ে ভালো লাগলো, {name}। আপনার খামারে আমি কীভাবে সাহায্য করতে পারি?",
                "mr": f"तुम्हाला भेटून आनंद झाला, {name}. मी तुमच्या शेतात कशी मदत करू?",
                "gu": f"તમને મળીને આનંદ થયો, {name}. હું તમારા ખેતરમાં કેવી રીતે મદદ કરી શકું?",
                "ml": f"കണ്ടുമുട്ടിയതിൽ സന്തോഷം, {name}. നിങ്ങളുടെ ഫാമിനെ ഞാൻ എങ്ങനെ സഹായിക്കണം?",
                "pa": f"ਤੁਹਾਨੂੰ ਮਿਲ ਕੇ ਖੁਸ਼ੀ ਹੋਈ, {name}। ਮੈਂ ਤੁਹਾਡੇ ਖੇਤ ਲਈ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
                "or": f"ଆପଣଙ୍କୁ ଭେଟି ଖୁସି ଲାଗିଲା, {name}। ମୁଁ ଆପଣଙ୍କ ଫାର୍ମରେ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
                "as": f"আপোনাক লগ পাই ভাল লাগিল, {name}। আপোনাৰ ফাৰ্মত মই কেনেকৈ সহায় কৰিব পাৰো?",
                "ur": f"آپ سے مل کر خوشی ہوئی، {name}۔ میں آپ کے فارم میں کیسے مدد کر سکتا ہوں؟",
            },
            "LOCATION_ACK": {
                "en": f"Got it, farm location noted as {loc}. What would you like to know about groundwater, crops, or irrigation?",
                "hi": f"समझ गया, आपके खेत का स्थान {loc} दर्ज कर लिया गया है। आप भूजल, फसल या सिंचाई के बारे में क्या जानना चाहते हैं?",
                "kn": f"ತಿಳಿಯಿತು, ನಿಮ್ಮ ಜಮೀನಿನ ಸ್ಥಳ {loc} ಎಂದು ದಾಖಲಿಸಲಾಗಿದೆ. ಅಂತರ್ಜಲ, ಬೆಳೆ ಅಥವಾ ನೀರಾವರಿ ಬಗ್ಗೆ ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?",
                "ta": f"புரிந்தது, உங்கள் பண்ணை இருப்பிடம் {loc} என பதிவு செய்யப்பட்டது. நிலத்தடி நீர், பயிர் அல்லது பாசனம் குறித்து என்ன அறிய விரும்புகிறீர்கள்?",
                "te": f"అర్థమైంది, మీ పొలం ప్రాంతం {loc} గా నమోదు చేయబడింది. భూగర్భ జలాలు, పంటలు లేదా సాగునీటి గురించి మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
                "bn": f"বুঝেছি, আপনার খামারের অবস্থান {loc} হিসেবে নথিভুক্ত হয়েছে। আপনি ভূগর্ভস্থ জল, ফসল বা সেচ সম্পর্কে কী জানতে চান?",
                "mr": f"समजले, तुमच्या शेताचे स्थान {loc} नोंदवले आहे. तुम्हाला भूजल, पीक किंवा सिंचनाबद्दल काय जाणून घ्यायचे आहे?",
                "gu": f"સમજાયું, તમારા ખેતરનું સ્થાન {loc} નોંધવામાં આવ્યું છે. તમે ભૂગર્ભજળ, પાક અથવા સિંચાઈ વિશે શું જાણવા માંગો છો?",
                "ml": f"മനസ്സിലായി, നിങ്ങളുടെ ഫാമിന്റെ സ്ഥലം {loc} ആയി രേഖപ്പെടുത്തി. ഭൂഗർഭജലം, വിള അല്ലെങ്കിൽ ജലസേചനം എന്നിവയെക്കുറിച്ച് എന്താണ് അറിയേണ്ടത്?",
                "pa": f"ਸਮਝ ਗਿਆ, ਤੁਹਾਡੇ ਖੇਤ ਦਾ ਸਥਾਨ {loc} ਦਰਜ ਕਰ ਲਿਆ ਗਿਆ ਹੈ। ਤੁਸੀਂ ਧਰਤੀ ਹੇਠਲੇ ਪਾਣੀ, ਫਸਲ ਜਾਂ ਸਿੰਚਾਈ ਬਾਰੇ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
                "or": f"ବୁଝିଗଲି, ଆପଣଙ୍କ ଫାର୍ମ ସ୍ଥାନ {loc} ଭାବେ ଲିପିବଦ୍ଧ ହେଲା। ଆପଣ ଭୂତଳ ଜଳ, ଫସଲ ବା ଜଳସେଚନ ବିଷୟରେ କ’ଣ ଜାଣିବାକୁ ଚାହାଁନ୍ତି?",
                "as": f"বুজি পালোঁ, আপোনাৰ ফাৰ্মৰ স্থান {loc} হিচাপে অন্তৰ্ভুক্ত কৰা হ'ল। আপুনি ভূগৰ্ভস্থ পানী, শস্য বা জলসিঞ্চন বিষয়ে কি জানিব বিচাৰে?",
                "ur": f"سمجھ گیا، آپ کے فارم کا مقام {loc} درج کر لیا گیا ہے۔ آپ زیر زمین پانی، فصل یا آبپاشی کے بارے میں کیا جاننا چاہتے ہیں؟",
            },
            "RESET": {
                "en": "Conversation context cleared. How can I help you afresh with your farm?",
                "hi": "बातचीत का संदर्भ साफ कर दिया गया है। मैं आपके खेत के लिए नए सिरे से क्या मदद कर सकता हूँ?",
                "kn": "ಸಂಭಾಷಣೆಯ ಸಂದರ್ಭವನ್ನು ತೆರವುಗೊಳಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಜಮೀನಿಗೆ ನಾನು ಹೊಸದಾಗಿ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
                "ta": "உரையாடல் சூழல் அழிக்கப்பட்டது. உங்கள் பண்ணைக்கு புதிதாக எவ்வாறு உதவட்டும்?",
                "te": "సంభాషణ సందర్భం తొలగించబడింది. మీ పొలానికి నేను కొత్తగా ఎలా సహాయపడగలను?",
                "bn": "কথোপকথনের প্রসঙ্গ পরিষ্কার করা হয়েছে। আপনার খামারের জন্য আমি কীভাবে নতুন করে সাহায্য করতে পারি?",
                "mr": "संभाषणाचा संदर्भ साफ केला आहे. मी तुमच्या शेतीसाठी नव्याने कशी मदत करू?",
                "gu": "વાતચીતનો સંદર્ભ સાફ કરવામાં આવ્યો છે. હું તમારા ખેતર માટે નવેસરથી કેવી રીતે મદદ કરી શકું?",
                "ml": "സംഭാഷണ സന്ദർഭം മായ്‌ച്ചു. നിങ്ങളുടെ ഫാമിനെ പുതിയതായി എങ്ങനെ സഹായിക്കണം?",
                "pa": "ਗੱਲਬਾਤ ਦਾ ਸੰਦਰਭ ਸਾਫ਼ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਮੈਂ ਤੁਹਾਡੇ ਖੇਤ ਲਈ ਨਵੇਂ ਸਿਰੇ ਤੋਂ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
                "or": "କଥାବାର୍ତ୍ତା ପ୍ରସଙ୍ଗ ସଫା କରାଗଲା। ଆପଣଙ୍କ ଫାର୍ମ ପାଇଁ ମୁଁ ନୂଆ କରି କିପରି ସାହାଯ୍ୟ କରିବି?",
                "as": "কথোপকথনৰ প্ৰসংগ আঁতৰোৱা হ'ল। আপোনাৰ ফাৰ্মৰ বাবে মই নতুনকৈ কেনেকৈ সহায় কৰিব পাৰো?",
                "ur": "گفتگو کا سیاق و سباق صاف کر دیا گیا ہے۔ میں آپ کے فارم کے لیے نئے سرے سے کیسے مدد کر سکتا ہوں؟",
            }
        }

        default_map = prompts.get(key, {})
        return default_map.get(lang, default_map.get("en", "How can I assist your farm today?"))

    def process_farmer_message(
        self,
        request: VoiceQueryRequest,
        session_id: str = "default"
    ) -> VoiceQueryResponse:
        """
        Main Dialogue Pipeline:
        1. Context extraction & slot filling
        2. Strict location resolution hierarchy
        3. Multi-turn follow-up & pronoun resolution
        4. Problem intent routing with cautious advice
        5. Intelligence dispatching with full data provenance
        """
        ctx = self.get_context(session_id)
        ctx.conversation_turn += 1

        raw_query = (request.query or "").strip()
        clean_lower = raw_query.lower()

        # 1. Language Resolution
        detected_lang = LanguageDetector.detect_language(raw_query, default=request.language or "en")
        target_lang = request.language if request.language in [l.language_code for l in SUPPORTED_LANGUAGES] else detected_lang

        # 2. Context Seeding from Request Parameters
        if request.context_location:
            c_loc = resolve_location(query_text=request.context_location)
            if c_loc.is_resolved:
                ctx.location = c_loc
                ctx.last_location = c_loc
                farmer_intent_router.get_context(session_id).last_location = c_loc

        if request.context_crop:
            c_crop = self._extract_crop(request.context_crop) or request.context_crop
            ctx.crop = c_crop
            ctx.last_crop = c_crop

        # 3. Context Reset Trigger Check
        reset_patterns = [
            r"\bstart over\b", r"\breset\b", r"\breset conversation\b", r"\bnew conversation\b",
            r"\bforget that\b", r"\bshuru se\b", r"\bphir se\b", r"\bpehle se\b", r"\bclear context\b",
            r"\bಮತ್ತೆ ಶುರು\b", r"\bಮೊದಲಿನಿಂದ\b", r"\bமீண்டும் தொடங்கு\b", r"\bమొదటి నుండి\b", r"\bਦੁਬਾਰਾ ਸ਼ੁਰੂ\b"
        ]
        if any(re.search(pat, clean_lower) for pat in reset_patterns):
            self.reset_context(session_id)
            reset_msg = self._format_multilingual_prompt("RESET", target_lang)
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

        # 4. Extract Crop Mention in Current Query
        query_crop = self._extract_crop(raw_query)
        if query_crop:
            ctx.crop = query_crop
            ctx.last_crop = query_crop

        # 5. Extract Location Mention in Current Query
        query_loc = resolve_location(
            location_query=request.location_query,
            query_text=raw_query,
            latitude=request.latitude,
            longitude=request.longitude,
            station_id=request.station_id,
        )

        # Unresolved explicit location check: If caller provided explicit location_query that cannot be resolved
        if request.location_query and not (query_loc and query_loc.is_resolved):
            return farmer_intelligence_dispatcher.dispatch_query(request, session_id=session_id)

        # Strict Location Priority: Explicit location in current query OVERRIDES prior location
        if query_loc and query_loc.is_resolved and query_loc.name:
            ctx.location = query_loc
            ctx.last_location = query_loc
            farmer_intent_router.get_context(session_id).last_location = query_loc

        # 6. Check for Contextual References & Pronouns ("it", "that crop", "how much water does it need")
        pronoun_crop_patterns = [
            r"\bhow much water does it need\b", r"\bhow much water it needs\b", r"\bdoes it need\b",
            r"\bwater for it\b", r"\bwater requirement of it\b", r"\bwhen to water it\b",
            r"\bhow much water\b", r"\bthat crop\b", r"\bthis crop\b", r"\bis fasal\b", r"\bee bele\b",
            r"\bhow much water should i give it\b"
        ]
        is_pronoun_crop_query = any(re.search(pat, clean_lower) for pat in pronoun_crop_patterns)
        if is_pronoun_crop_query and not query_crop and ctx.last_crop:
            ctx.crop = ctx.last_crop

        # 7. Check if Query is an Answer to a Pending Location / Crop Question
        if ctx.pending_intent and ctx.pending_question == "LOCATION" and ctx.location and ctx.location.is_resolved:
            resolved_intent = ctx.pending_intent
            ctx.pending_intent = None
            ctx.pending_question = None
            ctx.awaiting_location = False
            if resolved_intent == "CROP_HEALTH_PROBLEM":
                return self._handle_farmer_problem(
                    intent="CROP_HEALTH_PROBLEM",
                    raw_query=raw_query,
                    target_lang=target_lang,
                    detected_lang=detected_lang,
                    ctx=ctx,
                    session_id=session_id,
                    request=request,
                    is_completed_intelligence=True
                )
            return self._execute_intelligence_intent(
                intent=resolved_intent,
                query_text=raw_query,
                target_lang=target_lang,
                detected_lang=detected_lang,
                ctx=ctx,
                session_id=session_id,
                request=request
            )

        if ctx.pending_intent and ctx.pending_question == "CROP" and ctx.crop:
            resolved_intent = ctx.pending_intent
            ctx.pending_intent = None
            ctx.pending_question = None
            if resolved_intent == "CROP_HEALTH_PROBLEM":
                if not (ctx.location and ctx.location.is_resolved):
                    ctx.pending_intent = "CROP_HEALTH_PROBLEM"
                    ctx.pending_question = "LOCATION"
                    ctx.awaiting_location = True
                    msg = self._format_multilingual_prompt("ASK_LOCATION", target_lang)
                    audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
                    return VoiceQueryResponse(
                        query_text=raw_query,
                        detected_language=detected_lang,
                        farmer_response_language=target_lang,
                        intent="CROP_HEALTH_PROBLEM",
                        intent_category="AGRICULTURAL_PROBLEM",
                        response_type="CONVERSATIONAL",
                        text_response=msg,
                        farmer_name=ctx.farmer_name,
                        location=None,
                        crop=ctx.crop,
                        awaiting_location=True,
                        pending_intent="CROP_HEALTH_PROBLEM",
                        audio_url=audio_url,
                        voice_playback_available=audio_url is not None,
                        stt_provider_status=stt_provider.status,
                        tts_provider_status=tts_status,
                        disclaimer="Conversational Assistant: Location needed for crop health evaluation.",
                    )
                else:
                    return self._handle_farmer_problem(
                        intent="CROP_HEALTH_PROBLEM",
                        raw_query=raw_query,
                        target_lang=target_lang,
                        detected_lang=detected_lang,
                        ctx=ctx,
                        session_id=session_id,
                        request=request,
                        is_completed_intelligence=True
                    )
            return self._execute_intelligence_intent(
                intent=resolved_intent,
                query_text=raw_query,
                target_lang=target_lang,
                detected_lang=detected_lang,
                ctx=ctx,
                session_id=session_id,
                request=request
            )

        # 8. Check contextual follow-up with pronoun for irrigation/crop water requirement
        if is_pronoun_crop_query and ctx.location and ctx.location.is_resolved:
            return self._execute_intelligence_intent(
                intent="IRRIGATION_ADVICE",
                query_text=raw_query,
                target_lang=target_lang,
                detected_lang=detected_lang,
                ctx=ctx,
                session_id=session_id,
                request=request
            )

        # 9. Detect New Farmer Problem Intents
        problem_intent = self._detect_farmer_problem_intent(clean_lower)
        if problem_intent:
            return self._handle_farmer_problem(
                intent=problem_intent,
                raw_query=raw_query,
                target_lang=target_lang,
                detected_lang=detected_lang,
                ctx=ctx,
                session_id=session_id,
                request=request
            )

        # 10. Intent Classification via Router
        intent_res = farmer_intent_router.classify_intent(
            raw_query,
            language=target_lang,
            session_id=session_id,
            location_query=request.location_query,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        intent = intent_res.intent

        # Store farmer name if introduced
        if intent_res.extracted_name:
            ctx.farmer_name = intent_res.extracted_name

        # 11. Handle Pure Conversational Intents (GREETING, IDENTITY, CAPABILITIES, THANKS, GOODBYE)
        if intent == "GREETING":
            msg = self._format_multilingual_prompt("GREETING", target_lang)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=ctx.farmer_name,
                location=None,
                crop=ctx.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Greeting response.",
            )

        if intent == "IDENTITY_INTRODUCTION":
            fname = ctx.farmer_name or intent_res.extracted_name or "Farmer"
            msg = self._format_multilingual_prompt("IDENTITY", target_lang, name=fname)
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
                crop=ctx.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Farmer identity introduction.",
            )

        if intent == "LOCATION_SELECTION":
            loc_name = ctx.location.name if (ctx.location and ctx.location.is_resolved) else (intent_res.extracted_location.name if intent_res.extracted_location else "your location")
            msg = self._format_multilingual_prompt("LOCATION_ACK", target_lang, location=loc_name)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=ctx.farmer_name,
                location=self._format_location_schema(ctx.location or intent_res.extracted_location),
                crop=ctx.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Location acknowledged.",
            )

        if intent in ["CAPABILITIES", "THANKS", "GOODBYE"]:
            msg = farmer_intent_router.generate_conversational_response(
                intent=intent,
                lang=target_lang,
                user_name=ctx.farmer_name,
                location_name=ctx.location.name if ctx.location else None
            )
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category="CONVERSATIONAL",
                response_type="CONVERSATIONAL",
                text_response=msg,
                farmer_name=ctx.farmer_name,
                location=self._format_location_schema(ctx.location),
                crop=ctx.crop,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer=f"Conversational Assistant: {intent} response.",
            )

        # 12. Intelligence Intent Handling with Minimum-Question Policy
        location_required_intents = {
            "GROUNDWATER_LEVEL", "GROUNDWATER_FORECAST", "GROUNDWATER_RISK",
            "GROUNDWATER_ANOMALY", "CROP_RECOMMENDATION", "IRRIGATION_ADVICE",
            "RECHARGE_ADVICE", "DWLR_STATION", "WEATHER_OR_RAINFALL", "PROACTIVE_STATUS"
        }

        active_loc = ctx.location if (ctx.location and ctx.location.is_resolved) else (intent_res.extracted_location if (intent_res.extracted_location and intent_res.extracted_location.is_resolved) else None)

        if intent in location_required_intents and not active_loc:
            # Minimum Question Policy: Ask ONLY for the single missing location slot
            ctx.pending_intent = intent
            ctx.pending_question = "LOCATION"
            ctx.awaiting_location = True
            msg = self._format_multilingual_prompt("ASK_LOCATION", target_lang)
            audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
            return VoiceQueryResponse(
                query_text=raw_query,
                detected_language=detected_lang,
                farmer_response_language=target_lang,
                intent=intent,
                intent_category=intent,
                response_type="CONVERSATIONAL",
                text_response=msg,
                location_required=True,
                awaiting_location=True,
                pending_intent=intent,
                audio_url=audio_url,
                voice_playback_available=audio_url is not None,
                stt_provider_status=stt_provider.status,
                tts_provider_status=tts_status,
                disclaimer="Conversational Assistant: Location required for agricultural intelligence.",
            )

        # If location is present, execute intelligence
        if intent in location_required_intents:
            return self._execute_intelligence_intent(
                intent=intent,
                query_text=raw_query,
                target_lang=target_lang,
                detected_lang=detected_lang,
                ctx=ctx,
                session_id=session_id,
                request=request
            )

        # 13. Fallback Unknown Intent
        msg = "I can help with groundwater levels, crop recommendations, irrigation schedules, and weather forecasts. What would you like to know?"
        if target_lang != "en":
            msg = hydro_translator.translate_text(msg, target_lang)
        audio_url, tts_status = tts_provider.synthesize(msg, target_lang)
        return VoiceQueryResponse(
            query_text=raw_query,
            detected_language=detected_lang,
            farmer_response_language=target_lang,
            intent="UNKNOWN",
            intent_category="CONVERSATIONAL",
            response_type="CONVERSATIONAL",
            text_response=msg,
            farmer_name=ctx.farmer_name,
            location=self._format_location_schema(ctx.location),
            crop=ctx.crop,
            audio_url=audio_url,
            voice_playback_available=audio_url is not None,
            stt_provider_status=stt_provider.status,
            tts_provider_status=tts_status,
            disclaimer="Conversational Assistant: Clarification request.",
        )

    def _detect_farmer_problem_intent(self, clean_lower: str) -> Optional[str]:
        """
        Detects specific agricultural problems without generating fake diagnoses.
        """
        # A. Crop Health Problem
        health_patterns = [
            r"\bleaves are yellow\b", r"\byellow leaves\b", r"\bleaf yellowing\b", r"\bleaves turning yellow\b",
            r"\byellow leaves problem\b", r"\bpest\b", r"\bdisease\b", r"\bwilting\b", r"\bleaf curl\b", r"\bfungal\b",
            r"\bpattiyan peeli\b", r"\bpeela padna\b", r"\bkeeda lag gaya\b", r"\bkeeda\b",
            r"\bಎಲೆ ಹಳದಿ\b", r"\bಕೀಟ ಬಾಧೆ\b", r"\bஇலை மஞ்சள்\b", r"\bபூச்சித் தாக்குதல்\b",
            r"\bఆకులు పసుపు\b", r"\bపురుగు మందు\b", r"\bপাতা হলুদ\b", r"\bਕੀੜਾ\b"
        ]
        if any(re.search(pat, clean_lower) for pat in health_patterns):
            return "CROP_HEALTH_PROBLEM"

        # B. Water Shortage
        shortage_patterns = [
            r"\bwater shortage\b", r"\bwater shortage problem\b", r"\bshortage of water\b",
            r"\bwell is drying\b", r"\bwell drying\b", r"\bborewell drying\b", r"\bwater drying up\b",
            r"\bno water in well\b", r"\bwell dried\b", r"\bborewell failed\b", r"\bwater table dropping fast\b",
            r"\bpaani sookh raha\b", r"\bkuan sookh gaya\b", r"\bborewell mein paani kam\b",
            r"\bಬೋರ್‌ವೆಲ್ ನೀರು ಕಡಿಮೆಯಾಗಿದೆ\b", r"\bಬಾವಿ ಒಣಗುತ್ತಿದೆ\b", r"\bகிணறு வற்றுகிறது\b",
            r"\bబోరుబావిలో నీరు తగ్గింది\b", r"\bబావి ఎండిపోతోంది\b", r"\bকুয়ো শুকিয়ে যাচ্ছে\b"
        ]
        if any(re.search(pat, clean_lower) for pat in shortage_patterns):
            return "WATER_SHORTAGE"

        # C. Farm Water Management
        water_mgmt_patterns = [
            r"\bhow can i save water\b", r"\bhow to save water\b", r"\bwater conservation\b",
            r"\bways to save water\b", r"\bwater management on farm\b", r"\bpaani kaise bachaye\b",
            r"\bనీటిని ఎలా ఆదా చేయాలి\b", r"\bನೀರು ಉಳಿತಾಯ ಹೇಗೆ\b", r"\bதண்ணீர் சேமிப்பு\b"
        ]
        if any(re.search(pat, clean_lower) for pat in water_mgmt_patterns):
            return "FARM_WATER_MANAGEMENT"

        # D. Crop Water Requirement
        water_req_patterns = [
            r"\bhow much water does .+ need\b", r"\bwater requirement of\b", r"\bhow much water for\b",
            r"\bwater budget\b", r"\bkitna paani chahiye\b", r"\bಎಷ್ಟು ನೀರು ಬೇಕು\b", r"\bఎంత నీరు కావాలి\b"
        ]
        if any(re.search(pat, clean_lower) for pat in water_req_patterns):
            return "CROP_WATER_REQUIREMENT"

        # E. Weather Impact on Crop
        weather_impact_patterns = [
            r"\bheavy rain damage\b", r"\bwill rain damage\b", r"\bexcess rain on\b",
            r"\bwaterlogging\b", r"\brain impact on crop\b", r"\bbarish se fasal ko nuksan\b",
            r"\bಮಳೆಯಿಂದ ಬೆಳೆಗೆ ಹಾನಿ\b", r"\bமழையால் பயிர் பாதிப்பு\b", r"\bవర్షం వల్ల పంట నష్టం\b"
        ]
        if any(re.search(pat, clean_lower) for pat in weather_impact_patterns):
            return "WEATHER_IMPACT_ON_CROP"

        return None

    def _handle_farmer_problem(
        self,
        intent: str,
        raw_query: str,
        target_lang: str,
        detected_lang: str,
        ctx: ConversationContext,
        session_id: str,
        request: VoiceQueryRequest,
        is_completed_intelligence: bool = False
    ) -> VoiceQueryResponse:
        """
        Provides cautious, factual agricultural problem guidance without fake definitive diagnoses.
        """
        loc_name = ctx.location.name if (ctx.location and ctx.location.is_resolved) else None
        crop_name = ctx.crop or "your crop"
        response_type = "INTELLIGENCE" if is_completed_intelligence or (ctx.location and ctx.location.is_resolved) else "CONVERSATIONAL"

        if intent == "CROP_HEALTH_PROBLEM":
            if not ctx.crop:
                ctx.pending_intent = "CROP_HEALTH_PROBLEM"
                ctx.pending_question = "CROP"
                msg = (
                    "Yellowing leaves or crop stress can stem from several factors, including moisture stress, soil nutrient imbalance, pests, or fungal infection. "
                    "Which crop are you growing so I can give specific guidance?"
                )
                response_type = "CONVERSATIONAL"
            elif not (ctx.location and ctx.location.is_resolved):
                ctx.pending_intent = "CROP_HEALTH_PROBLEM"
                ctx.pending_question = "LOCATION"
                ctx.awaiting_location = True
                msg = self._format_multilingual_prompt("ASK_LOCATION", target_lang)
                response_type = "CONVERSATIONAL"
            else:
                msg = (
                    f"Crop Health Advisory for {crop_name} in {loc_name or 'your area'}: "
                    "1) Check soil root-zone moisture (under-watering causes yellowing from leaf tips, while over-watering causes lower leaf yellowing and root rot). "
                    "2) Verify nitrogen and iron availability. 3) Inspect underside of leaves for sucking pests or fungal spotting. "
                    "If symptoms persist, consult your local Krishi Vigyan Kendra (KVK) extension officer."
                )
                response_type = "INTELLIGENCE"

        elif intent == "WATER_SHORTAGE":
            loc_str = f" in {loc_name}" if loc_name else ""
            msg = (
                f"Groundwater stress mitigation{loc_str}: 1) Shift to drip or micro-sprinkler irrigation to reduce water application by 40–50%, "
                "2) Apply crop residue or plastic mulch to conserve topsoil moisture, 3) Schedule irrigation during early morning or night to minimize evaporation, "
                "4) Prioritize critical growth stages (flowering/grain filling) and reduce watering during vegetative stages."
            )

        elif intent == "FARM_WATER_MANAGEMENT":
            msg = (
                "Key farm water conservation practices: 1) Drip or micro-sprinkler systems (saves 40–50% water vs flood irrigation), "
                "2) Organic or plastic mulching to preserve topsoil moisture, 3) Night-time irrigation (9 PM – 5 AM) to reduce evaporative loss, "
                "4) Farm-pond rainwater harvesting for localized groundwater recharge."
            )

        elif intent == "CROP_WATER_REQUIREMENT":
            msg = (
                f"Water requirement for {crop_name}: Most seasonal crops require 400–600 mm of water throughout the lifecycle, equivalent to 4–6 cm depth per irrigation cycle. "
                "Maintain soil moisture at field capacity during flowering and fruit setting stages to avoid yield loss."
            )

        elif intent == "WEATHER_IMPACT_ON_CROP":
            msg = (
                f"To protect {crop_name} from heavy rainfall and waterlogging: 1) Ensure clear field drainage channels to prevent standing water around root zones, "
                "2) Postpone fertilizer and pesticide applications until rain subsides, 3) Inspect for fungal collar rot immediately following prolonged saturation."
            )
        else:
            msg = "How can I help you manage your farm and water resources today?"

        if target_lang != "en":
            translated_msg = hydro_translator.translate_text(msg, target_lang)
        else:
            translated_msg = msg

        audio_url, tts_status = tts_provider.synthesize(translated_msg, target_lang)
        return VoiceQueryResponse(
            query_text=raw_query,
            detected_language=detected_lang,
            farmer_response_language=target_lang,
            intent=intent,
            intent_category="AGRICULTURAL_PROBLEM",
            response_type=response_type,
            text_response=translated_msg,
            farmer_name=ctx.farmer_name,
            location=self._format_location_schema(ctx.location),
            crop=ctx.crop,
            awaiting_location=ctx.awaiting_location,
            pending_intent=ctx.pending_intent,
            audio_url=audio_url,
            voice_playback_available=audio_url is not None,
            stt_provider_status=stt_provider.status,
            tts_provider_status=tts_status,
            disclaimer="Conversational Assistant: Cautious agricultural decision support.",
        )

    def _execute_intelligence_intent(
        self,
        intent: str,
        query_text: str,
        target_lang: str,
        detected_lang: str,
        ctx: ConversationContext,
        session_id: str,
        request: VoiceQueryRequest
    ) -> VoiceQueryResponse:
        """
        Executes domain intelligence engine via dispatcher with context location & crop.
        Preserves complete data provenance (Mode A DIRECT_DWLR vs Mode B SATELLITE_ASSISTED).
        """
        active_lat = ctx.location.latitude if ctx.location else request.latitude
        active_lon = ctx.location.longitude if ctx.location else request.longitude
        
        # When location was resolved from coordinates without a named place, do not send synthetic coordinate string as location_query
        if ctx.location and ctx.location.name and not ctx.location.name.startswith("Coordinates ("):
            active_loc_name = ctx.location.name
        else:
            active_loc_name = request.location_query

        intel_req = VoiceQueryRequest(
            query=query_text,
            language=target_lang,
            latitude=active_lat,
            longitude=active_lon,
            location_query=active_loc_name,
            session_id=session_id,
            context_location=active_loc_name,
            context_crop=ctx.crop or ctx.last_crop,
            station_id=request.station_id,
        )

        res = farmer_intelligence_dispatcher.dispatch_query(intel_req, session_id=session_id)

        ctx.last_intent = intent
        ctx.last_response = res.text_response
        ctx.pending_intent = None
        ctx.pending_question = None
        ctx.awaiting_location = False

        return res

    # Alias for backward compatibility
    process_message = process_farmer_message


# Global singleton instance
farmer_dialogue_manager = FarmerDialogueManager()
