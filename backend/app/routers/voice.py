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


from app.engines.farmer_conversation_manager import farmer_conversation_manager


@router.post("/respond", response_model=VoiceQueryResponse)
def respond_to_voice_query(request: VoiceQueryRequest):
    """
    Core Voice Assistant Query Endpoint:
    Orchestrates farmer query through FarmerConversationManager.
    Translates decision support into requested/detected language while preserving data honesty.
    """
    raw_query = request.query.strip() if request.query else ""
    if not raw_query and not request.audio_base64:
        raise HTTPException(status_code=400, detail="Query text or audio_base64 payload must be provided.")

    sess_id = request.session_id or "default"
    return farmer_conversation_manager.process_farmer_message(request, session_id=sess_id)


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
