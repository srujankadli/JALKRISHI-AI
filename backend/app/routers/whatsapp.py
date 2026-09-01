from fastapi import APIRouter, status
from app.models.schemas import WhatsAppWebhookRequest, WhatsAppWebhookResponse
from app.services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Farmer Interface"])


@router.post(
    "/webhook",
    response_model=WhatsAppWebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="WhatsApp Farmer Conversational Webhook",
    description="Processes incoming farmer conversational text queries or GPS coords and returns structured, bilingual responses.",
)
def whatsapp_webhook(request: WhatsAppWebhookRequest) -> WhatsAppWebhookResponse:
    return whatsapp_service.process_message(request)


@router.get(
    "/health",
    summary="WhatsApp Service Health Check",
)
def whatsapp_health():
    return {
        "status": "healthy",
        "service": "JalKrishi WhatsApp Conversational AI",
        "data_mode": "DEMO_SIMULATION",
        "supported_intents": [
            "WATER_STATUS",
            "NEAREST_STATION",
            "CROP_RECOMMENDATION",
            "FORECAST",
            "ANOMALIES",
            "STATION_DETAILS",
            "HELP",
            "GREETING",
            "UNKNOWN",
        ],
        "supported_languages": ["en", "hi"],
    }
