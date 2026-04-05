#!/bin/bash
# Start all services in separate terminal tabs (macOS) or panes (Linux tmux)
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in credentials."
  exit 1
fi

echo "Starting DiamondHacks services..."

if command -v tmux &>/dev/null; then
  tmux new-session -d -s diamond_hacks 2>/dev/null || true
  tmux rename-window -t diamond_hacks "api"
  tmux send-keys -t diamond_hacks "cd '$ROOT' && make run-api" Enter

  tmux new-window -t diamond_hacks -n "agents"
  tmux send-keys -t diamond_hacks "sleep 3 && cd '$ROOT' && make run-agents" Enter

  tmux new-window -t diamond_hacks -n "web"
  tmux send-keys -t diamond_hacks "sleep 5 && cd '$ROOT' && make run-web" Enter

  echo "Services starting in tmux session 'diamond_hacks'."
  echo "Attach with: tmux attach -t diamond_hacks"
else
  echo "tmux not found. Start services manually in 3 terminals:"
  echo "  Terminal 1: make run-api"
  echo "  Terminal 2: make run-agents  (after API is up)"
  echo "  Terminal 3: make run-web     (after agents are up)"
fi
