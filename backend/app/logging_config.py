import logging
import sys
from app.config import settings

def setup_logging():
    """Configures structured Python logging for JalKrishi AI backend."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Avoid duplicate handlers on re-initialization
    if not root_logger.handlers:
        root_logger.addHandler(handler)

    # Set specific levels for app submodules
    logging.getLogger("app").setLevel(log_level)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

logger = logging.getLogger("app.backend")
