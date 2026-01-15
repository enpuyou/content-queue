#!/bin/bash
# Celery worker startup script

echo "Installing Poetry..."
pip install poetry

# Add poetry to PATH (check multiple possible locations)
export PATH="/root/.local/bin:/home/railway/.local/bin:$HOME/.local/bin:$PATH"

echo "Installing dependencies..."
poetry install --no-interaction --no-root

echo "Starting Celery worker..."
poetry run celery -A app.core.celery_app worker --loglevel=info
