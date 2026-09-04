"""
JalKrishi AI — Farmer Conversational Intent Router Module
---------------------------------------------------------
Classifies farmer queries (spoken or typed) into canonical intents across 13 Indian regional languages.
Prevents non-groundwater queries (greetings, introductions, crop advice, irrigation, thanks)
from being misrouted to groundwater location assessments.

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


class FarmerIntentRouter:
    """
    Multilingual Intent Router for JalKrishi AI.
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

        clean = raw_text.lower()
        detected_lang = language or LanguageDetector.detect_language(raw_text, default="en")
        ctx = self.get_context(session_id)

        # ----------------------------------------------------------------------
        # 1. IDENTITY INTRODUCTION ("My name is Srujan", "I am a farmer", etc.)
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
        # 2. GREETINGS ("Hello", "Namaste", "Hi", "Good morning")
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
        # 3. CAPABILITIES ("What can you do?", "How can you help me?")
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
        # 4. THANKS ("Thank you", "Thanks", "Dhanyavad")
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
        # 5. GOODBYE ("Bye", "Goodbye", "Phir milenge")
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

        # Extract location if any place name exists in query
        loc_res = resolve_location(query_text=raw_text)

        # If place was explicitly resolved in text, update context memory
        if loc_res.is_resolved:
            ctx.last_location = loc_res

        # ----------------------------------------------------------------------
        # 6. CROP RECOMMENDATION ("Which crop should I grow?")
        # ----------------------------------------------------------------------
        crop_keywords = [
            "which crop", "what crop", "suitable crop", "crop to grow", "what to plant",
            "recommend a crop", "best crop", "millet", "ragi", "paddy", "cotton", "wheat",
            "sugarcane", "maize", "pulses", "groundnut", "kaunsi fasal", "kaun sa crop",
            "कौन सी फसल", "क्या बोना चाहिए", "य़ಾವ ಬೆಳೆ", "ಬೆಳೆ ಆಯ್ಕೆ", "என்ன பயிர்",
            "ஏ పంట", "কোন ফসল", "कोणते पीक", "કયો પાક", "ਕਿਹੜੀ ਫਸਲ"
        ]
        if any(ck in clean for ck in crop_keywords):
            return IntentClassificationResult(
                intent="CROP_RECOMMENDATION",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.92
            )

        # ----------------------------------------------------------------------
        # 7. IRRIGATION ADVICE ("When should I irrigate?", "How much water should I give it?")
        # ----------------------------------------------------------------------
        irrigation_keywords = [
            "how much water", "when to irrigate", "irrigation schedule", "water to give", "water should i give",
            "how often to water", "should i irrigate", "water requirement", "give it water",
            "irrigate paddy", "irrigate wheat", "irrigation advice", "paani kab dena",
            "sinchai kab karein", "पानी कब दें", "सिंचाई", "ಎಷ್ಟು ನೀರು ಕೊಡಬೇಕು", "ಯಾವಾಗ ನೀರುಣಿಸಬೇಕು",
            "எப்போது பாசனம்", "எவ்வளவு நீர்", "ఎప్పుడు నీరు పెట్టాలి", "కখন সেচ", "कधी पाणी द्यावे"
        ]
        if any(ik in clean for ik in irrigation_keywords):
            return IntentClassificationResult(
                intent="IRRIGATION_ADVICE",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.92
            )

        # ----------------------------------------------------------------------
        # 8. RECHARGE ADVICE ("How can I recharge groundwater?")
        # ----------------------------------------------------------------------
        recharge_keywords = [
            "recharge groundwater", "recharge pit", "rainwater harvesting", "improve groundwater",
            "conserve water", "increase water level", "recharge aquifer", "भूजल रिचार्ज",
            "वर्षा जल संचयन", "ಅಂತರ್ಜಲ ಮರುಪೂರಣ", "ಮಳೆನೀರು ಕೊಯ್ಲು", "நீர் செறிவூட்டல்",
            "భూగర్భ జల రీఛార్జ్", "জল রিচার্জ", "भूजल पुनर्भरण"
        ]
        if any(rk in clean for rk in recharge_keywords):
            return IntentClassificationResult(
                intent="RECHARGE_ADVICE",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.92
            )

        # ----------------------------------------------------------------------
        # 9. GROUNDWATER FORECAST ("Will groundwater increase next month?")
        # ----------------------------------------------------------------------
        forecast_keywords = [
            "forecast", "next month", "30 days", "will groundwater decline", "will groundwater improve",
            "future water level", "water level prediction", "पूर्वानुमान", "अगले महीने",
            "ಮುನ್ಸೂಚನೆ", "ಮುಂದಿನ ತಿಂಗಳು", "முன்னறிவிப்பு", "అంచనా", "পূর্বাভাস", "અંદાજ"
        ]
        if any(fk in clean for fk in forecast_keywords):
            return IntentClassificationResult(
                intent="GROUNDWATER_FORECAST",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.90
            )

        # ----------------------------------------------------------------------
        # 10. GROUNDWATER RISK ("Is my area facing water crisis?")
        # ----------------------------------------------------------------------
        risk_keywords = [
            "is my area at risk", "water stress", "water shortage", "drought risk",
            "water crisis", "severe stress", "shortage of water", "जोखिम", "जल संकट",
            "ನೀರಿನ ಕೊರತೆ", "ಅಪಾಯ", "நீர் தட்டுப்பாடு", "நீட்டி కొరత", "ঝুঁকি"
        ]
        if any(rk in clean for rk in risk_keywords):
            return IntentClassificationResult(
                intent="GROUNDWATER_RISK",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.90
            )

        # ----------------------------------------------------------------------
        # 11. GROUNDWATER ANOMALY ("Why did groundwater suddenly fall?", "Abnormal drop")
        # ----------------------------------------------------------------------
        anomaly_keywords = [
            "sudden drop", "abnormal drop", "why did water fall", "unusual drop", "abnormal change",
            "suddenly fall", "suddenly drop", "abnormal fall", "sudden change", "sudden decline",
            "अचानक गिरावट", "असामान्य", "ಹಠಾತ್ ಕುಸಿತ", "ದಿಡೀರ್ வீழ்ச்சி", "అకస్మాత్తుగా"
        ]
        if any(ak in clean for ak in anomaly_keywords) or (("sudden" in clean or "abnormal" in clean or "unusual" in clean) and ("fall" in clean or "drop" in clean or "decline" in clean or "groundwater" in clean)):
            return IntentClassificationResult(
                intent="GROUNDWATER_ANOMALY",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.90
            )

        # ----------------------------------------------------------------------
        # 12. DWLR STATION ("Where is the nearest DWLR?")
        # ----------------------------------------------------------------------
        dwlr_keywords = [
            "nearest dwlr", "monitoring station", "nearby station", "show dwlr well",
            "telemetry station", "monitoring well", "निगरानी स्टेशन", "ವೀಕ್ಷಣೆ ಕೇಂದ್ರ",
            "நிலையம", "స్టేషన్"
        ]
        if any(dk in clean for dk in dwlr_keywords):
            return IntentClassificationResult(
                intent="DWLR_STATION",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.90
            )

        # ----------------------------------------------------------------------
        # 13. WEATHER OR RAINFALL ("Will it rain?")
        # ----------------------------------------------------------------------
        weather_keywords = [
            "will it rain", "rainfall forecast", "precipitation", "monsoon", "rain prediction",
            "बारिश", "वर्षा", "ಮಳೆ", "மழை", "వర్షం", "বৃষ্টি"
        ]
        if any(wk in clean for wk in weather_keywords):
            return IntentClassificationResult(
                intent="WEATHER_OR_RAINFALL",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.90
            )

        # ----------------------------------------------------------------------
        # 14. GENERAL FARMING ("How do I save water on my farm?")
        # ----------------------------------------------------------------------
        general_farming_keywords = [
            "save water", "water conservation", "sustainable farming", "water-saving", "water saving",
            "soil moisture", "conserve groundwater", "खेत में पानी कैसे बचाएं", "जल संरक्षण",
            "ನೀರುಳಿಸುವುದು ಹೇಗೆ", "நீரை சேமிப்பது", "నీటిని ఎలా పొదుపు చేయాలి"
        ]
        if any(gk in clean for gk in general_farming_keywords):
            return IntentClassificationResult(
                intent="GENERAL_FARMING",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.88
            )

        # ----------------------------------------------------------------------
        # 15. GROUNDWATER LEVEL ("What is groundwater level of Bengaluru?")
        # ----------------------------------------------------------------------
        gw_keywords = [
            "groundwater level", "ground water level", "water level", "water depth", "groundwater", "ground water",
            "how deep is groundwater", "groundwater in", "groundwater of", "water availability",
            "borewell depth", "well water", "bhujal sthar", "antarjala matta", "nilathadi neer matam",
            "bhugarbha jala matam", "bhujal", "भूजल", "भूजल स्तर", "भूजल का स्तर", "पानी का स्तर", "ಅಂತರ್ಜಲ",
            "ಅಂತರ್ಜಲ ಮಟ್ಟ", "ನೀರಿನ ಮಟ್ಟ", "நிலத்தடி", "நிலத்தடி நீர் மட்டம்", "భూగర్భ", "భూగర్భ జల మట్టం",
            "ভূগর্ভস্থ", "ভূগর্ভস্থ জলের স্তর", "ભૂગર્ભજળ", "ભૂગર્ભજળ સ્તર", "भूजल पातळी", "ਧਰਤੀ ਹੇਠਲੇ ਪਾਣੀ", "زیر زمین"
        ]

        if any(gk in clean for gk in gw_keywords) or loc_res.is_resolved:
            return IntentClassificationResult(
                intent="GROUNDWATER_LEVEL",
                response_type="INTELLIGENCE",
                extracted_location=loc_res if loc_res.is_resolved else ctx.last_location,
                confidence=0.95
            )

        # ----------------------------------------------------------------------
        # 16. UNKNOWN (Conversational Clarification)
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

        # Language-aware response templates
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
                return f"{user_name or 'কৃষক ভাই'}, আপনার সাথে পরিচিত হয়ে আনন্দিত। আমি জলকৃষি এআই। ভূগর্ভস্থ জলের স্তর, ফসল নির্বাচন এবং সেচ পরামর্শে আমি সাহায্য করতে পারি।"
            elif lang == "mr":
                return f"{user_name or 'शेतकरी बंधू'}, आपल्याला भेटून आनंद झाला. मी जलकृषी एआय आहे. मी भूजल पातळी, पीक निवड आणि सिंचन सल्ल्यामध्ये मदत करू शकतो."
            elif lang == "gu":
                return f"{user_name or 'ખેડૂત મિત્ર'}, તમને મળીને આનંદ થયો. હું જલકૃષિ AI છું. હું ભૂગર્ભજળ સ્તર, પાક પસંદગી અને પિયત સલાહમાં મદદ કરી શકું છું."
            elif lang == "ml":
                return f"{user_name or 'കർഷക സുഹൃത്തേ'}, നിങ്ങളെ പരിചയപ്പെട്ടതിൽ സന്തോഷം. ഞാൻ ജൽകൃഷി AI ആണ്."
            elif lang == "pa":
                return f"{user_name or 'ਕਿਸਾਨ ਵੀਰੋ'}, ਤੁਹਾਡੇ ਨਾਲ ਮਿਲ ਕੇ ਖੁਸ਼ੀ ਹੋਈ। ਮੈਂ ਜਲਕ੍ਰਿਸ਼ੀ AI ਹਾਂ।"
            elif lang == "or":
                return f"{user_name or 'କୃଷକ ଭାଇ'}, ଆପଣଙ୍କ ସହ ଭେଟି ଖୁସି ହେଲୁ। ମୁଁ ଜଳକୃଷି AI।"
            elif lang == "as":
                return f"{user_name or 'কৃষক ভাই'}, আপোনাক লগ পাই ভাল লাগিল। মই জলকৃষি AI।"
            elif lang == "ur":
                return f"{user_name or 'کسان بھائی'}, آپ سے مل کر خوشی ہوئی۔ میں جل کرشی AI ہوں۔"
            else:
                return f"Nice to meet you{name_str}. I am JalKrishi AI, your conversational farming assistant. I can help you with groundwater levels, crop selection, irrigation scheduling, and water-risk decisions."

        elif intent == "GREETING":
            if lang == "hi":
                return "नमस्ते! मैं जलकृषि एआई हूँ। मैं भूजल स्तर, फसल चयन, सिंचाई और जल संरक्षण में आपकी सहायता कर सकता हूँ। आप क्या जानना चाहते हैं?"
            elif lang == "kn":
                return "ನಮಸ್ಕಾರ! ನಾನು ಜಲಕೃಷಿ AI. ಅಂತರ್ಜಲ ಮಟ್ಟ, ಬೆಳೆ ಆಯ್ಕೆ ಮತ್ತು ನೀರಾವರಿ ಸಲಹೆಗಳಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            elif lang == "ta":
                return "வணக்கம்! நான் ஜல்க்ரிஷி AI. நிலத்தடி நீர் மட்டம், பயிர் தேர்வு மற்றும் பாசன ஆலோசனைகளில் நான் உதவ முடியும். நீங்கள் என்ன அறிய விரும்புகிறீர்கள்?"
            elif lang == "te":
                return "నమస్కారం! నేను జల్‌కృషి AI. భూగర్భ జల మట్టం, పంటల ఎంపిక మరియు నీటి యాజమాన్యంలో సహాయం చేయగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
            elif lang == "bn":
                return "নমস্কার! আমি জলকৃষি এআই। ভূগর্ভস্থ জলের স্তর, ফসল নির্বাচন এবং সেচ পরামর্শে সাহায্য করতে পারি।"
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
