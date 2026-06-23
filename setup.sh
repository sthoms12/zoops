#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/sthoms12/zoops"
DIR="/home/workspace/zoops"

echo ""
echo "  ZoOps — Zo Computer Dashboard"
echo "  ================================"
echo ""

# ── 1. Clone or update ────────────────────────────────────────────
if [ -d "$DIR/.git" ]; then
  echo "  → Already installed — pulling latest..."
  git -C "$DIR" pull --ff-only --quiet
  echo "  ✓ Up to date"
else
  echo "  → Cloning from GitHub..."
  git clone --quiet "$REPO" "$DIR"
  echo "  ✓ Cloned"
fi

# ── 2. Install dependencies ───────────────────────────────────────
echo "  → Installing dependencies..."
cd "$DIR"
bun install --silent
echo "  ✓ Dependencies installed"

# ── 3. Auto-register via Zo API ───────────────────────────────────
REGISTERED=false

if [ -n "${ZO_CLIENT_IDENTITY_TOKEN:-}" ]; then
  echo "  → Registering as a Zo service..."

  PAYLOAD='{"input":"Register a new private HTTP Zo service: name ZoOps, entrypoint bash -c '\''cd /home/workspace/zoops && NODE_ENV=production bun run server.ts'\'', local_port 50165, private true. Reply with just the service URL.","model_name":"byok:dc47f089-b83c-4809-a761-bce177448a62"}'

  RESPONSE=$(curl -sf --max-time 60 -X POST "https://api.zo.computer/zo/ask" \
    -H "Authorization: Bearer $ZO_CLIENT_IDENTITY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>/dev/null || true)

  if [ -n "$RESPONSE" ]; then
    SERVICE_URL=$(echo "$RESPONSE" | grep -oP 'https://[a-zA-Z0-9._-]+\.zo\.computer[^\s"'\'']*' | head -1 || true)
    if [ -n "$SERVICE_URL" ]; then
      echo ""
      echo "  ✅ ZoOps is live!"
      echo ""
      echo "     $SERVICE_URL"
      echo ""
      REGISTERED=true
    fi
  fi
fi

# ── 4. Fallback: print the Zo chat prompt ─────────────────────────
if [ "$REGISTERED" = "false" ]; then
  echo ""
  echo "  ✅ ZoOps installed!"
  echo ""
  echo "  Last step — paste this into your Zo chat to register it"
  echo "  as a persistent service:"
  echo ""
  echo "  ┌──────────────────────────────────────────────────────────┐"
  echo "  │ Register ZoOps as a private Zo service.                  │"
  echo "  │ Entrypoint: bash -c \"cd /home/workspace/zoops &&         │"
  echo "  │ NODE_ENV=production bun run server.ts\"                   │"
  echo "  │ Port: 50165                                              │"
  echo "  └──────────────────────────────────────────────────────────┘"
  echo ""
fi
