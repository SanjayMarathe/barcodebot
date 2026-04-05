.PHONY: install install-api install-agents install-web \
        run run-api run-agents run-web \
        health reset-db clean help

# ============================================================
# DiamondHacks 2026 — Makefile
# ============================================================

API_DIR       := apps/api
WEB_DIR       := apps/web
AGENTS_DIR    := agents
CONDA_ENV     := /Users/aidanchen/projects/sqf_strategy/CMCStudentQuantitativeFund/ENTER/envs/diamond_hacks
PYTHON        := $(CONDA_ENV)/bin/python
UV            := $(shell command -v uv 2>/dev/null || echo "pip install")
NODE          := node
NPM           := npm

help:
	@echo "DiamondHacks Shopping Agent — Available commands:"
	@echo ""
	@echo "  make install       Install all dependencies (Python + Node)"
	@echo "  make run           Start all services (requires tmux)"
	@echo "  make run-api       Start FastAPI server only"
	@echo "  make run-agents    Start all 9 agents (Bureau)"
	@echo "  make run-web       Start Next.js frontend only"
	@echo "  make health        Check system health"
	@echo "  make reset-db      Delete SQLite database (fresh start)"
	@echo "  make clean         Remove generated files"
	@echo ""
	@echo "Quick start: cp .env.example .env && make install && make run"

# ----------------------------------------------------------
# Install
# ----------------------------------------------------------

install: install-api install-agents install-web
	@echo "All dependencies installed."

install-api:
	@echo "Installing FastAPI dependencies..."
	cd $(API_DIR) && pip install -r ../../requirements-api.txt

install-agents:
	@echo "Installing agent dependencies..."
	pip install -r $(AGENTS_DIR)/requirements.txt
	playwright install chromium

install-web:
	@echo "Installing Next.js dependencies..."
	cd $(WEB_DIR) && $(NPM) install

# ----------------------------------------------------------
# Run
# ----------------------------------------------------------

run:
	@command -v tmux >/dev/null 2>&1 || (echo "tmux not found. Run services manually:" && echo "  Terminal 1: make run-api" && echo "  Terminal 2: make run-agents" && echo "  Terminal 3: make run-web" && exit 1)
	tmux new-session -d -s diamond_hacks -x 220 -y 50 2>/dev/null || true
	tmux send-keys -t diamond_hacks "make run-api" Enter
	tmux split-window -t diamond_hacks -h
	tmux send-keys -t diamond_hacks "sleep 3 && make run-agents" Enter
	tmux split-window -t diamond_hacks -v
	tmux send-keys -t diamond_hacks "sleep 5 && make run-web" Enter
	tmux attach-session -t diamond_hacks

run-api:
	@echo "Starting FastAPI on port 8000..."
	@test -f .env && export $(shell grep -v '^#' .env | xargs) ; \
	$(PYTHON) -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload

run-agents:
	@echo "Starting all 9 agents..."
	@test -f .env && export $(shell grep -v '^#' .env | xargs) ; \
	$(PYTHON) agents/run_all.py

run-web:
	@echo "Starting Next.js on port 3000..."
	cd $(WEB_DIR) && $(NPM) run dev

# ----------------------------------------------------------
# Utilities
# ----------------------------------------------------------

health:
	@curl -sf http://localhost:8000/health | $(PYTHON) -m json.tool || echo "API not running"

submit-demo:
	@echo "Submitting demo shopping run..."
	@curl -sf -X POST http://localhost:8000/tasks \
		-H "Content-Type: application/json" \
		-d '{"instruction": "Buy AA batteries under $$18 quantity 2, USB-C charger 65W under $$30 quantity 1", "total_budget": 100}' \
		| $(PYTHON) -m json.tool

reset-db:
	@echo "Resetting database..."
	rm -f diamond_hacks.db
	@echo "Database deleted. It will be recreated on next API start."

clean:
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true
	cd $(WEB_DIR) && rm -rf .next 2>/dev/null || true
