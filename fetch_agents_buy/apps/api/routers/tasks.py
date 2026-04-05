"""
POST /tasks — submit a new shopping run.
GET  /tasks — list recent runs (summary).
"""
import logging
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import ConfigEntry, Run
from apps.api.schemas import CreateRunRequest, CreateRunResponse, RunStatus, ShoppingItem

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tasks"])


@router.post("/tasks", response_model=CreateRunResponse, status_code=201)
async def create_run(request: CreateRunRequest, db: Session = Depends(get_db)):
    """
    Submit a shopping instruction. Creates a Run row with status=pending.
    The orchestrator agent polls SQLite and picks it up within ~2 seconds.
    """
    if not request.instruction or not request.instruction.strip():
        raise HTTPException(status_code=400, detail="Instruction cannot be empty")

    run_id = str(uuid.uuid4())
    run = Run(
        id=run_id,
        instruction=request.instruction.strip(),
        status="pending",
        items=[],
        results=[],
        total_budget=request.total_budget,
        total_spent=0.0,
        stripe_session_id=request.stripe_session_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()

    logger.info(f"Created run {run_id}: {request.instruction[:60]}...")
    return CreateRunResponse(run_id=run_id, status="pending")


@router.get("/tasks", response_model=List[dict])
async def list_runs(
    limit: int = 20,
    status: str = None,
    db: Session = Depends(get_db),
):
    """List recent runs with summary info."""
    q = db.query(Run).order_by(Run.created_at.desc())
    if status:
        q = q.filter(Run.status == status)
    runs = q.limit(limit).all()

    return [
        {
            "run_id": r.id,
            "instruction": r.instruction[:100],
            "status": r.status,
            "total_budget": r.total_budget,
            "total_spent": r.total_spent,
            "item_count": len(r.items) if r.items else 0,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in runs
    ]
