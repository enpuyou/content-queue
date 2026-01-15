#!/bin/bash
# Railway startup script - forces fresh install with psycopg v3

set -e  # Exit on error

echo "=== Syncing dependencies from poetry.lock ==="
poetry sync --no-root

echo "=== Running database migrations ==="
poetry run alembic upgrade head

echo "=== Starting FastAPI server ==="
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
