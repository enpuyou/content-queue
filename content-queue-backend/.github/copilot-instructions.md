# Copilot / AI agent instructions — Content Queue Backend

Purpose: give an AI coding agent the exact, actionable context it needs to make safe, small, reviewable changes in this repo.

- **Big picture**: This repository is a FastAPI backend (`app/main.py`) that reads config from `app/core/config.py` (uses `pydantic-settings`). Data access uses SQLAlchemy with `app/core/database.py` (exports `engine`, `SessionLocal`, and `get_db()`). Background processing is expected via Celery/Redis (dependencies present in `pyproject.toml`), and the project integrates with external services such as OpenAI (via `OPENAI_API_KEY`) and Postgres (via `DATABASE_URL`).

- **Key files to inspect before making changes**:
  - `app/main.py` — the FastAPI app, CORS config, root and health endpoints.
  - `app/core/config.py` — single source of configuration: `settings = Settings()`; env vars are loaded from `.env`.
  - `app/core/database.py` — SQLAlchemy engine, `SessionLocal`, and DB dependency `get_db()` (use this for DB sessions).
  - `app/api/` — place where routers should live (currently empty); new endpoints should be registered here and included on the main app.
  - `app/tasks/` — background tasks / Celery app is expected here; confirm `Celery` app exists before launching workers.
  - `pyproject.toml` — authoritative dependency list (FastAPI, Uvicorn, SQLAlchemy, Celery, Redis, OpenAI, pgvector, etc.).

- **Config & secrets** (important env vars):
  - `DATABASE_URL` — Postgres connection used by SQLAlchemy.
  - `REDIS_URL` — Redis broker for Celery/queueing.
  - `OPENAI_API_KEY` — OpenAI API key; do NOT hardcode. Use `settings.OPENAI_API_KEY`.
  - `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` — auth-related values in `settings`.

- **Common coding patterns to follow (from codebase)**:
  - Use `from app.core.config import settings` to access configuration values.
  - For DB access in endpoints, import `get_db` from `app.core.database` and use it as a FastAPI dependency to get a session.
    Example: `def endpoint(db: Session = Depends(get_db)):`
  - Keep routers under `app/api/` and register them in `app/main.py` (if adding a router, add `app.include_router(...)` in `app/main.py` or in an `app/api/__init__.py` helper).

- **Developer workflows / commands** (what works here):
  - Run dev server:

    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

  - Run tests (dev deps in `pyproject.toml` include `pytest`, `pytest-asyncio`, `httpx`):

    ```bash
    pytest
    ```

  - Formatting / linting (dev deps include `black`, `ruff`):

    ```bash
    ruff check .
    black .
    ```

  - Celery worker (only valid if `app/tasks` defines a Celery app named `celery_app` or similar). Typical start command (adjust `-A` target to the actual Celery app module):

    ```bash
    celery -A app.tasks worker -l info
    ```

  - Database migrations: this project lists `alembic` as a dependency; if an `alembic` config is present, use:

    ```bash
    alembic upgrade head
    ```

- **Integration points & third-party services**:
  - OpenAI (`openai` package) — the code expects `OPENAI_API_KEY` and the dependency is present.
  - Postgres (`psycopg2-binary`) with optional `pgvector` usage (embedding storage).
  - Redis — used as the likely broker for Celery tasks.
  - Content extraction tools: `newspaper3k`, `trafilatura`, `yt-dlp` — used by ingestion/processing tasks; search `app/tasks` and `app/services` when modifying ingestion logic.

- **Project-specific expectations & caveats**:
  - `app/api`, `app/services`, `app/tasks`, `app/models`, and `app/schemas` are present but many `__init__.py` files are empty — expect feature code to be added to these locations. Before creating a Celery worker or running tasks, confirm the actual Celery app definition exists in `app/tasks`.
  - The repo uses `pydantic-settings` via `Settings` in `app/core/config.py`; prefer reading config via the `settings` instance rather than os.environ directly.
  - Avoid changing public APIs without updating the route registration in `app/main.py` and adding tests under the test harness that uses `pytest-asyncio` and `httpx`.

- **When you make changes, run these quick checks**:
  - Start dev server and hit `/health` to confirm app boots.
  - Run `pytest` for local tests.
  - If you add DB models, run migrations (or create alembic revision) and ensure `get_db()` still works.

If anything here is unclear or a file referenced above is outdated, tell me which file or area you want expanded and I will update this file accordingly.
