"""SQLAlchemy ORM models for the diamond_hacks database."""
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from apps.api.database import Base


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    items: Mapped[Any] = mapped_column(JSON, default=list)     # List[ShoppingItem dicts]
    results: Mapped[Any] = mapped_column(JSON, default=list)   # List[BuyResult dicts]
    total_budget: Mapped[float] = mapped_column(Float, default=200.0)
    total_spent: Mapped[float] = mapped_column(Float, default=0.0)
    stripe_session_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    events: Mapped[list["RunEvent"]] = relationship(
        "RunEvent", back_populates="run", order_by="RunEvent.timestamp"
    )
    browser_sessions: Mapped[list["BrowserSessionRecord"]] = relationship(
        "BrowserSessionRecord", back_populates="run"
    )
    screenshots: Mapped[list["ScreenshotRecord"]] = relationship(
        "ScreenshotRecord", back_populates="run"
    )


class RunEvent(Base):
    __tablename__ = "run_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("runs.id"), index=True)
    agent_name: Mapped[str] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[Any] = mapped_column(JSON, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    run: Mapped["Run"] = relationship("Run", back_populates="events")


class BrowserSessionRecord(Base):
    __tablename__ = "browser_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("runs.id"), index=True)
    agent_name: Mapped[str] = mapped_column(String(64))
    live_view_url: Mapped[str] = mapped_column(Text, default="")
    debugger_url: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="running")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    run: Mapped["Run"] = relationship("Run", back_populates="browser_sessions")


class ScreenshotRecord(Base):
    __tablename__ = "screenshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("runs.id"), index=True)
    item_name: Mapped[str] = mapped_column(String(256))
    file_path: Mapped[str] = mapped_column(Text)
    file_url: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    run: Mapped["Run"] = relationship("Run", back_populates="screenshots")


class ConfigEntry(Base):
    """Key-value store for runtime mode flags."""
    __tablename__ = "config"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
