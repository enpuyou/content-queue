#!/bin/bash
# Celery worker startup script

set -e  # Exit on error

echo "=== Removing old virtualenv ==="
rm -rf .venv

echo "=== Installing main dependencies from poetry.lock ==="
poetry install --no-root --only main

echo "=== Starting Celery worker ==="
exec poetry run celery -A app.core.celery_app worker --loglevel=info
