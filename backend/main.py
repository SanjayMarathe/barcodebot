import asyncio
import os
import base64
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional

import anthropic
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from twelvelabs import TwelveLabs
from twelvelabs.core.api_error import ApiError

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

# ── Clients ───────────────────────────────────────────────────────────────────

tl_client = TwelveLabs(api_key=os.environ["TWELVELABS_API_KEY"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
FETCH_AGENTS_URL = os.getenv("FETCH_AGENTS_URL", "http://localhost:8000")

INDEX_ID = os.getenv("TWELVELABS_INDEX_ID", "").strip()
if not INDEX_ID:
    idx = tl_client.indexes.create(
        index_name="webcam-live",
        models=[{"model_name": "pegasus1.2", "model_options": ["visual", "audio"]}],
    )
    INDEX_ID = idx.id
    print(f"✓ Created index: {INDEX_ID}  — add TWELVELABS_INDEX_ID={INDEX_ID} to .env")
else:
    print(f"✓ Using index: {INDEX_ID}")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, ApiError) and exc.status_code == 429:
        retry_after = exc.headers.get("retry-after", "3600")
        return JSONResponse(
            status_code=429,
            content={"error": "rate_limited", "retry_after": int(retry_after)},
            headers={"Access-Control-Allow-Origin": "*"},
        )
    print(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

# ── Request models ────────────────────────────────────────────────────────────

class RecordScanRequest(BaseModel):
    video_base64: str  # base64-encoded WebM from MediaRecorder

class AskRequest(BaseModel):
    question: str

class CreateCheckoutRequest(BaseModel):
    amount_cents: int

class TriggerBuyRequest(BaseModel):
    objects: List[str]
    prices: Dict[str, str]  # { object_name: price_string }
    stripe_session_id: str
    total_budget: float

class GlobeEnrichRequest(BaseModel):
    objects: List[str]

# ── Helpers ───────────────────────────────────────────────────────────────────

TL_PROMPT = (
    "Watch this video carefully and list every distinct physical object you can see. "
    "Include brand names, colors, materials, and types where visible. "
    "Return a plain numbered list, one object per line. Be specific."
)

CLAUDE_SYSTEM = (
    "You extract physical objects from a scene description. "
    "Return ONLY a JSON array of strings. Each string is one specific physical object "
    "(e.g. 'iPhone 15 Pro in black case', 'clear plastic water bottle'). "
    "Exclude: people, body parts, skin, hair, faces, rooms, walls, floors, "
    "ceilings, lighting, shadows, backgrounds, furniture the person is sitting on, "
    "and any abstract concepts. If nothing qualifies, return []."
)

def _to_mp4(input_path: Path) -> Path:
    """Convert any video to a TwelveLabs-compatible MP4 (min 5s, h264). Returns new path."""
    mp4_path = Path(tempfile.mktemp(suffix=".mp4"))
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(input_path),
            # pad to at least 5 seconds by freezing last frame
            "-vf", "tpad=stop_mode=clone:stop_duration=5",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(mp4_path),
        ],
        check=True,
        capture_output=True,
    )
    return mp4_path


last_video_id: str | None = None

# ── Globe state (shared between mobile scan and web poller) ───────────────────

_STATE_FILE = Path(__file__).parent / ".detected_objects.json"

def _load_saved_state() -> dict:
    try:
        data = json.loads(_STATE_FILE.read_text())
        if isinstance(data, list):
            return {"objects": data, "last_updated": None}
        return data
    except Exception:
        return {"objects": [], "last_updated": None}

def _save_state(objects: list, last_updated):
    try:
        _STATE_FILE.write_text(json.dumps({"objects": objects, "last_updated": last_updated}))
    except Exception:
        pass

_saved = _load_saved_state()
_globe_state: dict = {
    "objects": _saved["objects"],
    "pins": [],
    "enriched_queries": {},
    "last_updated": _saved["last_updated"],
    "enriching": False,
}

_cart_state: dict = {"items": []}

_ranker_thoughts: list = []  # append-only log, polled by web app

