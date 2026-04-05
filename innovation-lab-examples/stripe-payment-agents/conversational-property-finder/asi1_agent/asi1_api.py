"""
Call ASI:One chat completions API to delegate actions (e.g. create Google Sheet)
so we can use the platform's built-in capabilities when the user asks our agent.
Requires ASI1_API_KEY or ASI_ONE_API_KEY in .env.
"""

from __future__ import annotations

import os
import re

try:
    import requests  # type: ignore[import-untyped]
except ImportError:
    requests = None

_ASI1_CHAT_URL = "https://api.asi1.ai/v1/chat/completions"
_SPREADSHEET_URL_RE = re.compile(
    r"https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9_-]+(?:\?[^\s\)\]\"]*)?"
)


def _get_api_key() -> str | None:
    return os.getenv("ASI1_API_KEY") or os.getenv("ASI_ONE_API_KEY")


def _escape_csv_cell(val: str) -> str:
    s = str(val).replace('"', '""')
    if "\n" in s or "," in s or '"' in s:
        return f'"{s}"'
    return s


def create_sheet_with_listings(
    title: str,
    headers: list[str],
    rows: list[list],
) -> str | None:
    """
    Ask ASI:One to create a Google Sheet with the given title and table (headers + rows).
    Sends the data as CSV in the message and parses the response for a spreadsheet URL.
    Returns the URL if found, else None.
    """
    if not _get_api_key() or not requests:
        return None
    # Build CSV: header line + data lines
    header_line = ",".join(_escape_csv_cell(h) for h in headers)
    data_lines = [
        ",".join(_escape_csv_cell(str(c)) for c in row)
        for row in rows[:100]  # cap so prompt doesn't explode
    ]
    csv_block = "\n".join([header_line] + data_lines)
    message = (
        f'Create a new Google Sheet with this data. Use exactly this sheet title: "{title}". '
        "First row is the header. Share the sheet so anyone with the link can view. "
        "Reply with only the shareable Google Sheets URL (the docs.google.com link), nothing else.\n\n"
        f"{csv_block}"
    )
    content = chat(message)
    if not content:
        return None
    match = _SPREADSHEET_URL_RE.search(content)
    if match:
        return match.group(0).rstrip("?\"')]")
    return None


def chat(user_message: str) -> str | None:
    """
    Send the user message to ASI:One chat completions and return the assistant's
    reply content. Returns None if no API key, requests missing, or call fails.
    """
    if not requests:
        return None
    api_key = _get_api_key()
    if not api_key:
        return None
    try:
        r = requests.post(
            _ASI1_CHAT_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": "asi1",
                "messages": [{"role": "user", "content": user_message}],
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        choices = data.get("choices") or []
        if not choices:
            return None
        msg = choices[0].get("message") or {}
        content = msg.get("content")
        return (content or "").strip() or None
    except Exception:
        return None
