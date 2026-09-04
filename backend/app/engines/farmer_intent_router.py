"""
JalKrishi AI — Semantic & Tolerant Farmer Intent Router Module
--------------------------------------------------------------
Classifies farmer queries (spoken or typed) into canonical intents across 13 Indian regional languages.
Uses pre-normalization typo tolerance, weighted semantic scoring, and context memory.

Supports 16 Canonical Intents:
- GREETING
- IDENTITY_INTRODUCTION
- CAPABILITIES
- GROUNDWATER_LEVEL
- GROUNDWATER_FORECAST
- GROUNDWATER_RISK
- GROUNDWATER_ANOMALY
- CROP_RECOMMENDATION
- IRRIGATION_ADVICE
- RECHARGE_ADVICE
- DWLR_STATION
- WEATHER_OR_RAINFALL
- THANKS
- GOODBYE
- GENERAL_FARMING
- UNKNOWN
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from app.pipeline.location_resolver import resolve_location, LocationResolution
from app.services.speech.multilingual_service import LanguageDetector


@dataclass
class IntentClassificationResult:
    intent: str
    response_type: str  # "CONVERSATIONAL" or "INTELLIGENCE"
    extracted_name: Optional[str] = None
    extracted_location: Optional[LocationResolution] = None
    confidence: float = 1.0
    matched_pattern: Optional[str] = None


@dataclass
class ConversationSessionContext:
    last_location: Optional[LocationResolution] = None
    last_crop: Optional[str] = None
    last_intent: Optional[str] = None
    farmer_name: Optional[str] = None


# Common farmer typo normalization dictionary
TYPO_CORRECTIONS = {
    "advicer": "advisor",
    "advisr": "advisor",
    "adviser": "advisor",
    "advic": "advice",
    "recomentation": "recommendation",
    "recomended": "recommended",
    "recomending": "recommending",
    "irrigtion": "irrigation",
    "irigation": "irrigation",
    "groundwatr": "groundwater",
    "goundwater": "groundwater",
    "ground-water": "groundwater",
    "recharg": "recharge",
    "rainfal": "rainfall",
    "weathr": "weather",
    "crop-advisor": "crop advisor",
}


class FarmerIntentRouter:
    """
    Semantic, Weighted & Tolerant Intent Router for JalKrishi AI.
    Routes query to CONVERSATIONAL or INTELLIGENCE pipelines.
    """

    def __init__(self):
        self._session_contexts: Dict[str, ConversationSessionContext] = {}

    def get_context(self, session_id: str = "default") -> ConversationSessionContext:
        if session_id not in self._session_contexts:
            self._session_contexts[session_id] = ConversationSessionContext()
        return self._session_contexts[session_id]

    def reset_context(self, session_id: str = "default"):
        self._session_contexts[session_id] = ConversationSessionContext()

    def _normalize_text(self, text: str) -> str:
        clean = text.lower().strip()
        clean = re.sub(r"[^\w\s\u0900-\u0D7F]", " ", clean)
        words = clean.split()
        normalized_words = [TYPO_CORRECTIONS.get(w, w) for w in words]
        return " ".join(normalized_words)

    def classify_intent(
        self,
        query: str,
        language: Optional[str] = None,
        session_id: str = "default"
    ) -> IntentClassificationResult:
        raw_text = (query or "").strip()
        if not raw_text:
            return IntentClassificationResult(
                intent="GREETING",
                response_type="CONVERSATIONAL",
                confidence=1.0
            )

        clean = self._normalize_text(raw_text)
        detected_lang = language or LanguageDetector.detect_language(raw_text, default="en")
        ctx = self.get_context(session_id)

        # ----------------------------------------------------------------------
        # 1. CONVERSATIONAL INTENT CHECK: IDENTITY INTRODUCTION
        # ("My name is Srujan", "I am a farmer", "My name is Bengaluru")
        # ----------------------------------------------------------------------
        name_patterns = [
            r"(?:my name is|i am|myself|this is|i'm|name is|naam hai|hesaru|peyar|peru|naam)\s+([a-zA-Z\u0900-\u0D7F]+)",
            r"मेरा नाम\s+([a-zA-Z\u0900-\u097F]+)",
            r"ನನ್ನ ಹೆಸರು\s+([a-zA-Z\u0C80-\u0CFF]+)",
            r"என் பெயர்\s+([a-zA-Z\u0B80-\u0BFF]+)",
            r"నా పేరు\s+([a-zA-Z\u0C00-\u0C7F]+)",
            r"আমার নাম\s+([a-zA-Z\u0980-\u09FF]+)",
            r"माझे नाव\s+([a-zA-Z\u0900-\u097F]+)",
            r"મારું નામ\s+([a-zA-Z\u0A80-\u0AFF]+)",
            r"میرا نام\s+([a-zA-Z\u0600-\u06FF]+)",
        ]

        intro_keywords = [
            "my name is", "i am a farmer", "i'm a farmer", "i am srujan", "mera naam", "main kisan hoon",
            "nanna hesaru", "en peyar", "naa peru", "amar naam", "maaza naav", "maru naam",
            "मेरा नाम", "मैं किसान हूँ", "ನನ್ನ ಹೆಸರು", "ನಾನು ರೈತ", "என் பெயர்", "நான் விவசாயி",
            "నా పేరు", "నేను రైతును", "আমার নাম", "আমি কৃষক", "माझे नाव", "मी शेतकरी", "મારું નામ"
        ]

        for kw in intro_keywords:
            if kw in clean:
                extracted_name = None
                for pat in name_patterns:
                    m = re.search(pat, raw_text, re.IGNORECASE)
                    if m:
                        candidate = m.group(1).strip()
                        if candidate.lower() not in ["a", "the", "farmer", "kisan", "raitha", "vivasayi"]:
                            extracted_name = candidate
                            ctx.farmer_name = extracted_name
                            break
                return IntentClassificationResult(
                    intent="IDENTITY_INTRODUCTION",
                    response_type="CONVERSATIONAL",
                    extracted_name=extracted_name or ctx.farmer_name or "Farmer",
                    confidence=0.98,
                    matched_pattern=kw
                )

        # ----------------------------------------------------------------------
        # 2. CONVERSATIONAL INTENT CHECK: GREETINGS ("Hello", "Namaste", "Hi")
        # ----------------------------------------------------------------------
        greetings = [
            "hello", "hi", "namaste", "namaskar", "namaskara", "vanakkam", "sat sri akal",
            "assalamu alaikum", "good morning", "good afternoon", "good evening", "hey",
            "नमस्ते", "नमस्कार", "राम राम", "जय श्री राम", "शुभ प्रभात", "ನಮಸ್ಕಾರ", "ಹಲೋ", "ಹಾಯ್",
            "ಶುಭೋದಯ", "வணக்கம்", "காலை வணக்கம்", "నమస్కారం", "శుభోదయం", "নমস্কার", "শুভ সকাল",
            "સુપ્રભાત", "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ", "السلام علیکم", "آداب"
        ]
        if any(re.search(r"(?:\b|_|^)" + re.escape(g) + r"(?:\b|_|$)", clean) for g in greetings) and len(clean.split()) <= 4:
            return IntentClassificationResult(
                intent="GREETING",
                response_type="CONVERSATIONAL",
                confidence=0.95
            )

        # ----------------------------------------------------------------------
        # 3. CONVERSATIONAL INTENT CHECK: CAPABILITIES ("What can you do?")
        # ----------------------------------------------------------------------
        capability_keywords = [
            "what can you do", "how can you help", "what information", "what are your features",
            "who are you", "what is jalkrishi", "help me with", "features of jalkrishi",
            "आप क्या कर सकते हैं", "आप मेरी क्या मदद कर सकते हैं", "जलकृषि क्या है",
            "ನೀವು ಏನು ಮಾಡಬಹುದು", "ನನಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡುತ್ತೀರಿ", "நீங்கள் என்ன செய்ய முடியும்",
            "మీరు ఏమి చేయగలరు", "আপনি কি করতে পারেন", "तुम्ही काय करू शकता", "તમે શું કરી શકો છો"
        ]
        if any(ck in clean for ck in capability_keywords):
            return IntentClassificationResult(
                intent="CAPABILITIES",
                response_type="CONVERSATIONAL",
                confidence=0.95
            )

        # ----------------------------------------------------------------------
        # 4. CONVERSATIONAL INTENT CHECK: THANKS ("Thank you", "Thanks")
        # ----------------------------------------------------------------------
        thanks_keywords = [
            "thank you", "thanks", "that's helpful", "that is helpful", "thank you so much",
            "धन्यवाद", "शुक्रिया", "बहुत धन्यवाद", "ಧನ್ಯವಾದಗಳು", "ಥ್ಯಾಂಕ್ಸ್", "நன்றி",
            "ధన్యవాదాలు", "ধন্যবাদ", "आभार", "ਧੰਨਵਾਦ", "شکریہ", "dhanyavad", "shukriya"
        ]
        if any(tk in clean for tk in thanks_keywords) and len(clean.split()) <= 5:
            return IntentClassificationResult(
                intent="THANKS",
                response_type="CONVERSATIONAL",
                confidence=0.95
            )

        # ----------------------------------------------------------------------
        # 5. CONVERSATIONAL INTENT CHECK: GOODBYE ("Bye", "Goodbye")
        # ----------------------------------------------------------------------
        goodbye_keywords = [
            "bye", "goodbye", "see you", "talk to you later", "phir milenge",
            "बाय", "फिर मिलेंगे", "ಮತ್ತೆ ಸಿಗೋಣ", "மீண்டும் சந்திப்போம்", "మళ్ళీ కలుద్దాం",
            "আবার দেখা হবে", "पुन्हा भेटू", "આવજો", "ਅਲਵਿਦਾ", "خدا حافظ"
        ]
        if any(gk in clean for gk in goodbye_keywords) and len(clean.split()) <= 4:
            return IntentClassificationResult(
                intent="GOODBYE",
                response_type="CONVERSATIONAL",
                confidence=0.95
            )

        # Location extraction (independent of intent)
        loc_res = resolve_location(query_text=raw_text)

        # If place was explicitly resolved, update context memory
        if loc_res.is_resolved:
            ctx.last_location = loc_res

        # ----------------------------------------------------------------------
        # 6. WEIGHTED SEMANTIC SCORING ENGINE FOR DOMAIN INTELLIGENCE INTENTS
        # ----------------------------------------------------------------------
        scores: Dict[str, float] = {
            "CROP_RECOMMENDATION": 0.0,
            "IRRIGATION_ADVICE": 0.0,
            "RECHARGE_ADVICE": 0.0,
            "GROUNDWATER_FORECAST": 0.0,
            "GROUNDWATER_RISK": 0.0,
            "GROUNDWATER_ANOMALY": 0.0,
            "DWLR_STATION": 0.0,
            "WEATHER_OR_RAINFALL": 0.0,
            "GENERAL_FARMING": 0.0,
            "GROUNDWATER_LEVEL": 0.0,
        }

        # --- A. CROP_RECOMMENDATION SIGNALS ---
        crop_primary = [
            "crop", "crops", "plant", "planting", "grow", "growing", "millet", "ragi", "paddy",
            "wheat", "cotton", "sugarcane", "maize", "pulses", "groundnut", "fasal", "फ़सल",
            "ಬೆಳೆ", "பயிர்", "పంట", "ফসল", "पीक", "પાક", "ਫਸਲ"
        ]
        crop_modifiers = [
            "advisor", "advice", "recommend", "recommendation", "selection", "suitable", "best",
            "choose", "suggest", "which", "what to", "less water", "water efficient", "ugau", "lagau",
            "beleyabeku", "ida vendum", "veyali", "bona"
        ]

        if any(w in clean for w in crop_primary):
            scores["CROP_RECOMMENDATION"] += 0.8
        if any(w in clean for w in crop_modifiers):
            scores["CROP_RECOMMENDATION"] += 0.4
        if "crop advisor" in clean or "crop advice" in clean or "crop selection" in clean or "crop recommendation" in clean or "which crop" in clean:
            scores["CROP_RECOMMENDATION"] += 1.0

        # --- B. IRRIGATION_ADVICE SIGNALS ---
        irrigation_primary = [
            "irrigation", "irrigate", "watering", "sinchai", "सिंचाई", "ನೀರುಣಿಸುವುದು", "பாசனம்",
            "నీరు పెట్టాలి", "সেચ", "sech", "paani kab", "kitna paani"
        ]
        irrigation_modifiers = [
            "schedule", "when to", "how much water", "how often", "give water", "water should i give",
            "water requirement", "crop needs water", "water my crop", "water paddy", "water wheat", "needs water"
        ]

        if any(w in clean for w in irrigation_primary):
            scores["IRRIGATION_ADVICE"] += 0.8
        if any(w in clean for w in irrigation_modifiers):
            scores["IRRIGATION_ADVICE"] += 0.6
        if "when should i water" in clean or "how much water should i give" in clean or "irrigation schedule" in clean or "my crop needs water" in clean:
            scores["IRRIGATION_ADVICE"] += 1.0

        # --- C. RECHARGE_ADVICE SIGNALS ---
        recharge_primary = [
            "recharge", "rainwater harvesting", "recharge pit", "recharge well", "marupoorana",
            "serivootal", "रीचार्ज", "ಮರುಪೂರಣ", "நீர் செறிவூட்டல்", "రీఛార్జ్", "জল রিচার্জ"
        ]
        recharge_modifiers = [
            "how to recharge", "improve groundwater", "increase groundwater", "save groundwater",
            "improve water availability", "water conservation", "how can i save groundwater"
        ]

        if any(w in clean for w in recharge_primary):
            scores["RECHARGE_ADVICE"] += 0.8
        if any(w in clean for w in recharge_modifiers):
            scores["RECHARGE_ADVICE"] += 0.6
        if "save groundwater" in clean or "how can i save groundwater" in clean or "improve groundwater" in clean or "increase groundwater" in clean:
            scores["RECHARGE_ADVICE"] += 1.0

        # --- D. GROUNDWATER_FORECAST SIGNALS ---
        forecast_primary = [
            "forecast", "prediction", "outlook", "next month", "30 day", "30 days", "future groundwater",
            "पूर्वानुमान", "ಮುನ್ಸೂಚನೆ", "முன்னறிவிப்பு", "అంచనా", "পূর্বাভাস", "અંદાજ"
        ]
        forecast_modifiers = [
            "will groundwater increase", "will groundwater decrease", "what will groundwater be like", "future water level"
        ]

        if any(w in clean for w in forecast_primary):
            scores["GROUNDWATER_FORECAST"] += 0.8
        if any(w in clean for w in forecast_modifiers):
            scores["GROUNDWATER_FORECAST"] += 0.6
        if "will groundwater increase" in clean or "will groundwater get better" in clean or "next month" in clean or "groundwater forecast" in clean:
            scores["GROUNDWATER_FORECAST"] += 1.0

        # --- E. GROUNDWATER_RISK SIGNALS ---
        risk_primary = [
            "stress", "shortage", "scarcity", "crisis", "drought", "risk", "पानी की कमी",
            "ನೀರಿನ ಕೊರತೆ", "நீர் தட்டுப்பாடு", "నీటి కొరత", "ঝুঁকি"
        ]
        risk_modifiers = [
            "groundwater risk", "water stress", "is my area at risk", "groundwater stress", "is groundwater situation bad", "how severe"
        ]

        if any(w in clean for w in risk_primary):
            scores["GROUNDWATER_RISK"] += 0.8
        if any(w in clean for w in risk_modifiers):
            scores["GROUNDWATER_RISK"] += 0.6

        # --- F. GROUNDWATER_ANOMALY SIGNALS ---
        anomaly_primary = [
            "anomaly", "sudden drop", "suddenly dropped", "suddenly fall", "abnormal", "unusual drop",
            "अचानक गिरावट", "असामान्य", "ಹಠಾತ್ ಕುಸಿತ", "ದಿಡೀರ್ வீழ்ச்சி", "అకస్మాత్తుగా"
        ]
        anomaly_modifiers = [
            "why did groundwater fall", "water level suddenly dropped", "unusual change"
        ]

        if any(w in clean for w in anomaly_primary):
            scores["GROUNDWATER_ANOMALY"] += 0.8
        if any(w in clean for w in anomaly_modifiers):
            scores["GROUNDWATER_ANOMALY"] += 0.6

        # --- G. DWLR_STATION SIGNALS ---
        dwlr_primary = [
            "dwlr", "monitoring station", "telemetry well", "observation well", "groundwater station",
            "ವೀಕ್ಷಣೆ ಕೇಂದ್ರ", "நிலையம", "స్టేషన్"
        ]
        dwlr_modifiers = [
            "nearest dwlr", "nearby dwlr", "where is the nearest station", "show nearby station"
        ]

        if any(w in clean for w in dwlr_primary):
            scores["DWLR_STATION"] += 0.8
        if any(w in clean for w in dwlr_modifiers):
            scores["DWLR_STATION"] += 0.6

        # --- H. WEATHER_OR_RAINFALL SIGNALS ---
        weather_primary = [
            "rain", "rainfall", "monsoon", "weather", "precipitation", "बारिश", "मಳೆ", "மழை", "వర్షం", "বৃষ্টি"
        ]
        weather_modifiers = [
            "will it rain", "rain tomorrow", "rainfall forecast", "weather forecast"
        ]

        if any(w in clean for w in weather_primary):
            scores["WEATHER_OR_RAINFALL"] += 0.8
        if any(w in clean for w in weather_modifiers):
            scores["WEATHER_OR_RAINFALL"] += 0.6

        # --- I. GENERAL_FARMING SIGNALS ---
        farming_primary = [
            "farming advice", "farm advice", "farmer advice", "farming practices", "sustainable farming",
            "farm water management", "soil moisture"
        ]
        farming_modifiers = [
            "save water on farm", "how can i save water"
        ]

        if any(w in clean for w in farming_primary):
            scores["GENERAL_FARMING"] += 0.8
        if any(w in clean for w in farming_modifiers):
            scores["GENERAL_FARMING"] += 0.6

        # --- J. GROUNDWATER_LEVEL SIGNALS ---
        gw_primary = [
            "groundwater", "ground water", "water table", "water depth", "borewell depth",
            "bhujal", "antarjala", "nilathadi", "bhugarbha", "भूजल", "ಅಂತರ್ಜಲ", "நிலத்தடி",
            "భూగర్భ", "ভূগর্ভস্থ", "ભૂગર્ભજળ", "ਧਰਤੀ ਹੇਠਲੇ ਪਾਣੀ", "زیر زمین"
        ]
        gw_modifiers = [
            "level", "status", "depth", "how deep", "how much groundwater", "available",
            "groundwater level", "water level", "zameen ka paani", "bhujal star"
        ]

        if any(w in clean for w in gw_primary):
            scores["GROUNDWATER_LEVEL"] += 0.8
        if any(w in clean for w in gw_modifiers):
            scores["GROUNDWATER_LEVEL"] += 0.4
        if loc_res.is_resolved and not any(scores[k] > 0.8 for k in scores if k != "GROUNDWATER_LEVEL"):
            scores["GROUNDWATER_LEVEL"] += 0.8

        # Find intent with maximum score
        max_intent = max(scores, key=scores.get)
        max_score = scores[max_intent]

        # Single word short query matching for high-priority single terms
        if len(clean.split()) == 1:
            short_map = {
                "crop": "CROP_RECOMMENDATION",
                "irrigation": "IRRIGATION_ADVICE",
                "recharge": "RECHARGE_ADVICE",
                "groundwater": "GROUNDWATER_LEVEL",
                "forecast": "GROUNDWATER_FORECAST",
                "dwlr": "DWLR_STATION",
                "rainfall": "WEATHER_OR_RAINFALL",
                "weather": "WEATHER_OR_RAINFALL",
            }
            if clean in short_map:
                return IntentClassificationResult(
                    intent=short_map[clean],
                    response_type="INTELLIGENCE",
                    extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                    confidence=0.95
                )

        if max_score >= 0.7:
            return IntentClassificationResult(
                intent=max_intent,
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=min(1.0, max_score)
            )

        # ----------------------------------------------------------------------
        # 7. UNKNOWN (Conversational Clarification)
        # ----------------------------------------------------------------------
        return IntentClassificationResult(
            intent="UNKNOWN",
            response_type="CONVERSATIONAL",
            confidence=0.50
        )

    def generate_conversational_response(
        self,
        intent: str,
        lang: str = "en",
        user_name: Optional[str] = None,
        location_name: Optional[str] = None
    ) -> str:
        """
        Generates natural conversational farmer response in target language.
        """
        name_str = f" {user_name}" if user_name else ""

        if intent == "IDENTITY_INTRODUCTION":
            if lang == "hi":
                return f"{user_name or 'किसान भाई'}, आपसे मिलकर खुशी हुई! मैं जलकृषि एआई हूँ। मैं आपकी भूजल स्तर, फसल चयन, सिंचाई और जल जोखिम प्रबंधन में मदद कर सकता हूँ।"
            elif lang == "kn":
                return f"{user_name or 'ರೈತ ಬಂಧು'}, ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿದ್ದು ಸಂತೋಷವಾಯಿತು. ನಾನು ಜಲಕೃಷಿ AI. ಅಂತರ್ಜಲ ಮಟ್ಟ, ಬೆಳೆ ಆಯ್ಕೆ ಮತ್ತು ನೀರಾವರಿ ಸಲಹೆಗಳಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ."
            elif lang == "ta":
                return f"{user_name or 'விவசாயி நண்பரே'}, உங்களை சந்தித்ததில் மகிழ்ச்சி. நான் ஜல்க்ரிஷி AI. நிலத்தடி நீர் மட்டம், பயிர் தேர்வு மற்றும் பாசன ஆலோசனைகளில் நான் உதவ முடியும்."
            elif lang == "te":
                return f"{user_name or 'రైతు సోదరా'}, మిమ్మల్ని కలవడం సంతోషంగా ఉంది. నేను జల్‌కృషి AI. భూగర్భ జల మట్టం, పంటల ఎంపిక మరియు నీటి యాజమాన్యంలో సహాయం చేయగలను."
            elif lang == "bn":
                return f"{user_name or 'কৃষক ভাই'}, আপনার সাথে পরিচিত হয়ে আনন্দিত। আমি জলকৃষি এআই।"
            elif lang == "mr":
                return f"{user_name or 'शेतकरी बंधू'}, आपल्याला भेटून आनंद झाला. मी जलकृषी एआय आहे."
            elif lang == "gu":
                return f"{user_name or 'ખેડૂત મિત્ર'}, તમને મળીને આનંદ થયો. હું જલકૃષિ AI છું."
            else:
                return f"Nice to meet you{name_str}. I am JalKrishi AI, your conversational farming assistant. I can help you with groundwater levels, crop selection, irrigation scheduling, and water-risk decisions."

        elif intent == "GREETING":
            if lang == "hi":
                return "नमस्ते! मैं जलकृषि एआई हूँ। मैं भूजल स्तर, फसल चयन, सिंचाई और जल संरक्षण में आपकी सहायता कर सकता हूँ। आप क्या जानना चाहते हैं?"
            elif lang == "kn":
                return "ನಮಸ್ಕಾರ! ನಾನು ಜಲಕೃಷಿ AI. ಅಂತರ್ಜಲ ಮಟ್ಟ, ಬೆಳೆ ಆಯ್ಕೆ ಮತ್ತು ನೀರಾವರಿ ಸಲಹೆಗಳಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            elif lang == "ta":
                return "வணக்கம்! நான் ஜல்க்ரிஷி AI. நிலத்தடி நீர் மட்டம், பயிர் தேர்வு மற்றும் பாசன ஆலோசனைகளில் நான் உதவ முடியும்."
            elif lang == "te":
                return "నమస్కారం! నేను జల్‌కృషి AI. భూగర్భ జల మట్టం, పంటల ఎంపిక మరియు నీటి యాజమాన్యంలో సహాయం చేయగలను."
            else:
                return "Hello! I am JalKrishi AI. I can help you with groundwater levels, crop selection, irrigation scheduling, groundwater forecasts, and water conservation practices. What would you like to know?"

        elif intent == "CAPABILITIES":
            if lang == "hi":
                return "जलकृषि एआई आपको वास्तविक समय भूजल स्तर, 30-दिवसीय पूर्वानुमान, जल-कुशल फसल सिफारिशें, सिंचाई सलाह और रिचार्ज मार्गदर्शन प्रदान कर सकता है।"
            elif lang == "kn":
                return "ಜಲಕೃಷಿ AI ನಿಮಗೆ ನೈಜ-ಸಮಯದ ಅಂತರ್ಜಲ ಮಟ್ಟಗಳು, 30-ದಿನಗಳ ಮುನ್ಸೂಚನೆ, ಸೂಕ್ತ ಬೆಳೆ ಆಯ್ಕೆ ಮತ್ತು ನೀರಾವರಿ ಸಲಹೆಗಳನ್ನು ನೀಡಬಲ್ಲದು."
            else:
                return "I can provide real-time groundwater levels (DWLR or Satellite-Assisted), 30-day water level forecasts, water-smart crop recommendations, custom irrigation scheduling, groundwater risk alerts, and recharge guidance across India."

        elif intent == "THANKS":
            if lang == "hi":
                return "आपका बहुत-बहुत धन्यवाद! भूजल, फसल या सिंचाई से जुड़ा कोई भी सवाल पूछने के लिए झिझकें नहीं।"
            elif lang == "kn":
                return "ನಿಮಗೆ ಧನ್ಯವಾದಗಳು! ಅಂತರ್ಜಲ ಅಥವಾ ಬೆಳೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿದ್ದರೆ ಕೇಳಿ."
            else:
                return "You are very welcome! Feel free to ask anytime if you need more information about groundwater, crops, or irrigation."

        elif intent == "GOODBYE":
            if lang == "hi":
                return "शुभकामनाएं और अच्छी खेती! आपके लिए समृद्ध फसल और स्वस्थ भूजल की कामना करते हैं।"
            elif lang == "kn":
                return "ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಬೆಳೆಗೆ ಉತ್ತಮ ಇಳುವರಿ ಮತ್ತು ಅಂತರ್ಜಲ ಸಮೃದ್ಧಿಯಾಗಲಿ."
            else:
                return "Goodbye and happy farming! Wishing you a bountiful harvest and healthy groundwater."

        else:  # UNKNOWN
            if lang == "hi":
                return "मुझे खेद है, मैं आपकी बात पूरी तरह समझ नहीं पाया। मैं भूजल स्तर, फसल चयन, सिंचाई और रिचार्ज सलाह में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?"
            elif lang == "kn":
                return "ನನಗೆ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಸಂಪೂರ್ಣವಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಅಂತರ್ಜಲ ಮಟ್ಟ, ಬೆಳೆ ಆಯ್ಕೆ ಮತ್ತು ನೀರಾವರಿ ಸಲಹೆಗಳಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            else:
                return "I'm not sure what you need yet. I can help with groundwater levels, crop selection, irrigation scheduling, groundwater risk, 30-day forecasting, and recharge advice. What would you like to know?"


# Global instance
farmer_intent_router = FarmerIntentRouter()