_run_events: dict = {}   # run_id → list of event dicts (agent activity)
_active_run_id: str = "" # most recent run_id from trigger-buy


def _index_and_analyze(mp4_path: Path, prompt: str) -> str:
    """Upload an MP4 to TwelveLabs, index it, analyze with prompt. Blocking."""
    global last_video_id
    with open(mp4_path, "rb") as f:
        task = tl_client.tasks.create(index_id=INDEX_ID, video_file=f)
    print(f"  [{task.id[:8]}] indexing…")
    completed = tl_client.tasks.wait_for_done(task_id=task.id, sleep_interval=3)
    if completed.status != "ready":
        raise RuntimeError(f"Indexing failed: {completed.status}")
    last_video_id = completed.video_id
    print(f"  [{task.id[:8]}] analyzing… (video_id={last_video_id})")
    result = tl_client.analyze(video_id=last_video_id, prompt=prompt)
    return result.data


def _upload_and_analyze(video_base64: str, prompt: str) -> str:
    """Decode base64 video, convert to MP4, upload to TwelveLabs. Blocking."""
    raw = video_base64.split(",", 1)[-1]
    webm_path = Path(tempfile.mktemp(suffix=".webm"))
    mp4_path = None
    try:
        webm_path.write_bytes(base64.b64decode(raw))
        mp4_path = _to_mp4(webm_path)
        print(f"  converted to mp4: {mp4_path.stat().st_size // 1024}KB")
        return _index_and_analyze(mp4_path, prompt)
    finally:
        webm_path.unlink(missing_ok=True)
        if mp4_path:
            mp4_path.unlink(missing_ok=True)


def _filter_objects_with_claude(tl_response: str) -> list[str]:
    """Pass TwelveLabs response through Claude to extract physical objects only."""
    msg = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        system=CLAUDE_SYSTEM,
        messages=[{"role": "user", "content": tl_response}],
    )
    text = msg.content[0].text.strip()
    # strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


# ── Endpoints ─────────────────────────────────────────────────────────────────

async def _background_enrich(objects: list[str]):
    """Run WorldMonitor enrichment in the background and update globe state."""
    global _globe_state
    _globe_state["enriching"] = True
    try:
        result = await _enrich_with_worldmonitor(objects)
        _globe_state["pins"] = result.get("pins", [])
        _globe_state["enriched_queries"] = result.get("enriched_queries", {})
    except Exception as e:
        print(f"  background enrich error: {e}")
    finally:
        _globe_state["enriching"] = False


@app.post("/record-scan")
async def record_scan(req: RecordScanRequest) -> dict:
    """Upload recorded clip → TwelveLabs full analysis → Claude filters objects."""
    global _globe_state
    tl_response = await asyncio.to_thread(_upload_and_analyze, req.video_base64, TL_PROMPT)
    print(f"  TwelveLabs raw: {tl_response[:120]}…")
    objects = await asyncio.to_thread(_filter_objects_with_claude, tl_response)
    print(f"  Objects: {objects}")

    # Update globe state so web app can poll it
    import time as _time
    ts = _time.time()
    _globe_state["objects"] = objects
    _globe_state["last_updated"] = ts
    _globe_state["pins"] = []  # will be filled by background enrichment
    _save_state(objects, ts)

    # Fire-and-forget WorldMonitor enrichment
    asyncio.create_task(_background_enrich(objects))

    return {"objects": objects}


@app.get("/globe-state")
async def globe_state() -> dict:
    """Web app polls this to get latest mobile detections + globe pins."""
    return _globe_state


@app.post("/globe-state/refresh")
async def globe_state_refresh() -> dict:
    """Re-run WorldMonitor enrichment on current objects (useful after server restart)."""
    if not _globe_state.get("objects"):
        return {"status": "no objects to enrich"}
    asyncio.create_task(_background_enrich(_globe_state["objects"]))
    return {"status": "enrichment started", "objects": _globe_state["objects"]}


