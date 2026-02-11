"""Base task classes used across all Celery tasks."""

from celery import Task
from sqlalchemy.orm import Session
from app.core.database import SessionLocal


class DatabaseTask(Task):
    """
    Base task that provides a database session.
    Automatically closes session after task completes.
    """

    _db: Session = None

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db
