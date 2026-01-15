#!/bin/bash
# Celery worker startup script

echo "Starting Celery worker..."
poetry run celery -A app.core.celery_app worker --loglevel=info
