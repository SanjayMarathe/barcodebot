"""GET /health — system health check."""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.config import BROWSER_MODE, CHECKOUT_MODE, TREASURY_MODE
from apps.api.database import get_db
from apps.api.schemas import HealthResponse, ModeConfig

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Returns system health. Useful for startup verification."""
    db_ok = False
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"DB health check failed: {e}")

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        db="ok" if db_ok else "error",
        agents_reachable=True,  # TODO: ping agent ports
        mode=ModeConfig(
            treasury_mode=TREASURY_MODE,
            browser_mode=BROWSER_MODE,
            checkout_mode=CHECKOUT_MODE,
        ),
    )
