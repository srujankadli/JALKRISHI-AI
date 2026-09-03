import re
from typing import List, Dict, Any, Optional, Tuple
from app.models.schemas import LanguageConfigSchema, GroundwaterIntelligenceSchema


# ==========================================
# 1. Centralized Supported Languages Registry
# ==========================================

SUPPORTED_LANGUAGES: List[LanguageConfigSchema] = [
    LanguageConfigSchema(language_code="en", display_name="English", native_name="English", status="CONFIGURED"),
    LanguageConfigSchema(language_code="hi", display_name="Hindi", native_name="हिन्दी", status="CONFIGURED"),
    LanguageConfigSchema(language_code="bn", display_name="Bengali", native_name="বাংলা", status="CONFIGURED"),
    LanguageConfigSchema(language_code="te", display_name="Telugu", native_name="తెలుగు", status="CONFIGURED"),
    LanguageConfigSchema(language_code="mr", display_name="Marathi", native_name="मराठी", status="CONFIGURED"),
    LanguageConfigSchema(language_code="ta", display_name="Tamil", native_name="தமிழ்", status="CONFIGURED"),
    LanguageConfigSchema(language_code="gu", display_name="Gujarati", native_name="ગુજરાતી", status="CONFIGURED"),
    LanguageConfigSchema(language_code="kn", display_name="Kannada", native_name="ಕನ್ನಡ", status="CONFIGURED"),
    LanguageConfigSchema(language_code="ml", display_name="Malayalam", native_name="മലയാളം", status="CONFIGURED"),
    LanguageConfigSchema(language_code="pa", display_name="Punjabi", native_name="ਪੰਜਾਬੀ", status="CONFIGURED"),
    LanguageConfigSchema(language_code="or", display_name="Odia", native_name="ଓଡ଼ିଆ", status="CONFIGURED"),
    LanguageConfigSchema(language_code="as", display_name="Assamese", native_name="অসমীয়া", status="CONFIGURED"),
    LanguageConfigSchema(language_code="ur", display_name="Urdu", native_name="اردو", status="CONFIGURED"),
]


# ==========================================
# 2. Script & Language Detector
# ==========================================

class LanguageDetector:
    """Detects primary language code from input text unicode script ranges."""

    @staticmethod
    def detect_language(text: str, default: str = "en") -> str:
        if not text:
            return default

        # Devanagari Script (Hindi / Marathi)
        if re.search(r"[\u0900-\u097F]", text):
            # Check Marathi specific characters
            if any(w in text for w in ["आहे", "माझ्या", "शेत", "पाणी", "कसे"]):
                return "mr"
            return "hi"

        # Bengali / Assamese Script
        if re.search(r"[\u0980-\u09FF]", text):
            if any(w in text for w in ["অসম", "পানী"]):
                return "as"
            return "bn"

        # Telugu Script
        if re.search(r"[\u0C00-\u0C7F]", text):
            return "te"

        # Tamil Script
        if re.search(r"[\u0B80-\u0BFF]", text):
            return "ta"

        # Gujarati Script
        if re.search(r"[\u0A80-\u0AFF]", text):
            return "gu"

        # Kannada Script
        if re.search(r"[\u0C80-\u0CFF]", text):
            return "kn"

        # Malayalam Script
        if re.search(r"[\u0D00-\u0D7F]", text):
            return "ml"

        # Gurmukhi / Punjabi Script
        if re.search(r"[\u0A00-\u0A7F]", text):
            return "pa"

        # Odia Script
        if re.search(r"[\u0B00-\u0B7F]", text):
            return "or"

        # Arabic / Urdu Script
        if re.search(r"[\u0600-\u06FF]", text):
            return "ur"

        return default


# ==========================================
# 3. Speech-to-Text & Text-to-Speech Providers (Honest NOT_CONFIGURED Status)
# ==========================================

