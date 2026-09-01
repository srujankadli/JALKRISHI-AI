from app.routers.health import router as health_router
from app.routers.stations import router as stations_router
from app.routers.analytics import router as analytics_router
from app.routers.forecast import router as forecast_router
from app.routers.anomalies import router as anomalies_router
from app.routers.crops import router as crops_router

__all__ = [
    "health_router",
    "stations_router",
    "analytics_router",
    "forecast_router",
    "anomalies_router",
    "crops_router",
]
