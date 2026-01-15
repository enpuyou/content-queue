#!/bin/bash
# Railway startup script - forces fresh install with psycopg v3

set -e  # Exit on error

echo "=== Installing Poetry ==="
pip install --no-cache-dir poetry

echo "=== Installing dependencies from poetry.lock ==="
python -m poetry install --no-interaction --no-root --sync

echo "=== Running database migrations ==="
python -m poetry run alembic upgrade head

echo "=== Starting FastAPI server ==="
exec python -m poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
