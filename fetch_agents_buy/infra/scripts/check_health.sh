#!/bin/bash
# Quick health check for all services
echo "=== DiamondHacks Health Check ==="
echo ""

# FastAPI
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  echo "✓ FastAPI (port 8000)"
  curl -sf http://localhost:8000/health | python3 -m json.tool 2>/dev/null | head -20
else
  echo "✗ FastAPI not responding on port 8000"
fi
echo ""

# Next.js
if curl -sf http://localhost:3000 >/dev/null 2>&1; then
  echo "✓ Next.js frontend (port 3000)"
else
  echo "✗ Next.js not responding on port 3000"
fi
echo ""

# Agent ports
for port in 8001 8002 8003 8004 8005 8006 8007 8008 8009; do
  if curl -sf http://localhost:$port >/dev/null 2>&1; then
    echo "✓ Agent port $port"
  else
    echo "- Agent port $port (not responding — may be normal)"
  fi
done
