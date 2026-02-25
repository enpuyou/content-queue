from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, content, lists, search, analytics, highlights, vinyl
from app.api.endpoints import public
from app.middleware.rate_limit import RateLimitMiddleware
import os

app = FastAPI(
    title="Content Queue API",
    description="Personal content aggregation and reading queue",
    version="0.1.0",
    debug=settings.DEBUG,
)

# CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Allow browser extension origins (Chrome, Firefox, Safari)
    allow_origin_regex=r"(chrome|moz)-extension://.*|safari-web-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Include routers
app.include_router(auth.router)
app.include_router(content.router)
app.include_router(highlights.router)
app.include_router(lists.router)
app.include_router(search.router)
app.include_router(analytics.router)
app.include_router(vinyl.router)
app.include_router(public.router)

# Dev-only test routes (serves local PDFs from gitignored pdf/ directory)
# Only mounted when DEBUG=true — never active in production
if settings.DEBUG:
    from app.api import test_pdf  # noqa: PLC0415

    app.include_router(test_pdf.router)


@app.get("/")
def root():
    return {"message": "Content Queue API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
