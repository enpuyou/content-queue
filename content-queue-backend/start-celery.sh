#!/bin/bash
# Celery worker startup script

set -e  # Exit on error

echo "=== Syncing dependencies from poetry.lock ==="
poetry sync --no-root

echo "=== Starting Celery worker ==="
exec poetry run celery -A app.core.celery_app worker --loglevel=info
