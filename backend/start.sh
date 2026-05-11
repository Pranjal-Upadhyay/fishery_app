#!/bin/sh
# Run pending database migrations, then start the API server.
# This ensures migration 017 (and any future ones) are applied automatically
# when the Docker container starts on Render.

set -e

echo "[start.sh] Running database migrations..."
node dist/scripts/migrate.js

echo "[start.sh] Starting API server..."
exec node dist/index.js
