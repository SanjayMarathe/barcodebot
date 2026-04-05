import os

# ASI:One LLM
ASI1_API_KEY = os.getenv("ASI1_API_KEY")
if not ASI1_API_KEY:
    raise RuntimeError("Missing ASI1_API_KEY")

# Google Cloud / BigQuery
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
if not GOOGLE_CLOUD_PROJECT:
    raise RuntimeError("Missing GOOGLE_CLOUD_PROJECT")

GOOGLE_APPLICATION_CREDENTIALS = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS"
)  # path to service account JSON

# Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
if not (STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY):
    raise RuntimeError("Missing STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY")

STRIPE_AMOUNT_CENTS = int(os.getenv("STRIPE_AMOUNT_CENTS", "100"))  # $1.00
STRIPE_CURRENCY = (os.getenv("STRIPE_CURRENCY", "usd") or "usd").strip().lower()
STRIPE_PRODUCT_NAME = os.getenv("STRIPE_PRODUCT_NAME", "Google Trends Analysis")
STRIPE_SUCCESS_URL = os.getenv(
    "STRIPE_SUCCESS_URL", "https://agentverse.ai/payment-success"
).strip()
STRIPE_CHECKOUT_EXPIRES_SECONDS = int(
    os.getenv("STRIPE_CHECKOUT_EXPIRES_SECONDS", "1800")
)

# Agent
AGENT_SEED = os.getenv("AGENT_SEED", "google-trends-agent-seed")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8015"))
