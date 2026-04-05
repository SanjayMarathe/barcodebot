import asyncio
import os
import base64
import json
import subprocess
import tempfile
from pathlib import Path

import anthropic
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from twelvelabs import TwelveLabs
from twelvelabs.core.api_error import ApiError

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

# ── Clients ───────────────────────────────────────────────────────────────────

tl_client = TwelveLabs(api_key=os.environ["TWELVELABS_API_KEY"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

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

@app.post("/record-scan")
async def record_scan(req: RecordScanRequest) -> dict:
    """Upload recorded clip → TwelveLabs full analysis → Claude filters objects."""
    tl_response = await asyncio.to_thread(_upload_and_analyze, req.video_base64, TL_PROMPT)
    print(f"  TwelveLabs raw: {tl_response[:120]}…")
    objects = await asyncio.to_thread(_filter_objects_with_claude, tl_response)
    print(f"  Objects: {objects}")
    return {"objects": objects}


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
