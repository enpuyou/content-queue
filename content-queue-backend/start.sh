#!/bin/bash
# Railway startup script - forces fresh install with psycopg v3

set -e  # Exit on error

echo "=== Removing old virtualenv ==="
rm -rf .venv

echo "=== Installing main dependencies from poetry.lock ==="
poetry install --no-root --only main

echo "=== Fixing OpenCV dependencies for headless environment ==="
poetry run pip uninstall -y opencv-python opencv-python-headless || true
poetry run pip install opencv-python-headless

echo "=== Running database migrations ==="
poetry run alembic upgrade head

echo "=== Starting FastAPI server ==="
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