@app.post("/reset")
async def reset() -> dict:
    """Clear all cached video + detection state."""
    global last_video_id, _globe_state, _active_run_id
    last_video_id = None
    _save_state([], None)
    _globe_state.update({
        "objects": [], "pins": [], "enriched_queries": {},
        "last_updated": None, "enriching": False,
    })
    _cart_state["items"] = []
    _ranker_thoughts.clear()
    _run_events.clear()
    _active_run_id = ""
    return {"status": "cleared"}


# ── Cart endpoints ─────────────────────────────────────────────────────────────

class CartAddRequest(BaseModel):
    item_name: str
    product: dict


@app.post("/internal/cart-add")
async def cart_add(req: CartAddRequest) -> dict:
    """Ranker agent POSTs here when it picks a winner for a cart item."""
    import time as _time
    item = {
        "item_name": req.item_name,
        "title": req.product.get("title", ""),
        "price": req.product.get("price", 0),
        "url": req.product.get("url", ""),
        "thumbnail": req.product.get("thumbnail", ""),
        "rating": req.product.get("rating"),
        "asin": req.product.get("asin", ""),
        "added_at": _time.time(),
    }
    # Deduplicate by item_name (replace if already present)
    _cart_state["items"] = [i for i in _cart_state["items"] if i["item_name"] != req.item_name]
    _cart_state["items"].append(item)
    return {"ok": True}


@app.get("/cart-state")
async def get_cart_state() -> dict:
    return _cart_state


@app.post("/cart/clear")
async def clear_cart() -> dict:
    _cart_state["items"] = []
    return {"ok": True}


@app.delete("/cart/item/{item_name}")
async def remove_cart_item(item_name: str) -> dict:
    _cart_state["items"] = [i for i in _cart_state["items"] if i["item_name"] != item_name]
    return {"ok": True}


# ── Ranker thought streaming ───────────────────────────────────────────────────

@app.post("/internal/ranker-thought")
async def ranker_thought(req: dict) -> dict:
    """Ranker agent POSTs intermediate thoughts here; web app polls /ranker-thoughts."""
    import time as _time
    _ranker_thoughts.append({"text": req.get("text", ""), "ts": _time.time()})
    if len(_ranker_thoughts) > 100:
        _ranker_thoughts.pop(0)
    return {"ok": True}


@app.get("/ranker-thoughts")
async def get_ranker_thoughts(since: int = 0) -> dict:
    """Web app polls this with since=<last total> to get new thoughts only."""
    return {"thoughts": _ranker_thoughts[since:], "total": len(_ranker_thoughts)}


@app.post("/ask")
async def ask(req: AskRequest) -> dict:
    """Query the last recorded video with a follow-up question."""
    if not last_video_id:
        return {"answer": "No video has been recorded yet. Record a clip first, then ask questions about it."}
    def _query():
        result = tl_client.analyze(video_id=last_video_id, prompt=req.question)
        return result.data
    answer = await asyncio.to_thread(_query)
    return {"answer": answer}


_WM_BASE = "https://api.worldmonitor.app/api"

