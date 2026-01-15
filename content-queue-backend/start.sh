#!/bin/bash
# Railway startup script for FastAPI service

echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT
