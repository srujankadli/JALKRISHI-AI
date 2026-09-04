import time
import uuid
from datetime import datetime
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import setup_logging, logger

from app.routers.health import router as health_router
from app.routers.system import router as system_router
from app.routers.stations import router as stations_router
from app.routers.analytics import router as analytics_router
from app.routers.forecast import router as forecast_router
from app.routers.anomalies import router as anomalies_router
from app.routers.crops import router as crops_router
from app.routers.whatsapp import router as whatsapp_router
from app.routers.data_pipeline import router as data_pipeline_router
from app.routers.insights import router as insights_router
from app.routers.auth import router as auth_router
from app.routers.satellite_groundwater import router as satellite_groundwater_router
from app.routers.farmer_intelligence import router as farmer_intelligence_router
from app.routers.provider_resilience import router as provider_resilience_router
from app.routers.voice import router as voice_router
from app.routers.official_intelligence import router as official_intelligence_router

# Initialize Logging
setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "FastAPI Hydrogeological Intelligence Backend for JalKrishi AI. "
        "Evaluates real-time DWLR groundwater telemetry, forecasts depletion velocity, "
        "triages statistical anomalies, and generates hydro-agronomic crop sowing recommendations."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Logging & Timing Middleware
@app.middleware("http")
async def request_timing_and_logging_middleware(request: Request, call_next):
    req_id = f"req-{uuid.uuid4().hex[:8]}"
    request.state.request_id = req_id
    start_time = time.time()

    # Content length guard check for upload requests
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.CSV_MAX_SIZE_BYTES:
                logger.warning(f"Payload size {content_length} bytes exceeds limit {settings.CSV_MAX_SIZE_BYTES} bytes [{req_id}]")
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "error": "Payload Too Large",
                        "detail": f"Request body exceeds maximum allowed limit of {settings.CSV_MAX_SIZE_BYTES / (1024*1024):.1f} MB.",
                        "request_id": req_id,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    },
                )
        except ValueError:
            pass

    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    response.headers["X-Request-ID"] = req_id
    response.headers["X-Process-Time"] = f"{duration_ms}ms"

    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms) [{req_id}]")
    return response


# Custom Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.warning(f"HTTPException {exc.status_code}: {exc.detail} [{req_id}]")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Exception",
            "detail": exc.detail,
            "status_code": exc.status_code,
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.warning(f"Validation Error: {exc.errors()} [{req_id}]")
    sanitized_issues = []
    for err in exc.errors():
        err_copy = dict(err)
        if "input" in err_copy and isinstance(err_copy["input"], bytes):
            err_copy["input"] = f"<bytes len={len(err_copy['input'])}>"
        sanitized_issues.append(err_copy)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": "Invalid request parameter format or value payload.",
            "issues": sanitized_issues,
            "status_code": 422,
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {str(exc)} [{req_id}]", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected backend processing error occurred. Sanitized response returned.",
            "status_code": 500,
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    )


# Include Routers
app.include_router(system_router)
app.include_router(health_router)
app.include_router(stations_router)
app.include_router(analytics_router)
app.include_router(forecast_router)
app.include_router(anomalies_router)
app.include_router(crops_router)
app.include_router(insights_router, prefix=settings.API_V1_STR)
app.include_router(insights_router, prefix="/api")
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix="/api")
app.include_router(whatsapp_router, prefix=settings.API_V1_STR)
app.include_router(whatsapp_router, prefix="/api")
app.include_router(data_pipeline_router, prefix=settings.API_V1_STR)
app.include_router(data_pipeline_router, prefix="/api")
app.include_router(satellite_groundwater_router, prefix=settings.API_V1_STR)
app.include_router(satellite_groundwater_router, prefix="/api")
app.include_router(farmer_intelligence_router, prefix=settings.API_V1_STR)
app.include_router(farmer_intelligence_router, prefix="/api")
app.include_router(provider_resilience_router, prefix=settings.API_V1_STR)
app.include_router(provider_resilience_router, prefix="/api")
app.include_router(voice_router, prefix=settings.API_V1_STR)
app.include_router(voice_router, prefix="/api")
app.include_router(official_intelligence_router, prefix=settings.API_V1_STR)
app.include_router(official_intelligence_router, prefix="/api")


@app.get("/", summary="Root Overview")
def root_overview():
    """Root entrypoint providing service metadata and API navigation links."""
    return {
        "app_name": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": settings.VERSION,
        "organization": settings.ORGANIZATION,
        "data_mode": settings.DATA_MODE,
        "disclaimer": settings.DEMO_DISCLAIMER,
        "endpoints": {
            "health": "/health",
            "ready": f"{settings.API_V1_STR}/ready",
            "system_status": f"{settings.API_V1_STR}/system/status",
            "api_health": f"{settings.API_V1_STR}/health",
            "stations": f"{settings.API_V1_STR}/stations",
            "station_summary": f"{settings.API_V1_STR}/stations/summary",
            "station_search": f"{settings.API_V1_STR}/stations/search?q=kolar",
            "analytics_summary": f"{settings.API_V1_STR}/analytics/summary",
            "analytics_states": f"{settings.API_V1_STR}/analytics/states",
            "analytics_states_ranking": f"{settings.API_V1_STR}/analytics/states/risk-ranking",
            "analytics_districts": f"{settings.API_V1_STR}/analytics/districts",
            "analytics_districts_ranking": f"{settings.API_V1_STR}/analytics/districts/risk-ranking",
            "analytics_trend": f"{settings.API_V1_STR}/analytics/trend?days=30",
            "forecast_station": f"{settings.API_V1_STR}/forecast/DWLR-PB-001?days=30",
            "forecast_summary": f"{settings.API_V1_STR}/forecast/summary",
            "forecast_top_risk": f"{settings.API_V1_STR}/forecast/top-risk?limit=10&days=30",
            "forecast_regional": f"{settings.API_V1_STR}/forecast/regional?days=90",
            "anomalies_feed": f"{settings.API_V1_STR}/anomalies",
            "anomalies_summary": f"{settings.API_V1_STR}/anomalies/summary",
            "anomalies_distribution": f"{settings.API_V1_STR}/anomalies/distribution",
            "anomalies_states": f"{settings.API_V1_STR}/anomalies/states",
            "crops_recommend": f"{settings.API_V1_STR}/crops/recommend",
            "crops_compare": f"{settings.API_V1_STR}/crops/compare",
            "crops_catalog": f"{settings.API_V1_STR}/crops/catalog",
            "data_status": f"{settings.API_V1_STR}/data/status",
            "data_refresh": f"{settings.API_V1_STR}/data/refresh",
            "data_validate_csv": f"{settings.API_V1_STR}/data/validate-csv",
            "whatsapp_webhook": f"{settings.API_V1_STR}/whatsapp/webhook",
            "interactive_docs": "/docs",
            "redoc": "/redoc",
        },
    }
