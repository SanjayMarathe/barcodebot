"""
GET /runs/{run_id}/events — SSE stream of agent events for a run.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import Run
from apps.api.sse_manager import sse_manager

try:
    from sse_starlette.sse import EventSourceResponse  # type: ignore
except ImportError:
    EventSourceResponse = None  # handled gracefully below

logger = logging.getLogger(__name__)
router = APIRouter(tags=["events"])


@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str, request: Request, db: Session = Depends(get_db)):
    """
    SSE endpoint. The client should connect with:
        const es = new EventSource('/runs/{run_id}/events')
        es.onmessage = (e) => { ... }

    Sends 'ping' events every 25s to keep the connection alive.
    Closes when the run completes or the client disconnects.
    """
    if EventSourceResponse is None:
        raise HTTPException(
            status_code=501,
            detail="SSE not available. Install sse-starlette: pip install sse-starlette",
        )

    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return EventSourceResponse(sse_manager.stream(run_id, request))
