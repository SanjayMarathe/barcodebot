"""
GET  /modes      — return current mode flags
PUT  /modes      — update mode flags (stored in SQLite config table)
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import ConfigEntry
from apps.api.schemas import ModeConfig, UpdateModesRequest

logger = logging.getLogger(__name__)
router = APIRouter(tags=["modes"])

DEFAULTS = {
    "treasury_mode": "mock",
    "browser_mode": "browser_use",
    "checkout_mode": "add_to_cart",
}


def _get_config(db: Session) -> dict:
    rows = db.query(ConfigEntry).all()
    cfg = dict(DEFAULTS)
    for row in rows:
        cfg[row.key] = row.value
    return cfg


def _set_config(db: Session, key: str, value: str):
    row = db.query(ConfigEntry).filter(ConfigEntry.key == key).first()
    if row:
        row.value = value
    else:
        db.add(ConfigEntry(key=key, value=value))
    db.commit()


@router.get("/modes", response_model=ModeConfig)
async def get_modes(db: Session = Depends(get_db)):
    cfg = _get_config(db)
    return ModeConfig(**cfg)


@router.put("/modes", response_model=ModeConfig)
async def update_modes(req: UpdateModesRequest, db: Session = Depends(get_db)):
    if req.treasury_mode is not None:
        _set_config(db, "treasury_mode", req.treasury_mode)
        logger.info(f"treasury_mode → {req.treasury_mode}")
    if req.browser_mode is not None:
        _set_config(db, "browser_mode", req.browser_mode)
        logger.info(f"browser_mode → {req.browser_mode}")
    if req.checkout_mode is not None:
        _set_config(db, "checkout_mode", req.checkout_mode)
        logger.info(f"checkout_mode → {req.checkout_mode}")

    cfg = _get_config(db)
    return ModeConfig(**cfg)
