#!/bin/bash
# Celery worker startup script

echo "Installing Poetry..."
pip install poetry

# Use python -m poetry instead of relying on PATH
echo "Installing dependencies..."
python -m poetry install --no-interaction --no-root --no-cache

echo "Starting Celery worker..."
python -m poetry run celery -A app.core.celery_app worker --loglevel=info
