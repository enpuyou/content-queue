#!/bin/bash
# Railway startup script for FastAPI service

echo "Installing dependencies with Poetry..."
poetry install --no-interaction --no-root

echo "Running database migrations..."
poetry run alembic upgrade head

echo "Starting FastAPI server..."
poetry run uvicorn app.main:app --host 0.0.0.0 --port $PORT
