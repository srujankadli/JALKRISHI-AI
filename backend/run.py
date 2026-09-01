import os
import sys

# Ensure backend directory is in sys.path so 'app' module can be imported regardless of execution working directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from app.config import settings

if __name__ == "__main__":
    # In cloud environments (Render, Railway, Docker), HOST must bind to 0.0.0.0 to accept external traffic.
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