async def _enrich_with_worldmonitor(objects: List[str]) -> dict:
    """Call WorldMonitor APIs in parallel + Claude → globe pins + enriched search queries."""
    wm_endpoints = {
        "chokepoints": f"{_WM_BASE}/supply-chain/v1/get-chokepoint-status",
        "shipping":    f"{_WM_BASE}/supply-chain/v1/get-shipping-rates",
        "tariffs":     f"{_WM_BASE}/trade/v1/get-tariff-trends",
        "prices":      f"{_WM_BASE}/economic/v1/list-grocery-basket-prices",
    }
    wm_results: Dict[str, Any] = {}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            tasks = {
                key: client.post(url, json={}, headers={"Content-Type": "application/json"})
                for key, url in wm_endpoints.items()
            }
            for key, task in tasks.items():
                try:
                    r = await task
                    wm_results[key] = r.json() if r.status_code == 200 else {}
                except Exception:
                    wm_results[key] = {}
    except Exception:
        pass

    def _trim(d, n=600):
        s = json.dumps(d)
        return s[:n] + "…" if len(s) > n else s

    prompt = f"""You are a product intelligence analyst. WorldMonitor live data:

MARITIME CHOKEPOINTS: {_trim(wm_results.get("chokepoints", {}))}
SHIPPING RATES: {_trim(wm_results.get("shipping", {}))}
TARIFF TRENDS: {_trim(wm_results.get("tariffs", {}))}
CONSUMER BASKET PRICES (24 countries): {_trim(wm_results.get("prices", {}))}

Detected objects: {objects}

For each detected object, identify 5–7 major global manufacturers/brands/origins.
Use the WorldMonitor data to color-code supply chain conditions:
  "#22d3ee" = favorable (open chokepoints, low shipping stress, low tariffs)
  "#f59e0b" = moderate
  "#f87171" = elevated risk (blocked routes, high tariffs, supply strain)

Also provide an enriched, specific Amazon search query per object (brand + model/spec).

Return ONLY valid JSON — no markdown, no explanation:
{{
  "pins": [
    {{
      "brand": "Brand Name",
      "city": "City",
      "country": "Country",
      "lat": 0.0,
      "lng": 0.0,
      "object": "detected object name",
      "color": "#22d3ee",
      "wm_note": "one-line WorldMonitor context for this color choice"
    }}
  ],
  "enriched_queries": {{
    "object name": "specific brand model search query for Amazon"
  }}
}}"""

    def _call_claude():
        # tokens needed: ~6 objects × 6 pins × ~60 tokens/pin + overhead → use 6000
        msg = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=6000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        # strip markdown fences
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else parts[0]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        # find the JSON object boundaries in case there's trailing text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            text = text[start:end]
        result = json.loads(text)
        print(f"  globe-enrich: {len(result.get('pins', []))} pins generated")
        return result

    try:
        return await asyncio.to_thread(_call_claude)
    except Exception as e:
        print(f"globe-enrich error: {e}")
        return {"pins": [], "enriched_queries": {}}


@app.post("/globe-enrich")
async def globe_enrich(req: GlobeEnrichRequest) -> dict:
    """WorldMonitor-powered product intelligence: manufacturer pins + enriched search queries."""
    if not req.objects:
        return {"pins": [], "enriched_queries": {}}
    return await _enrich_with_worldmonitor(req.objects)


@app.get("/stripe-success", response_class=HTMLResponse)
async def stripe_success():
    return """<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 24px;background:#000;color:#fff">
<h2 style="color:#34d399">✅ Payment successful!</h2>
<p style="color:#94a3b8">Return to Kaimon to complete your purchase.</p>
</body></html>"""


@app.get("/stripe-cancel", response_class=HTMLResponse)
async def stripe_cancel():
    return """<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 24px;background:#000;color:#fff">
<h2 style="color:#f87171">Payment cancelled</h2>
<p style="color:#94a3b8">You can try again from Kaimon.</p>
</body></html>"""


