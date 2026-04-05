"""
GET /runs/{run_id}            — full run status with events and results
GET /runs/{run_id}/screenshots — list screenshots for a run
GET /active-run-id            — most recent in-progress run ID (used by cart-agent)
GET /run-sessions             — sessions for a run, with item_name from event payloads
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import Run, RunEvent, ScreenshotRecord
from apps.api.schemas import AgentEvent, BuyResult, RunStatus, ScreenshotMeta, ShoppingItem

logger = logging.getLogger(__name__)
router = APIRouter(tags=["runs"])


def _run_to_schema(run: Run, events: List[RunEvent], screenshots: List[ScreenshotRecord]) -> RunStatus:
    return RunStatus(
        run_id=run.id,
        instruction=run.instruction,
        status=run.status,
        items=[ShoppingItem(**item) for item in (run.items or [])],
        events=[
            AgentEvent(
                run_id=e.run_id,
                agent_name=e.agent_name,
                event_type=e.event_type,
                timestamp=e.timestamp,
                payload=e.payload or {},
            )
            for e in events
        ],
        results=[BuyResult(**r) for r in (run.results or [])],
        total_budget=run.total_budget,
        total_spent=run.total_spent or 0.0,
        created_at=run.created_at,
        updated_at=run.updated_at,
    )


@router.get("/runs/{run_id}", response_model=RunStatus)
async def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    events = (
        db.query(RunEvent)
        .filter(RunEvent.run_id == run_id)
        .order_by(RunEvent.timestamp)
        .all()
    )
    screenshots = db.query(ScreenshotRecord).filter(ScreenshotRecord.run_id == run_id).all()
    return _run_to_schema(run, events, screenshots)


@router.get("/runs/{run_id}/screenshots", response_model=List[ScreenshotMeta])
async def get_run_screenshots(run_id: str, db: Session = Depends(get_db)):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    screenshots = (
        db.query(ScreenshotRecord)
        .filter(ScreenshotRecord.run_id == run_id)
        .order_by(ScreenshotRecord.timestamp)
        .all()
    )
    return [
        ScreenshotMeta(
            id=s.id,
            run_id=s.run_id,
            item_name=s.item_name,
            file_url=s.file_url,
            timestamp=s.timestamp,
        )
        for s in screenshots
    ]


@router.get("/active-run-id")
async def get_active_run_id(db: Session = Depends(get_db)):
    """Return the most recently created run that is in_progress (or latest overall)."""
    run = (
        db.query(Run)
        .filter(Run.status == "in_progress")
        .order_by(Run.created_at.desc())
        .first()
    )
    if not run:
        # Fall back to the most recent run of any status
        run = db.query(Run).order_by(Run.created_at.desc()).first()
    return {"run_id": run.id if run else ""}


@router.get("/run-sessions")
async def get_run_sessions_by_query(run_id: str, db: Session = Depends(get_db)):
    """
    Return sessions for a run, with item_name sourced from session_created event payloads.
    Used by cart-agent to find halted BrowserUse sessions.
    """
    events = (
        db.query(RunEvent)
        .filter(RunEvent.run_id == run_id, RunEvent.event_type == "session_created")
        .order_by(RunEvent.timestamp)
        .all()
    )
    seen: set = set()
    sessions = []
    for e in events:
        sid = (e.payload or {}).get("session_id", "")
        if sid and sid not in seen:
            seen.add(sid)
            sessions.append({
                "session_id": sid,
                "item_name": (e.payload or {}).get("item_name", ""),
                "live_view_url": (e.payload or {}).get("live_view_url", ""),
                "agent_name": e.agent_name,
            })
    return {"sessions": sessions}
