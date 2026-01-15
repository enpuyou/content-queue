#!/bin/bash
# Celery worker startup script

# Ensure poetry is in PATH
export PATH="/root/.local/bin:$PATH"

echo "Installing dependencies..."
pip install poetry
poetry install --no-interaction --no-root

echo "Starting Celery worker..."
poetry run celery -A app.core.celery_app worker --loglevel=info
