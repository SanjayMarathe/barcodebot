# Fetch RAG Agent — LlamaIndex + Qdrant

A Fetch.ai uAgent that turns any document into a queryable knowledge base. Send a URL, pay via Stripe, and ask questions — powered by LlamaIndex's ReAct agent and Qdrant vector search.

## How It Works

```
  User sends document URL
         │
         ▼
  Agent requests Stripe payment
         │
         ▼
  Download ─► Chunk ─► Embed ─► Store in Qdrant
         │
         ▼
  User asks questions
         │
         ▼
  ReAct agent reasons ─► retrieves chunks ─► answers with citations
```

1. **Ingest** — Send a document URL (PDF, HTML, etc.). After Stripe payment, the agent downloads it, splits into chunks (512 tokens, 50 overlap), embeds with `text-embedding-3-small`, and stores in a per-user Qdrant collection.

2. **Query** — Ask a question. The LlamaIndex ReAct agent decides when to search the vector store, retrieves the top-k relevant chunks, and synthesizes an answer with `gpt-4o-mini`. Responses include source citations with page numbers and confidence scores.

3. **Persist** — Vectors live in Qdrant Cloud across restarts. Sending a new URL wipes the old collection and starts fresh.

## Project Structure

```
llama-index/
├── main.py            Entry point — wires agent, protocols, startup
├── config.py          Env vars, Qdrant/LlamaIndex clients, agent setup
├── rag.py             Core RAG: download, ingest, ReAct agent, citations
├── payment.py         Stripe payment request logic
├── stripe_payments.py Stripe embedded checkout + verification
├── handlers.py        Chat + payment protocol message handlers
├── requirements.txt   Dependencies
├── .env.example       Environment variable template
└── .gitignore
```

### What each file does

| File | Role |
|------|------|
| **`config.py`** | Loads env vars, creates Qdrant clients (sync + async), OpenAI embedding model, LLM, and the Fetch.ai agent with chat/payment protocols |
| **`rag.py`** | Downloads documents, runs the LlamaIndex `IngestionPipeline` (SentenceSplitter → OpenAI embeddings → Qdrant), builds a `ReActAgent` with a `QueryEngineTool` over the vector store, and formats citations |
| **`payment.py`** | Builds and sends Stripe payment requests to users via the Agentverse payment protocol |
| **`stripe_payments.py`** | Creates embedded Stripe Checkout Sessions and verifies payment status |
| **`handlers.py`** | Message routing: URLs trigger the payment→ingest flow, plain text triggers the ReAct query agent, payment confirmations trigger Stripe verification |
| **`main.py`** | Registers protocols, sets the wallet, defines the startup event, and calls `agent.run()` |

## Setup

### Prerequisites

- Python 3.12+
- [Qdrant Cloud](https://cloud.qdrant.io/) cluster
- [OpenAI API key](https://platform.openai.com/api-keys)
- [Stripe API keys](https://dashboard.stripe.com/test/apikeys) (test mode)

### Install

```bash
cd llama-index
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Configure

Copy the template and fill in your keys:

```bash
cp .env.example .env
```

```env
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-api-key
OPENAI_API_KEY=sk-your-openai-key
AGENT_SEED=your-unique-agent-seed
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Optional tuning (all have defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `CHUNK_SIZE` | `512` | Tokens per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |
| `SIMILARITY_TOP_K` | `5` | Chunks retrieved per query |
| `CHAT_MEMORY_TOKEN_LIMIT` | `3900` | Chat history token budget |
| `EMBED_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `LLM_MODEL` | `gpt-4o-mini` | OpenAI LLM for reasoning |
| `STRIPE_AMOUNT_CENTS` | `100` | Price in cents per document ingestion |
| `STRIPE_CURRENCY` | `usd` | Stripe currency code |
| `STRIPE_PRODUCT_NAME` | `RAG Document Ingestion` | Product name shown at checkout |
| `STRIPE_SUCCESS_URL` | `https://agentverse.ai` | Redirect URL after payment |
| `AGENT_PORT` | `8000` | Local HTTP port |

### Run

```bash
python main.py
```

On first run, visit the agent inspector URL in the logs to create a mailbox on [Agentverse](https://agentverse.ai). Then restart.

## Usage

Interact with the agent through the Agentverse chat UI.

**Ingest a document:**
```
https://example.com/report.pdf
```
> Agent requests Stripe payment. After checkout, the document is downloaded, chunked, embedded, and stored.

**Ask questions:**
```
What are the key risk factors?
```
> Agent searches the vector store and returns an answer with cited sources.

### Example Response

```
The book describes human-in-the-loop as a design approach that
integrates human checkpoints into the agent's decision-making process.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Retrieved from 5 source(s)

[1] Page 22 — Medium (52%)
> HITL is a design approach for building agents to incorporate
  human checkpoints.

[2] Page 21 — Medium (51%)
> People have preferences about which decisions should ultimately
  be made by humans.

[3] Page 23 — Medium (48%)
> Healthcare: An AI model might suggest a diagnosis or flag abnormal
  lab results but a trained human clinician makes the final call.

+2 more source(s) available
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent framework | [Fetch.ai uAgents](https://docs.fetch.ai/guides/agents/getting-started/whats-an-agent) |
| RAG pipeline | [LlamaIndex](https://docs.llamaindex.ai/) (IngestionPipeline + ReActAgent) |
| Vector store | [Qdrant Cloud](https://qdrant.tech/) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| Payments | [Stripe](https://stripe.com/) embedded checkout |
| Messaging | Agentverse mailbox + chat/payment protocols |
