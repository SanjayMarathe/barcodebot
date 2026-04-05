"""
POST /internal/agent-event

Called by agents to report status. Stores event in SQLite and fans out to SSE.
This endpoint is not meant to be called by the frontend directly.
"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import BrowserSessionRecord, Run, RunEvent, ScreenshotRecord
from apps.api.schemas import AgentEvent
from apps.api.sse_manager import sse_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["internal"])


@router.post("/internal/agent-event")
async def receive_agent_event(event: AgentEvent, db: Session = Depends(get_db)):
    """Receive a status event from an agent, persist it, and fan out via SSE."""
    # Persist event
    db_event = RunEvent(
        run_id=event.run_id,
        agent_name=event.agent_name,
        event_type=event.event_type,
        payload=event.payload,
        timestamp=event.timestamp or datetime.utcnow(),
    )
    db.add(db_event)

    # Update Run status based on event type
    run = db.query(Run).filter(Run.id == event.run_id).first()
    if run:
        if event.event_type == "run_started":
            run.status = "in_progress"
        elif event.event_type == "run_complete":
            run.status = "completed"
            if "results" in event.payload:
                run.results = event.payload["results"]
            if "total_spent" in event.payload:
                run.total_spent = event.payload["total_spent"]
        elif event.event_type == "run_failed":
            run.status = "failed"

        # Handle browser session registration
        if event.event_type == "session_created":
            payload = event.payload
            session_id = payload.get("session_id", "")
            if session_id:
                existing = db.query(BrowserSessionRecord).filter(
                    BrowserSessionRecord.id == session_id
                ).first()
                if not existing:
                    db.add(BrowserSessionRecord(
                        id=session_id,
                        run_id=event.run_id,
                        agent_name=event.agent_name,
                        live_view_url=payload.get("live_view_url", ""),
                        debugger_url=payload.get("debugger_url", ""),
                        status="running",
                    ))

        # Handle screenshot registration
        if event.event_type == "screenshot_saved":
            payload = event.payload
            db.add(ScreenshotRecord(
                run_id=event.run_id,
                item_name=payload.get("item_name", "unknown"),
                file_path=payload.get("screenshot_path", ""),
                file_url=payload.get("screenshot_url", ""),
            ))

        run.updated_at = datetime.utcnow()

    db.commit()

    # Fan out to SSE subscribers
    event_dict = {
        "run_id": event.run_id,
        "agent_name": event.agent_name,
        "event_type": event.event_type,
        "timestamp": event.timestamp.isoformat() if event.timestamp else datetime.utcnow().isoformat(),
        "payload": event.payload,
    }
    await sse_manager.publish(event.run_id, event_dict)

    logger.debug(f"Agent event: {event.agent_name} / {event.event_type} for run {event.run_id[:8]}")
    return {"ok": True}
