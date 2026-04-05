"""
GET /sessions            — list all Browser Use sessions
GET /sessions/{id}       — single session metadata
GET /runs/{run_id}/sessions — sessions for a specific run
"""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import BrowserSessionRecord
from apps.api.schemas import BrowserSessionMeta

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sessions"])


def _to_schema(s: BrowserSessionRecord) -> BrowserSessionMeta:
    return BrowserSessionMeta(
        session_id=s.id,
        run_id=s.run_id,
        agent_name=s.agent_name,
        live_view_url=s.live_view_url,
        debugger_url=s.debugger_url,
        status=s.status,
        created_at=s.created_at,
    )


@router.get("/sessions", response_model=List[BrowserSessionMeta])
async def list_sessions(limit: int = 50, db: Session = Depends(get_db)):
    sessions = (
        db.query(BrowserSessionRecord)
        .order_by(BrowserSessionRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_schema(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=BrowserSessionMeta)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(BrowserSessionRecord).filter(BrowserSessionRecord.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_schema(s)


@router.get("/runs/{run_id}/sessions", response_model=List[BrowserSessionMeta])
async def get_run_sessions(run_id: str, db: Session = Depends(get_db)):
    sessions = (
        db.query(BrowserSessionRecord)
        .filter(BrowserSessionRecord.run_id == run_id)
        .order_by(BrowserSessionRecord.created_at)
        .all()
    )
    return [_to_schema(s) for s in sessions]
