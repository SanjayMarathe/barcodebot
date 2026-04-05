# AG2 Payment Approval Agent

![ag2](https://img.shields.io/badge/ag2-00ADD8) ![uagents](https://img.shields.io/badge/uagents-4A90E2) ![a2a](https://img.shields.io/badge/a2a-000000) ![innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

A two-agent payment approval workflow using [AG2](https://github.com/ag2ai/ag2) (formerly AutoGen)
integrated with the Fetch.ai uAgents ecosystem via the A2A protocol and payment protocol.

## Architecture

```
Buyer agent / ASI:One / other uAgent
         ↓
SingleA2AAdapter (port 8009) → Agentverse
         ↓
PaymentApprovalExecutor (A2A AgentExecutor)
         ↓
AG2 Two-Agent Chat
├── researcher        — investigates recipient, produces risk assessment
└── payment_executor  — formats assessment, returns APPROVED/REJECTED verdict
         ↓
Payment Protocol (via adapter)
├── APPROVED → buyer receives RequestPayment → CommitPayment / RejectPayment
└── REJECTED → buyer receives assessment text explaining why
```

## Prerequisites

- **Python 3.10–3.13** (uagents depends on Pydantic v1, which is incompatible with Python 3.14+)

## Quick Start

```bash
cd ag2-agents/payment-approval
pip install -r requirements.txt
cp .env.example .env  # add OPENAI_API_KEY
python payment_main.py
```

## AG2 Features Demonstrated

- **Two-agent `initiate_chat`** — researcher hands off to executor via the natural
  conversation flow; the shared message history carries the assessment
- **`A2A AgentExecutor`** — same integration pattern used by other examples in this repo
- **Payment protocol integration** — `SingleA2AAdapter` bridges the assessment result
  into Fetch.ai's `AgentPaymentProtocol`, enabling buyer agents to commit or reject
  payments via standard protocol messages
