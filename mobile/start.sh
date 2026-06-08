#!/bin/bash
# Fast Expo launcher using Node 22 LTS (Expo-compatible)
# Node v25 has broken module resolution that causes 27s+ hangs per require()
# Usage: ./start.sh [--clear] [--offline]

NODE22="/opt/homebrew/opt/node@22/bin/node"
EXPO_BIN="$(pwd)/node_modules/expo/bin/cli"

if [ ! -f "$NODE22" ]; then
  echo "ERROR: Node 22 not found. Install with: brew install node@22"
  exit 1
fi

if [ ! -f "$EXPO_BIN" ]; then
  echo "ERROR: expo CLI not found at $EXPO_BIN"
  exit 1
fi

# Load .env manually (faster than @expo/env)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# ───────────────────────────────────────────────────────────────────
# CRITICAL: Auto-detect local network IP (en0/en1) to prevent breaking
# connections when switching networks (Wi-Fi ↔ Mobile Hotspot).
# ───────────────────────────────────────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "127.0.0.1")
export EXPO_PUBLIC_DEV_BACKEND_URL="http://${LOCAL_IP}:3000"

export EXPO_NO_TELEMETRY=1

echo "🐟 Starting MatsyaMitra Expo..."
echo "   Node: $($NODE22 --version)"
echo "   Backend: $EXPO_PUBLIC_DEV_BACKEND_URL"

exec "$NODE22" "$EXPO_BIN" start "$@"
