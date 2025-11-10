#!/usr/bin/env bash
set -euo pipefail

# Load environment variables if .env exists
if [ -f "$(dirname "$0")/.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/.env" | xargs) || true
fi

# Start FastAPI with Uvicorn
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
