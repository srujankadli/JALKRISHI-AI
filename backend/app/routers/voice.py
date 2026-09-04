from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional

from app.models.schemas import (
    LanguageConfigSchema,
    VoiceQueryRequest,
    VoiceQueryResponse,
    TTSRequest,
    TTSResponse,
)
from app.services.speech.multilingual_service import (
    SUPPORTED_LANGUAGES,
    LanguageDetector,
    stt_provider,
    tts_provider,
    hydro_translator,
)
from app.engines.farmer_intelligence import farmer_intelligence_engine
from app.config import settings

router = APIRouter(prefix="/voice", tags=["Multilingual Voice Assistant"])


@router.get("/languages", response_model=List[LanguageConfigSchema])
def get_supported_languages():
    """
    Returns list of 13 supported Indian regional languages and provider capabilities.
    """
    return SUPPORTED_LANGUAGES


@router.post("/transcribe")
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
):
    """
    Transcribes farmer spoken audio stream and detects spoken language.
    If speech provider is NOT_CONFIGURED, returns graceful text fallback status.
    """
    if not file:
        return {
            "query_text": "",
            "detected_language": "en",
            "stt_provider_status": stt_provider.status,
            "message": "No audio file provided. Please use text query fallback or configure Speech-to-Text provider.",
        }

    content = await file.read()
    query_text, lang, status = stt_provider.transcribe(content, file.content_type or "audio/wav")
    return {
        "query_text": query_text,
        "detected_language": lang,
        "stt_provider_status": status,
        "message": "Audio transcription completed." if query_text else "Speech-to-Text provider is NOT_CONFIGURED. Please use text query fallback.",
    }


from app.engines.farmer_intent_router import farmer_intent_router


@router.post("/respond", response_model=VoiceQueryResponse)
def respond_to_voice_query(request: VoiceQueryRequest):
    """
    Core Voice Assistant Query Endpoint:
    Dynamically routes farmer queries based on classified intent (CONVERSATIONAL vs INTELLIGENCE).
    Translates decision support into requested/detected language while preserving data honesty.
    """
    raw_query = request.query.strip() if request.query else ""
    if not raw_query and not request.audio_base64:
        raise HTTPException(status_code=400, detail="Query text or audio_base64 payload must be provided.")

    # 1. Language Detection & Resolution
    detected_lang = LanguageDetector.detect_language(raw_query, default=request.language or "en")
    target_lang = request.language if request.language in [l.language_code for l in SUPPORTED_LANGUAGES] else detected_lang

    # 2. Intent Routing & Classification
    intent_res = farmer_intent_router.classify_intent(raw_query, language=target_lang)

    # 3. Branch: CONVERSATIONAL Mode
    if intent_res.response_type == "CONVERSATIONAL":
        conv_text = farmer_intent_router.generate_conversational_response(
            intent=intent_res.intent,
            lang=target_lang,
            user_name=intent_res.extracted_name
        )
        audio_url, tts_status = tts_provider.synthesize(conv_text, target_lang)

        return VoiceQueryResponse(
            query_text=raw_query or "Spoken Voice Query",
            detected_language=detected_lang,
            farmer_response_language=target_lang,
            intent=intent_res.intent,
            response_type="CONVERSATIONAL",
            text_response=conv_text,
            intelligence=None,
            location=None,
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
        )

    # 4. Branch: INTELLIGENCE Mode
    target_loc_query = request.location_query
    if not target_loc_query and intent_res.extracted_location and intent_res.extracted_location.is_resolved:
        target_loc_query = intent_res.extracted_location.name

    intel = farmer_intelligence_engine.get_unified_groundwater_intelligence(
        lat=request.latitude,
        lon=request.longitude,
        radius_km=15.0,
        station_id=request.station_id,
        location_query=target_loc_query,
        query_text=raw_query,
    )

    formatted_text = hydro_translator.format_farmer_response(intel, target_lang)
    audio_url, tts_status = tts_provider.synthesize(formatted_text, target_lang)

    disclaimer = (
        "Multilingual Voice Assistant: Driven by JalKrishi Unified Farmer Intelligence Engine. "
        "Language translations preserve scientific data-honesty disclaimers."
    )

    return VoiceQueryResponse(
        query_text=raw_query or "Spoken Voice Query",
        detected_language=detected_lang,
        farmer_response_language=target_lang,
        intent=intent_res.intent,
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
        disclaimer=disclaimer,
    )


@router.post("/synthesize", response_model=TTSResponse)
def synthesize_speech(request: TTSRequest):
    """
    Synthesizes Text-to-Speech audio for farmer advice text.
    Returns status NOT_CONFIGURED if cloud TTS credentials are not set.
    """
    audio_url, status = tts_provider.synthesize(request.text, request.language)
    msg = (
        f"TTS synthesized for language '{request.language}'."
        if audio_url
        else f"Text-to-Speech provider is {status}. Voice playback unavailable; text response remains active."
    )

    return TTSResponse(
        text=request.text,
        language=request.language,
        audio_url=audio_url,
        status=status,
        message=msg,
    )