class SpeechToTextProvider:
    """STT Provider Abstraction. Reports NOT_CONFIGURED when live cloud speech credentials are not set."""

    def __init__(self):
        self.status = "NOT_CONFIGURED"

    def transcribe(self, audio_bytes: Optional[bytes], mime_type: str = "audio/wav") -> Tuple[str, str, str]:
        """Returns (transcribed_text, detected_language, provider_status)."""
        return "", "en", self.status


class TextToSpeechProvider:
    """TTS Provider Abstraction. Reports NOT_CONFIGURED when live cloud TTS credentials are not set."""

    def __init__(self):
        self.status = "NOT_CONFIGURED"

    def synthesize(self, text: str, language: str = "en") -> Tuple[Optional[str], str]:
        """Returns (audio_url_or_none, provider_status)."""
        return None, self.status


# ==========================================
# 4. Local Hydro-Agronomic Multilingual Translator
# ==========================================

class HydroAgronomicTranslator:
    """
    Translates core JalKrishi hydrogeological decision support outputs into all 13 supported languages.
    Strictly preserves scientific data-honesty terms across all translations.
    """

    TRANSLATED_TERMS = {
        "hi": {
            "title": "जलकृषि एआई — किसान निर्णय सहायता",
            "coverage_dwlr": "प्रत्यक्ष DWLR माप",
            "coverage_sat": "उपग्रह-सहायता प्राप्त भूजल अनुमान",
            "condition": "भूजल स्थिति",
            "trend": "रुझान",
            "recharge": "पुनर्भरण संभावना",
            "crops": "अनुशंसित जल-कुशल फसलें",
            "irrigation": "सिंचाई एवं जल संरक्षण सलाह",
            "actions": "किसान कार्य योजना",
            "disclaimer": "मॉडल-व्युत्पन्न अनुमान; प्रत्यक्ष कुएं का माप नहीं है।",
            "confidence": "विश्वास स्तर",
            "falling": "गिरावट",
            "rising": "सुधार",
            "stable": "स्थिर",
            "critical": "गंभीर तनाव",
            "warning": "उच्च तनाव",
            "moderate": "मध्यम तनाव",
            "healthy": "उत्कृष्ट/संतोषजनक",
        },
        "te": {
            "title": "జల్​కృషి AI — రైతు నిర్ణయ మద్దతు",
            "coverage_dwlr": "నేరుగా DWLR కొలత",
            "coverage_sat": "సాటిలైట్ ఆధారిత భూజల అంచనా",
            "condition": "భూజల పరిస్థితి",
            "trend": "ట్రెండ్",
            "recharge": "రీఛార్జ్ అంచనా",
            "crops": "నీటి పొదుపు పంటలు",
            "irrigation": "సాగునీటి సలహా",
            "actions": "రైతు కార్యాచరణ ప్రణాళిక",
            "disclaimer": "మోడల్-ఆధారిత అంచనా; నేరుగా బోరు బావి కొలత కాదు.",
            "confidence": "నమ్మక స్థాయి",
            "falling": "తగ్గుదల",
            "rising": "మెరుగుదల",
            "stable": "స్థిరంగా",
            "critical": "తీవ్ర ఒత్తిడి",
            "warning": "అధిక ఒత్తిడి",
            "moderate": "మధ్యస్థ ఒత్తిడి",
            "healthy": "ఆరోగ్యకరం",
        },
        "kn": {
            "title": "ಜಲಕೃಷಿ AI — ರೈತ ನಿರ್ಧಾರ ಬೆಂಬಲ",
            "coverage_dwlr": "ನೇರ DWLR ಅಳತೆ",
            "coverage_sat": "ಉಪಗ್ರಹ-ಸಹಾಯಿತ ಅಂತರ್ಜಲ ಅಂದಾಜು",
            "condition": "ಅಂತರ್ಜಲ ಸ್ಥಿತಿ",
            "trend": "ಪ್ರವೃತ್ತಿ",
            "recharge": "ರೀಚಾರ್ಜ್ ಮುನ್ಸೂಚನೆ",
            "crops": "ನೀರು-ಉಳಿತಾಯ ಬೆಳೆಗಳು",
            "irrigation": "ನೀರಾವರಿ ಸಲಹೆ",
            "actions": "ರೈತರ ಕಾರ್ಯ ಯೋಜನೆ",
            "disclaimer": "ಮಾಡೆಲ್-ಆಧಾರಿತ ಅಂದಾಜು; ನೇರ ಕೊಳವೆಬಾವಿ ಅಳತೆಯಲ್ಲ.",
            "confidence": "ವಿಶ್ವಾಸಾರ್ಹತೆ ಮಟ್ಟ",
            "falling": "ಕುಸಿತ",
            "rising": "ಸುಧಾರಣೆ",
            "stable": "ಸ್ಥಿರ",
            "critical": "ತೀವ್ರ ಒತ್ತಡ",
            "warning": "ಹೆಚ್ಚಿನ ಒತ್ತಡ",
            "moderate": "ಮಧ್ಯಮ ಒತ್ತಡ",
            "healthy": "ಉತ್ತಮ ಸ್ಥಿತಿ",
        },
        "mr": {
            "title": "जलकृषी AI — शेतकरी निर्णय सहाय्य",
            "coverage_dwlr": "प्रत्यक्ष DWLR मोजमाप",
            "coverage_sat": "उपग्रह-साहाय्यित भूजल अंदाज",
            "condition": "भूजल स्थिती",
            "trend": "कल",
            "recharge": "पुनर्भरण शक्यता",
            "crops": "शिफारस केलेली कमी पाण्याचा पिके",
            "irrigation": "सिंचन व जलसंधारण सल्ला",
            "actions": "शेतकरी कृती योजना",
            "disclaimer": "मॉडेल-आधारित अंदाज; प्रत्यक्ष विहिरीचे मोजमाप नाही.",
            "confidence": "विश्वासार्हता स्तर",
            "falling": "घसरण",
            "rising": "सुधारणा",
            "stable": "स्थिर",
            "critical": "गंभीर ताण",
            "warning": "उच्च ताण",
            "moderate": "मध्यम ताण",
            "healthy": "उत्तम",
        },
        "ta": {
            "title": "ஜல்​கிருஷி AI — விவசாயி முடிவு ஆதரவு",
            "coverage_dwlr": "நேரடி DWLR அளவீடு",
            "coverage_sat": "சாட்டிலைட் உதவியுடனான நிலத்தடி நீர் மதிப்பீடு",
            "condition": "நிலத்தடி நீர் நிலை",
            "trend": "போக்கு",
            "recharge": "நீர் மறுஊட்டம் கணிப்பு",
            "crops": "பரிந்துரைக்கப்பட்ட குறைந்த நீர் பயிர்கள்",
            "irrigation": "பாசன ஆலோசனை",
            "actions": "விவசாயி செயல் திட்டம்",
            "disclaimer": "மாதிரி அடிப்படையிலான மதிப்பீடு; நேரடி கிணற்று அளவீடு அல்ல.",
            "confidence": "நம்பகத்தன்மை நிலை",
            "falling": "சரிவு",
            "rising": "முன்னேற்றம்",
            "stable": "சீராக",
            "critical": "கடுமையான அழுத்தம்",
            "warning": "அதிக அழுத்தம்",
            "moderate": "மிதமான அழுத்தம்",
            "healthy": "நன்றாக உள்ளது",
        },
        "bn": {
            "title": "জলকৃষি AI — কৃষক সিদ্ধান্ত সহায়তা",
            "coverage_dwlr": "প্রত্যক্ষ DWLR পরিমাপ",
            "coverage_sat": "উপগ্রহ-সহায়তা প্রাপ্ত ভূগর্ভস্থ জল অনুমান",
            "condition": "ভূগর্ভস্থ জলের অবস্থা",
            "trend": "প্রবণতা",
            "recharge": "পুনর্বরণ সম্ভাবনা",
            "crops": "কম জলের সাশ্রয়ী ফসল",
            "irrigation": "সেচ ও জল সংরক্ষণ পরামর্শ",
            "actions": "কৃষক কার্য পরিকল্পনা",
            "disclaimer": "মডেল-ভিত্তিক অনুমান; সরাসরি গভীর নলকূপের পরিমাপ নয়।",
            "confidence": "আত্মবিশ্বাসের মাত্রা",
            "falling": "হ্রাস",
            "rising": "উন্নতি",
            "stable": "স্থিতিশীল",
            "critical": "গম্ভীর চাপ",
            "warning": "উচ্চ চাপ",
            "moderate": "মধ্যম চাপ",
            "healthy": "ভাল",
        },
        "gu": {
            "title": "જલકૃષિ AI — ખેડૂત નિર્ણય સહાય",
            "coverage_dwlr": "પ્રત્યક્ષ DWLR માપન",
            "coverage_sat": "ઉપગ્રહ-સહાયિત ભૂગર્ભજળ અંદાજ",
            "condition": "ભૂગર્ભજળ સ્થિતિ",
            "trend": "વલણ",
            "recharge": "રિચાર્જ શક્યતા",
            "crops": "ઓછા પાણીની ભલામણ કરેલ પાકો",
            "irrigation": "સિંચાઈ સલાહ",
            "actions": "ખેડૂત કાર્ય યોજના",
            "disclaimer": "મોડેલ-આધારિત અંદાજ; પ્રત્યક્ષ કૂવાનું માપન નથી.",
            "confidence": "વિશ્વાસ સ્તર",
            "falling": "ઘટાડો",
            "rising": "સુધારો",
            "stable": "સ્થિર",
            "critical": "ગંભીર તણાવ",
            "warning": "ઉચ્ચ તણાવ",
            "moderate": "મધ્યમ તણાવ",
            "healthy": "સારું",
        },
        "pa": {
            "title": "ਜਲਕ੍ਰਿਸ਼ੀ AI — ਕਿਸਾਨ ਫੈਸਲਾ ਸਹਾਇਤਾ",
            "coverage_dwlr": "ਪ੍ਰਤੱਖ DWLR ਮਾਪ",
            "coverage_sat": "ਉਪਗ੍ਰਹਿ-ਸਹਾਇਤਾ ਪ੍ਰਾਪਤ ਭੂਮੀਗਤ ਜਲ ਅਨੁਮਾਨ",
            "condition": "ਭੂਮੀਗਤ ਜਲ ਸਥਿਤੀ",
            "trend": "ਰੁਝਾਨ",
            "recharge": "ਰੀਚਾਰਜ ਸੰਭਾਵਨਾ",
            "crops": "ਘੱਟ ਪਾਣੀ ਵਾਲੀਆਂ ਫਸਲਾਂ",
            "irrigation": "ਸਿੰਚਾਈ ਸਲਾਹ",
            "actions": "ਕਿਸਾਨ ਕਾਰਜ ਯੋਜਨਾ",
            "disclaimer": "ਮਾਡਲ-ਆਧਾਰਿਤ ਅਨੁਮਾਨ; ਪ੍ਰਤੱਖ ਖੂਹ ਦਾ ਮਾਪ ਨਹੀਂ ਹੈ।",
            "confidence": "ਭਰੋਸੇ ਦਾ ਪੱਧਰ",
            "falling": "ਗਿਰਾਵਟ",
            "rising": "ਸੁਧਾਰ",
            "stable": "ਸਥਿਰ",
            "critical": "ਗੰਭੀਰ ਤਣਾਅ",
            "warning": "ਉੱਚ ਤਣਾਅ",
            "moderate": "ਦਰਮਿਆਨਾ ਤਣਾਅ",
            "healthy": "ਵਧੀਆ",
        },
        "ml": {
            "title": "ജൽക്രിഷി AI — കർഷക തീരുമാന സഹായം",
            "coverage_dwlr": "നേരിട്ടുള്ള DWLR അളവ്",
            "coverage_sat": "ഉപഗ്രഹ സാങ്കേതികവിദ്യ അടിസ്ഥാനമാക്കിയുള്ള ഭൂഗർഭജല കണക്കുകൂട്ടൽ",
            "condition": "ഭൂഗർഭജല സ്ഥിതി",
            "trend": "ട്രെൻഡ്",
            "recharge": "റീചാർജ് സാധ്യത",
            "crops": "കുറഞ്ഞ ജല ഉപയോഗമുള്ള വിളകൾ",
            "irrigation": "നനയ്ക്കൽ നിർദ്ദേശം",
            "actions": "കർഷക കർമ്മ പദ്ധതി",
            "disclaimer": "മോഡൽ അധിഷ്ഠിത കണക്കുകൂട്ടൽ; നേരിട്ടുള്ള കിണർ അളവല്ല.",
            "confidence": "വിശ്വാസ്യത നില",
            "falling": "കുറയുന്നു",
            "rising": "വർദ്ധിക്കുന്നു",
            "stable": "സ്ഥിരതയാർന്നത്",
            "critical": "ഗുരുതരം",
            "warning": "ഉയർന്ന സമ്മർദ്ദം",
            "moderate": "മിതമായത്",
            "healthy": "തൃപ്തികരം",
        },
        "or": {
            "title": "ଜଳକୃଷି AI — କୃଷକ ନିର୍ଣ୍ଣୟ ସହାୟତା",
            "coverage_dwlr": "ପ୍ରତ୍ୟକ୍ଷ DWLR ମାପ",
            "coverage_sat": "ଉପଗ୍ରହ-ସହାୟତା ପ୍ରାପ୍ତ ଭୂତଳ ଜଳ ଆକଳନ",
            "condition": "ଭୂତଳ ଜଳ ସ୍ଥିତି",
            "trend": "ଧାରା",
            "recharge": "ରିଚାର୍ଜ ସମ୍ଭାବନା",
            "crops": "କମ୍ ଜଳ ଆବଶ୍ୟକ ଫସଲ",
            "irrigation": "ଜଳସେଚନ ପରାମର୍ଶ",
            "actions": "କୃଷକ କାର୍ଯ୍ୟ ଯୋଜନା",
            "disclaimer": "ମଡେଲ-ଆଧାରିତ ଆକଳନ; ସିଧାସଳଖ କୂଅର ମାପ ନୁହେଁ।",
            "confidence": "ବିଶ୍ୱାସ ସ୍ତର",
            "falling": "ହ୍ରାସ",
            "rising": "ଉନ୍ନତି",
            "stable": "ସ୍ଥିର",
            "critical": "ଗମ୍ଭୀର ଚାପ",
            "warning": "ଉଚ୍ଚ ଚାପ",
            "moderate": "ମଧ୍ୟମ ଚାପ",
            "healthy": "ଭଲ",
        },
        "as": {
            "title": "জলকৃষি AI — কৃষক সিদ্ধান্ত সহায়তা",
            "coverage_dwlr": "প্ৰত্যক্ষ DWLR পৰিমাপ",
            "coverage_sat": "উপগ্ৰহ-সহায়তা প্ৰাপ্ত ভূগৰ্ভস্থ জল অনুমান",
            "condition": "ভূগৰ্ভস্থ পানীৰ অৱস্থা",
            "trend": "প্ৰৱণতা",
            "recharge": "পুনৰ্ভৰণ সম্ভাৱনা",
            "crops": "কম পানীৰ শস্য",
            "irrigation": "জলসিঞ্চন পৰামৰ্শ",
            "actions": "কৃষক কাৰ্য পৰিকল্পনা",
            "disclaimer": "মডেল-ভিত্তিক অনুমান; প্ৰত্যক্ষ কুঁৱাৰ পৰিমাপ নহয়।",
            "confidence": "বিশ্বাসৰ মাত্ৰা",
            "falling": "হ্ৰাস",
            "rising": "উন্নতি",
            "stable": "স্থিৰ",
            "critical": "গম্ভীৰ চাপ",
            "warning": "উচ্চ চাপ",
            "moderate": "মধ্যম চাপ",
            "healthy": "ভাল",
        },
        "ur": {
            "title": "جل کرشی AI — کسان فیصلہ سازی کی معاونت",
            "coverage_dwlr": "براہ راست DWLR پیمائش",
            "coverage_sat": "سیٹلائٹ کی مدد سے زیر زمین پانی کا تخمینہ",
            "condition": "زیر زمین پانی کی صورتحال",
            "trend": "رجحان",
            "recharge": "ریچارج کا امکان",
            "crops": "کم پانی والی تجارتی فصلیں",
            "irrigation": "آبپاشی کی ہدایت",
            "actions": "کسان کا لائحہ عمل",
            "disclaimer": "ماڈل پر مبنی تخمینہ؛ براہ راست کنویں کی پیمائش نہیں ہے۔",
            "confidence": "اعتماد کی سطح",
            "falling": "گراوٹ",
            "rising": "بہتری",
            "stable": "مستحکم",
            "critical": "شدید دباؤ",
            "warning": "زیادہ دباؤ",
            "moderate": "معتدل دباؤ",
            "healthy": "بہتر",
        },
    }

    @classmethod
    def format_farmer_response(
        cls,
        intel: GroundwaterIntelligenceSchema,
        target_lang: str = "en",
    ) -> str:
        """
        Formats structured GroundwaterIntelligenceSchema into concise farmer natural language response in target language.
        Preserves data-honesty disclaimers and satellite-assisted terms across all languages.
        """
        st_header = ""
        if intel.nearest_station_name and intel.nearest_station_id:
            st_header = f" — {intel.nearest_station_name} [{intel.nearest_station_id}]"
        elif intel.nearest_station_id:
            st_header = f" — DWLR Station {intel.nearest_station_id}"

        if target_lang not in cls.TRANSLATED_TERMS:
            # English Default
            cov_label = intel.coverage_type
            cond_label = intel.groundwater_condition.replace("_", " ")
            trend_label = intel.trend
            recharge_label = intel.recharge_outlook
            crops_str = ", ".join(intel.recommended_crops[:3])
            irrigation_str = intel.irrigation_implications

            lines = [
                f"🌾 JalKrishi Farmer Advice{st_header} ({cov_label}):",
                f"• Groundwater Condition: {cond_label} (Stress Score: {intel.stress_score:.2f})",
                f"• Trajectory Trend: {trend_label}",
                f"• Recharge Outlook: {recharge_label}",
                f"• Recommended Water-Smart Crops: {crops_str}",
                f"• Irrigation Guidance: {irrigation_str}",
                f"• Confidence: {intel.confidence} ({round(intel.confidence_score * 100)}%)",
                f"• Provenance: {intel.disclaimer}",
            ]
            return "\n".join(lines)

        terms = cls.TRANSLATED_TERMS[target_lang]
        is_dwlr = intel.estimation_mode == "DIRECT_DWLR"
        cov_label = terms["coverage_dwlr"] if is_dwlr else terms["coverage_sat"]

        # Map condition label
        cond_raw = intel.groundwater_condition.lower()
        cond_label = terms["critical"] if "critical" in cond_raw else terms["warning"] if "high" in cond_raw or "warning" in cond_raw else terms["moderate"] if "moderate" in cond_raw else terms["healthy"]

        # Map trend label
        tr_raw = intel.trend.upper()
        trend_label = terms["falling"] if tr_raw == "FALLING" else terms["rising"] if tr_raw == "RISING" else terms["stable"]

        crops_str = ", ".join(intel.recommended_crops[:3])

        lines = [
            f"🌾 {terms['title']}{st_header} ({cov_label}):",
            f"• {terms['condition']}: {cond_label} (Stress Index: {intel.stress_score:.2f})",
            f"• {terms['trend']}: {trend_label}",
            f"• {terms['recharge']}: {intel.recharge_outlook}",
            f"• {terms['crops']}: {crops_str}",
            f"• {terms['irrigation']}: {intel.irrigation_implications}",
            f"• {terms['confidence']}: {intel.confidence}",
            f"• {terms['disclaimer']}",
        ]
        return "\n".join(lines)


stt_provider = SpeechToTextProvider()
tts_provider = TextToSpeechProvider()
hydro_translator = HydroAgronomicTranslator()
