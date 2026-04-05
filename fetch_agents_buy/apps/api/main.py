"""
DiamondHacks 2026 — FastAPI control plane.

Endpoints:
  POST /tasks                    — submit a shopping run
  GET  /tasks                    — list runs
  GET  /runs/{id}                — full run status
  GET  /runs/{id}/events         — SSE stream
  GET  /runs/{id}/sessions       — Browser Use sessions for a run
  GET  /runs/{id}/screenshots    — screenshots for a run
  GET  /sessions                 — all sessions
  GET  /sessions/{id}            — single session
  GET  /health                   — health check
  GET  /registry                 — agent registry
  GET  /modes                    — current mode flags
  PUT  /modes                    — update mode flags
  POST /webhooks/stripe          — Stripe webhook (optional)
  POST /internal/agent-event     — called by agents to report status
"""
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Make repo root importable
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.api.config import CORS_ORIGINS, SCREENSHOTS_DIR
from apps.api.database import create_all_tables
from apps.api.routers import (
    events,
    health,
    internal,
    modes,
    registry,
    runs,
    sessions,
    tasks,
    webhooks,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("DiamondHacks API starting up...")
    create_all_tables()
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Database tables created")
    yield
    # Shutdown
    logger.info("DiamondHacks API shutting down")


app = FastAPI(
    title="DiamondHacks Shopping Agent API",
    description="Multi-agent Amazon shopping automation — DiamondHacks 2026",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve screenshots as static files
app.mount("/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR), check_dir=False), name="screenshots")

# Register routers
app.include_router(health.router)
app.include_router(tasks.router)
app.include_router(runs.router)
app.include_router(events.router)
app.include_router(sessions.router)
app.include_router(registry.router)
app.include_router(modes.router)
app.include_router(webhooks.router)
app.include_router(internal.router)


@app.get("/")
async def root():
    return {
        "name": "DiamondHacks Shopping Agent API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.main:app", host="0.0.0.0", port=8000, reload=True)