@app.post("/create-checkout")
async def create_checkout(req: CreateCheckoutRequest) -> dict:
    """Create a Stripe Checkout session for loading shopping budget."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured — set STRIPE_SECRET_KEY in .env")
    if req.amount_cents < 100:
        raise HTTPException(status_code=400, detail="Minimum amount is $1.00")

    import stripe as _stripe
    _stripe.api_key = STRIPE_SECRET_KEY

    base_url = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8001")
    session = await asyncio.to_thread(
        lambda: _stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Kaimon Shopping Budget"},
                    "unit_amount": req.amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{base_url}/stripe-success",
            cancel_url=f"{base_url}/stripe-cancel",
        )
    )
    return {"checkout_url": session.url, "session_id": session.id, "amount_cents": req.amount_cents}


@app.get("/stripe-session-status/{session_id}")
async def stripe_session_status(session_id: str) -> dict:
    """Verify whether a Stripe Checkout session has been paid."""
    if not STRIPE_SECRET_KEY:
        return {"status": "paid", "amount_total": 0}  # mock mode
    import stripe as _stripe
    _stripe.api_key = STRIPE_SECRET_KEY
    session = await asyncio.to_thread(lambda: _stripe.checkout.Session.retrieve(session_id))
    return {"status": session.payment_status, "amount_total": session.amount_total}


@app.post("/trigger-buy")
async def trigger_buy(req: TriggerBuyRequest) -> dict:
    """Verify Stripe session and dispatch a shopping run to fetch_agents_buy."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    import stripe as _stripe
    _stripe.api_key = STRIPE_SECRET_KEY
    session = await asyncio.to_thread(
        lambda: _stripe.checkout.Session.retrieve(req.stripe_session_id)
    )
    if session.payment_status != "paid":
        raise HTTPException(status_code=402, detail=f"Session not paid (status={session.payment_status})")

    # Enrich with WorldMonitor intelligence → refined search queries
    try:
        enriched = await _enrich_with_worldmonitor(req.objects)
        queries = enriched.get("enriched_queries", {})
    except Exception:
        queries = {}

    # Build instruction string using WM-enriched queries
    parts = [
        f"Buy {queries.get(obj, obj)} under ${req.prices.get(obj, '50')} qty 1"
        for obj in req.objects
    ]
    instruction = ", ".join(parts)
    print(f"  WorldMonitor-enriched instruction: {instruction[:120]}")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{FETCH_AGENTS_URL}/tasks",
            json={
                "instruction": instruction,
                "total_budget": req.total_budget,
                "stripe_session_id": req.stripe_session_id,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    global _active_run_id
    _active_run_id = data["run_id"]
    return {"run_id": data["run_id"]}


@app.get("/run-status/{run_id}")
async def run_status(run_id: str) -> dict:
    """Proxy run status from fetch_agents_buy."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{FETCH_AGENTS_URL}/runs/{run_id}")
        resp.raise_for_status()
        return resp.json()


# ── Agent event capture (agents post here via FASTAPI_CALLBACK_URL) ────────────

@app.post("/internal/agent-event")
async def agent_event(req: dict) -> dict:
    """Receive events from all agents. Captured for browser session tracking."""
    global _active_run_id
    run_id = req.get("run_id", "")
    if run_id:
        if run_id not in _run_events:
            _run_events[run_id] = []
        _run_events[run_id].append(req)
        if len(_run_events[run_id]) > 200:
            _run_events[run_id].pop(0)
        # Auto-track the most recent run regardless of how it was triggered
        if req.get("event_type") == "run_started":
            _active_run_id = run_id
    return {"ok": True}


@app.get("/active-run-id")
async def get_active_run_id() -> dict:
    return {"run_id": _active_run_id}


@app.get("/run-sessions")
async def get_run_sessions(run_id: str = "") -> dict:
    """Return browser session live_view_urls extracted from session_created events."""
    target = run_id or _active_run_id
    events = _run_events.get(target, [])
    sessions: dict = {}
    for e in events:
        if e.get("event_type") == "session_created":
            agent = e.get("agent_name", "")
            payload = e.get("payload", {})
            if agent and payload.get("live_view_url"):
                sessions[agent] = {
                    "agent_name": agent,
                    "live_view_url": payload["live_view_url"],
                    "session_id": payload.get("session_id", ""),
                    "item_name": payload.get("item_name", ""),
                    "status": "running",
                }
        elif e.get("event_type") == "buy_done":
            agent = e.get("agent_name", "")
            if agent in sessions:
                payload = e.get("payload", {})
                sessions[agent]["status"] = payload.get("status", "done")
                sessions[agent]["final_price"] = payload.get("final_price", 0.0)
    return {"run_id": target, "sessions": list(sessions.values())}


@app.get("/run-agent-events")
async def get_run_agent_events(run_id: str = "", since: int = 0) -> dict:
    """Return interesting agent events for display in the web app chat."""
    target = run_id or _active_run_id
    events = _run_events.get(target, [])
    interesting_types = {
        "buy_started", "buy_done", "ranking_done", "ranking_failed",
        "session_created", "search_complete", "payment_commit_sent",
        "payment_complete", "run_started", "parsing_done", "buy_dispatched",
    }
    interesting = [e for e in events[since:] if e.get("event_type") in interesting_types]
    return {"events": interesting, "total": len(events)}
