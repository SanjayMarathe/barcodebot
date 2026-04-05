# Unified Movie Agent

**One agent, full pipeline.** Takes a single text prompt and produces a fully finished 8-scene cinematic short film — with AI-generated video, narration, music, opening titles, and closing credits.

---

## Architecture

```
User (Agentverse chat / ASI:One)
  │
  ▼
main_stripe.py ─── uAgent with chat protocol + payment protocol (Stripe)
  │
  ├─ stripe_payments.py        Stripe embedded checkout + verification
  ├─ payment_proto.py          Payment protocol wrapper (seller role)
  │
  ▼  (after payment verified)
pipeline/orchestrator.py ─── async orchestration
  │
  ├─ pipeline/safety.py        Gemini Flash content safety check
  ├─ pipeline/creative.py      Gemini Flash 8-scene story planning
  ├─ pipeline/chargen.py       Auto-generate character reference images
  │
  ├─ (8 scenes in parallel, 5 API keys)
  │   ├─ pipeline/video.py     Veo 3.1 video generation
  │   ├─ pipeline/tts.py       Gemini TTS voiceover
  │   ├─ pipeline/music.py     Lyria RealTime music
  │   └─ pipeline/assembly.py  FFmpeg merge per scene
  │
  ├─ pipeline/video.py         Opening + Closing title videos
  └─ pipeline/stitcher.py      FFmpeg concat all scenes into final movie
```

**Two entry points:**
- `python main_stripe.py` — **Stripe-gated** (payment required before film generation)
- `python main.py` — **Free** (no payment, immediate film generation)

---

## Stripe Payment Protocol

The agent integrates the **Agent Payment Protocol** with **Stripe embedded Checkout**, enabling monetization through Agentverse and ASI:One.

### Flow
1. User sends a film prompt via chat
2. Agent creates a Stripe embedded Checkout session
3. Agent sends `RequestPayment` with Stripe session metadata
4. Agentverse UI renders the embedded Stripe checkout card
5. User pays (test card: `4242 4242 4242 4242`)
6. UI sends `CommitPayment` with the Stripe checkout session ID
7. Agent calls Stripe API to verify `payment_status == "paid"`
8. Agent sends `CompletePayment` → kicks off the film production pipeline

### Files
| File | Purpose |
|------|---------|
| `main_stripe.py` | Entry point — chat + payment protocols, checkout flow, film pipeline |
| `payment_proto.py` | Payment protocol wrapper (`role="seller"`) — handles `CommitPayment` / `RejectPayment` |
| `stripe_payments.py` | Stripe SDK — `create_embedded_checkout_session()` + `verify_checkout_session_paid()` |

### Stripe Environment Variables
```
STRIPE_SECRET_KEY=sk_test_...        # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...   # Stripe publishable key
STRIPE_AMOUNT_CENTS=500              # optional, default $5.00
STRIPE_CURRENCY=usd                  # optional, default "usd"
STRIPE_PRODUCT_NAME=AI Film Generation  # optional
```

---

## API Key Assignment (5 keys)

5 Gemini API keys distributed to avoid Veo per-key rate limits (max 2 concurrent Veo calls per key).

| Key | Env Var | Veo Scenes | Other |
|-----|---------|-----------|-------|
| 0 | `7GEMINI_API_KEY` | Scenes 0, 1 | Safety check, Creative Director, Chargen |
| 1 | `9GEMINI_API_KEY` | Scenes 2, 3 | — |
| 2 | `10GEMINI_API_KEY` | Scenes 4, 5 | — |
| 3 | `11GEMINI_API_KEY` | Scenes 6, 7 | — |
| 4 | `12GEMINI_API_KEY` | — | Opening + Closing title videos |

---

## AI Models Used

| Model | Purpose |
|-------|---------|
| **Gemini 2.5 Flash** | Story planning, safety check, character extraction |
| **Gemini 2.5 Flash Image** | Character reference image generation |
| **Veo 3.1** (`veo-3.1-generate-preview`) | Video generation (720p, 16:9, 8s per scene) |
| **Gemini TTS** (`gemini-2.5-flash-preview-tts`) | Voiceover narration |
| **Lyria** (`models/lyria-realtime-exp`) | Background music |

---

## Setup

```bash
# 1. Create/activate virtualenv
python -m venv venv && source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install FFmpeg (required for video assembly)
brew install ffmpeg  # macOS

# 4. Configure .env
#    Required (Gemini + GCS):
#      7GEMINI_API_KEY=...
#      9GEMINI_API_KEY=...
#      10GEMINI_API_KEY=...
#      11GEMINI_API_KEY=...
#      12GEMINI_API_KEY=...
#      GCS_BUCKET_NAME=...
#      GOOGLE_CLOUD_PROJECT=...
#      GCS_CREDENTIALS_BASE64=...
#
#    Required (Stripe — only for main_stripe.py):
#      STRIPE_SECRET_KEY=sk_test_...
#      STRIPE_PUBLISHABLE_KEY=pk_test_...

# 5. Run
python main_stripe.py   # with Stripe payments
# or
python main.py          # without payments (free)
```

---

## Running & Registering on Agentverse

### Step 1: Start the Agent

```bash
python main_stripe.py
```

