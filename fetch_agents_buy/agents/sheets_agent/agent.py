"""
Sheets Agent — receives LogPurchase from stripe-pay-agent after payment,
appends to Google Sheets via Composio, and sends the user the link.
"""
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
    chat_protocol_spec,
)

BACKEND_URL = "http://localhost:8099"

COMPOSIO_API_KEY = os.getenv("COMPOSIO_API_KEY", "")
SPREADSHEET_ID = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "")
COMPOSIO_ENTITY_ID = os.getenv("COMPOSIO_ENTITY_ID", "default")
AGENT_SEED = os.getenv("SHEETS_AGENT_SEED", "sheets-agent-kaimon-2026")
AGENT_PORT = int(os.getenv("SHEETS_AGENT_PORT", "8013"))

# Persist auto-created spreadsheet ID between runs
_ID_FILE = Path(__file__).resolve().parent / ".spreadsheet_id"


class LogPurchase(Model):
    items: str
    total_cents: int
    transaction_id: str
    user_address: str


async def _post_event(event_type: str, payload: dict):
    """Stream an event to the web app via the backend event bus."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Fetch active run_id so the event lands in the right feed
            r = await client.get(f"{BACKEND_URL}/active-run-id")
            run_id = r.json().get("run_id", "")
            if not run_id:
                return
            await client.post(f"{BACKEND_URL}/internal/agent-event", json={
                "run_id": run_id,
                "agent_name": "sheets-agent",
                "event_type": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": payload,
            })
    except Exception:
        pass


def _execute(client, slug: str, arguments: dict) -> dict:
    client.tools.get(user_id=COMPOSIO_ENTITY_ID, tools=[slug])  # pre-fetch schema
    result = client.tools.execute(slug=slug, arguments=arguments, user_id=COMPOSIO_ENTITY_ID)
    data = result if isinstance(result, dict) else {}
    return (data.get("data") or {}).get("response_data") or data.get("data") or {}


def _get_or_create_spreadsheet(client) -> str:
    """Return spreadsheet ID from env, file cache, or create a new one."""
    if SPREADSHEET_ID:
        return SPREADSHEET_ID
    if _ID_FILE.exists():
        return _ID_FILE.read_text().strip()

    data = _execute(client, "GOOGLESHEETS_CREATE_GOOGLE_SHEET1", {"title": "Kaimon Purchase History"})
    sheet_id = data.get("spreadsheet_id", "") or data.get("spreadsheetId", "") or data.get("id", "")
    if sheet_id:
        _ID_FILE.write_text(sheet_id)
        _execute(client, "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND", {
            "spreadsheetId": sheet_id,
            "range": "Sheet1",
            "values": [["Date (UTC)", "Items", "Total", "Transaction ID"]],
            "valueInputOption": "USER_ENTERED",
        })
    return sheet_id


def _log_purchase(items: str, total_cents: int, transaction_id: str) -> str:
    from composio import Composio

    client = Composio(api_key=COMPOSIO_API_KEY)
    sheet_id = _get_or_create_spreadsheet(client)
    if not sheet_id:
        raise RuntimeError("Could not get or create Google Sheet.")

    _execute(client, "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND", {
        "spreadsheetId": sheet_id,
        "range": "Sheet1",
        "values": [[
            datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            items,
            f"${total_cents / 100:.2f}",
            transaction_id,
        ]],
        "valueInputOption": "USER_ENTERED",
    })
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"


agent = Agent(
    name="sheets-agent",
    seed=AGENT_SEED,
    port=AGENT_PORT,
    mailbox=True,
    publish_agent_details=True,
)

purchase_proto = Protocol(name="PurchaseLogProtocol", version="1.0.0")
chat_proto = Protocol(spec=chat_protocol_spec)


@chat_proto.on_message(ChatMessage)
async def _on_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id,
    ))


@chat_proto.on_message(ChatAcknowledgement)
async def _on_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


def _make_chat(text: str) -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=text)],
    )


@purchase_proto.on_message(LogPurchase)
async def handle_log(ctx: Context, sender: str, msg: LogPurchase):
    ctx.logger.info(f"[sheets-agent] Logging: {msg.items} ${msg.total_cents / 100:.2f}")
    sheet_url = ""
    try:
        sheet_url = await asyncio.to_thread(
            _log_purchase, msg.items, msg.total_cents, msg.transaction_id
        )
        ctx.logger.info(f"[sheets-agent] Logged → {sheet_url}")
    except Exception as e:
        ctx.logger.error(f"[sheets-agent] Composio error: {e}")

    # Always stream to web app — even if Composio failed
    if sheet_url:
        await _post_event("sheets_logged", {
            "sheet_url": sheet_url,
            "items": msg.items,
            "total": f"${msg.total_cents / 100:.2f}",
        })
        await ctx.send(msg.user_address, _make_chat(
            f"Your purchase has been logged!\n\nView your order history:\n{sheet_url}"
        ))
    else:
        await _post_event("sheets_logged", {
            "sheet_url": "https://docs.google.com/spreadsheets/",
            "items": msg.items,
            "total": f"${msg.total_cents / 100:.2f}",
            "error": "Could not create sheet — open Google Sheets manually",
        })
        await ctx.send(msg.user_address, _make_chat(
            f"Purchase complete! Could not log to Google Sheets automatically."
        ))


agent.include(purchase_proto, publish_manifest=True)
agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
