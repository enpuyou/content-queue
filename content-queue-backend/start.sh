#!/bin/bash
# Railway startup script - forces fresh install with psycopg v3

set -e  # Exit on error

echo "=== Installing main dependencies from poetry.lock ==="
poetry install --no-root --only main

echo "=== Running database migrations ==="
poetry run alembic upgrade head

echo "=== Starting FastAPI server ==="
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
