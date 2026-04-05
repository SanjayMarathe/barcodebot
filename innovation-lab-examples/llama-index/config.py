import os

import qdrant_client
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI as LlamaOpenAI
from uagents import Agent, Protocol
from uagents_core.contrib.protocols.chat import chat_protocol_spec
from uagents_core.contrib.protocols.payment import payment_protocol_spec
from dotenv import load_dotenv

load_dotenv()

# ── Required env vars ─────────────────────────────────────────────────
QDRANT_URL = os.environ["QDRANT_URL"]
QDRANT_API_KEY = os.environ["QDRANT_API_KEY"]
AGENT_SEED = os.environ["AGENT_SEED"]

# ── RAG tuning ────────────────────────────────────────────────────────
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "512"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
SIMILARITY_TOP_K = int(os.getenv("SIMILARITY_TOP_K", "5"))
CHAT_MEMORY_TOKEN_LIMIT = int(os.getenv("CHAT_MEMORY_TOKEN_LIMIT", "3900"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# ── Stripe payment ────────────────────────────────────────────────────
STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
STRIPE_PUBLISHABLE_KEY = os.environ["STRIPE_PUBLISHABLE_KEY"]
STRIPE_AMOUNT_CENTS = int(os.getenv("STRIPE_AMOUNT_CENTS", "100"))
STRIPE_CURRENCY = os.getenv("STRIPE_CURRENCY", "usd")
STRIPE_PRODUCT_NAME = os.getenv("STRIPE_PRODUCT_NAME", "RAG Document Ingestion")
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "https://agentverse.ai")

# ── Global clients ────────────────────────────────────────────────────
qclient = qdrant_client.QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
async_qclient = qdrant_client.AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
embed_model = OpenAIEmbedding(model=EMBED_MODEL)
llm = LlamaOpenAI(model=LLM_MODEL)

# ── Agent + Protocols ─────────────────────────────────────────────────
agent = Agent(
    name="fetch_rag",
    seed=AGENT_SEED,
    port=int(os.getenv("AGENT_PORT", "8000")),
    mailbox=True,
    network="testnet",
)

chat_proto = Protocol(spec=chat_protocol_spec)
payment_proto = Protocol(spec=payment_protocol_spec, role="seller")
