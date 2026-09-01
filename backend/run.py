import os
import uvicorn
from app.config import settings

if __name__ == "__main__":
    host = os.environ.get("HOST", settings.HOST)
    port = int(os.environ.get("PORT", settings.PORT))
    
    print("==================================================")
    print(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    print(f"Host: {host} | Port: {port} | Env: {settings.APP_ENV}")
    print(f"Active Data Mode: {settings.DATA_MODE}")
    print("==================================================")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
