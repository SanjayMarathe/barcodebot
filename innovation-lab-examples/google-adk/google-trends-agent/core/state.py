import time
from typing import Any, Dict
from uagents import Context

_STATE_TTL = 30 * 60  # 30 minutes


def load_state(ctx: Context, sender: str) -> Dict[str, Any]:
    key = f"state:{sender}"
    state: Dict[str, Any] = ctx.storage.get(key) or {}
    # Expire stale state
    if state and state.get("expires_at", 0) < time.time():
        ctx.storage.set(key, {})
        return {}
    return state


def save_state(ctx: Context, sender: str, state: Dict[str, Any]) -> None:
    state["expires_at"] = time.time() + _STATE_TTL
    ctx.storage.set(f"state:{sender}", state)


def clear_state(ctx: Context, sender: str) -> None:
    ctx.storage.set(f"state:{sender}", {})


def extract_text(msg) -> str:
    """Extract plain text from a ChatMessage, stripping any leading @address prefix."""
    import re
    from uagents_core.contrib.protocols.chat import TextContent

    parts = []
    for item in msg.content:
        if isinstance(item, TextContent):
            parts.append(item.text)
    text = " ".join(parts).strip()
    # ASI:One/Agentverse prepends "@agentaddress " to messages — strip it
    text = re.sub(r"@agent1\w+\s*", "", text).strip()
    return text


def make_chat(text: str):
    """Build a ChatMessage with a single TextContent + EndSessionContent."""
    from datetime import datetime, timezone
    from uuid import uuid4
    from uagents_core.contrib.protocols.chat import (
        ChatMessage,
        EndSessionContent,
        TextContent,
    )

    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[
            TextContent(type="text", text=text),
            EndSessionContent(type="end-session"),
        ],
    )


def make_chat_ongoing(text: str):
    """Build a ChatMessage without ending the session (for mid-flow messages)."""
    from datetime import datetime, timezone
    from uuid import uuid4
    from uagents_core.contrib.protocols.chat import ChatMessage, TextContent

    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=text)],
    )
