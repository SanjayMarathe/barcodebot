"""
Server-Sent Events manager.

Each run_id gets its own list of asyncio.Queue subscribers.
Agents POST events to /internal/agent-event → publish() → all subscribers receive.
Frontend GET /runs/{id}/events → subscribe() → yields SSE data.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncGenerator, Dict, List

logger = logging.getLogger(__name__)


class SSEManager:
    def __init__(self):
        # run_id -> list of Queue objects (one per active SSE connection)
        self._queues: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, run_id: str) -> asyncio.Queue:
        """Register a new SSE subscriber for a run. Returns the queue."""
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        if run_id not in self._queues:
            self._queues[run_id] = []
        self._queues[run_id].append(q)
        logger.debug(f"SSE subscriber added for run {run_id} (total: {len(self._queues[run_id])})")
        return q

    def unsubscribe(self, run_id: str, queue: asyncio.Queue):
        """Remove a subscriber queue when the SSE connection closes."""
        if run_id in self._queues:
            try:
                self._queues[run_id].remove(queue)
            except ValueError:
                pass
            if not self._queues[run_id]:
                del self._queues[run_id]

    async def publish(self, run_id: str, event_dict: dict):
        """Fan out an event to all subscribers of a run."""
        if run_id not in self._queues:
            return
        dead = []
        for q in self._queues[run_id]:
            try:
                q.put_nowait(event_dict)
            except asyncio.QueueFull:
                logger.warning(f"SSE queue full for run {run_id}, dropping event")
                dead.append(q)
        for q in dead:
            self.unsubscribe(run_id, q)

    async def stream(self, run_id: str, request) -> AsyncGenerator[dict, None]:
        """
        Async generator for sse_starlette. Yields dicts with 'data' key.
        Sends pings every 25s to keep the connection alive.
        """
        queue = self.subscribe(run_id)
        try:
            while True:
                # Check if client disconnected
                if hasattr(request, "is_disconnected") and await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield {"data": json.dumps(event, default=str)}
                except asyncio.TimeoutError:
                    # Send a keep-alive ping
                    yield {"data": json.dumps({"type": "ping", "ts": datetime.utcnow().isoformat()})}
        except asyncio.CancelledError:
            pass
        finally:
            self.unsubscribe(run_id, queue)


# Global singleton
sse_manager = SSEManager()
