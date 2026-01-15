from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, content, lists, search, analytics
from app.middleware.rate_limit import RateLimitMiddleware


app = FastAPI(
    title="Content Queue API",
    description="Personal content aggregation and reading queue",
    version="0.1.0",
    debug=settings.DEBUG,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Include routers
app.include_router(auth.router)
app.include_router(content.router)
app.include_router(lists.router)
app.include_router(search.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"message": "Content Queue API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