On startup you'll see:
```
🎬 Unified Movie Agent (Stripe-gated)
📍 Address: agent1q...
🎞️  8 scenes | 💳 Stripe payment: $5.00 USD
...
Agent inspector available at https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8002&address=agent1q...
```

### Step 2: Register on Agentverse via Mailbox

1. Open the **Agent Inspector link** from the terminal output in your browser
2. This connects your locally running agent to Agentverse via a **mailbox** — so it can receive messages from the internet without exposing your local machine
3. The inspector page will show your agent's address and protocols (AgentChatProtocol + AgentPaymentProtocol)
4. Click **"Create Mailbox"** if prompted — this registers your agent on Agentverse

### Step 3: Add an Agent README on Agentverse

Once registered, go to your agent's page on [Agentverse](https://agentverse.ai) and add a description. This helps ASI:One and other users discover your agent. Example:

> **AI Film Studio Agent**
>
> Send a text prompt and receive a fully produced 8-scene cinematic short film — with AI-generated video (Veo 3.1), voiceover narration (Gemini TTS), background music (Lyria), opening titles, and closing credits.
>
> Payment: $5.00 via Stripe embedded checkout.
>
> Example prompt: "A lonely lighthouse keeper on a frozen planet discovers that the northern lights are actually messages from a civilization that vanished a thousand years ago"
>
> Delivery time: ~90 seconds.

### Step 4: Test the Agent

You can interact with your agent in two ways:

1. **By agent address** — paste the agent address (e.g. `agent1q...`) into the Agentverse chat or ASI:One
2. **By agent handle** — if you set a handle on Agentverse (e.g. `@film-studio`), you can use that instead

Send a film prompt → complete the Stripe checkout → receive your generated film.

> **Tip:** Keep the terminal running — the agent must be alive locally for the mailbox to relay messages. If you stop the agent, messages will queue in the mailbox and be delivered when you restart.

---

## How It Works

1. User sends a prompt via Agentverse chat (or ASI:One discovers the agent automatically)
2. **Stripe payment** — embedded checkout, verified agent-to-agent *(main_stripe.py only)*
3. **Safety check** — Gemini Flash evaluates the prompt for content policy
4. **Creative Director** — Gemini Flash plans 8-scene story arc with title, logline, and per-scene briefs (visual prompt, voiceover script, music direction)
5. **Character generation** — auto-extracts up to 3 characters from the story plan and generates reference portrait images using Gemini Flash Image for visual consistency across scenes
6. **All 8 scenes + opening/closing run in parallel:**
   - Video (Veo 3.1) + TTS (Gemini) + Music (Lyria) per scene — all concurrent
   - When all 3 are ready → FFmpeg assembly per scene
   - Opening + Closing title videos generate in parallel with scenes
7. **Story Stitcher** — FFmpeg concatenates opening + 8 scenes + closing into final movie
8. Final movie URL + per-scene links sent to user

**Expected time: ~90 seconds to 2 minutes.**

---

## Key Engineering Decisions

- **Character consistency** — Veo reference images don't support description fields. The model matches references to characters purely by visual-textual matching. So the creative planner writes detailed physical descriptions ("a small copper-plated robot with blue LED eyes") instead of character names in all visual prompts.

- **Black video detection** — Veo occasionally returns a "successful" response that's actually a blank black video. Detected by file size: real 8s 720p videos are 2-15 MB; black videos are under 200 KB. Auto-retries up to 2× on detection.

- **API key distribution** — 10 concurrent video calls spread across 5 separate API keys to avoid per-key quota exhaustion.


---

## Retry & Failure Handling

- Each pipeline step retries up to **2×** with exponential backoff
- Black video detection triggers automatic retry (silent, no user notification)
- If any scene fails after all retries → partial result returned with error message
- Multi-user queue: one film at a time, others queued with position updates

---

## File Structure

```
unified-movie-agent/
├── main.py                  # Entry point (free, no payment)
├── main_stripe.py           # Entry point (Stripe payment required)
├── config.py                # API keys, model names, constants
├── models.py                # Dataclasses (StoryPlan, SceneResult, FilmResult)
├── payment_proto.py         # Payment protocol wrapper (seller role)
├── stripe_payments.py       # Stripe embedded checkout + verification
├── requirements.txt         # Python dependencies
├── pipeline/
│   ├── orchestrator.py      # Async orchestration (asyncio.gather)
│   ├── safety.py            # Content safety check
│   ├── creative.py          # 8-scene story planning
│   ├── chargen.py           # Character reference image generation
│   ├── video.py             # Veo 3.1 video generation
│   ├── tts.py               # Gemini TTS voiceover
│   ├── music.py             # Lyria background music
│   ├── assembly.py          # FFmpeg merge per scene
│   └── stitcher.py          # FFmpeg concat final movie
└── utils/
    ├── gcs.py               # Google Cloud Storage upload
    └── retry.py             # Generic async retry wrapper
```

---

## ASI:One Discovery

This agent is registered on **Agentverse** with `publish_agent_details=True` and publishes both the **AgentChatProtocol** and **AgentPaymentProtocol** manifests. This means:

- **ASI:One** (asi1.ai) can dynamically discover this agent when a user asks for film generation
- ASI:One's planner searches Agentverse, finds this agent, triggers the payment flow, and delivers the result — all automatically
- The user never needs to know this agent exists — ASI:One handles discovery and orchestration

---


