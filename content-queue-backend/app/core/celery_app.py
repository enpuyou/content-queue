# ruff: noqa: E402,F401
from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "content_queue", broker=settings.REDIS_URL, backend=settings.REDIS_URL
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max per task
    task_soft_time_limit=25 * 60,  # Soft limit at 25 minutes
    worker_prefetch_multiplier=1,  # Take one task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    beat_schedule={
        # Cleanup old deleted items daily at 3 AM UTC
        "cleanup-old-deleted-items": {
            "task": "app.tasks.cleanup.cleanup_old_deleted_items",
            "schedule": 60 * 60 * 24,  # Every 24 hours
            # Alternative: Use crontab for specific time
            # "schedule": crontab(hour=3, minute=0),
        },
    },
)

# # Auto-discover tasks from app/tasks/ directory
# celery_app.autodiscover_tasks(['app.tasks'])

# Import tasks here (explicit import)
from app.tasks import extraction, summarization, cleanup
