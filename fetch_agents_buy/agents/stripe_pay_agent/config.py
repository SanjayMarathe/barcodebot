import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=True)
except ImportError:
    pass

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")

STRIPE_AMOUNT_CENTS = int(os.getenv("STRIPE_AMOUNT_CENTS", "100"))   # $1.00
STRIPE_CURRENCY = "usd"
STRIPE_PRODUCT_NAME = "BarcodeBot Cart Purchase"
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "https://agentverse.ai/payment-success")

AGENT_SEED = os.getenv("STRIPE_PAY_AGENT_SEED", "stripe-pay-agent-barcode-bot-2026")
AGENT_PORT = int(os.getenv("STRIPE_PAY_AGENT_PORT", "8012"))
