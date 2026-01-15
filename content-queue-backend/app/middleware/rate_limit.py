from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
from collections import defaultdict, deque
from typing import Dict, Deque
import asyncio


class RateLimiter:
    """Simple in-memory rate limiter using token bucket algorithm"""

    def __init__(self):
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
        self.locks: Dict[str, asyncio.Lock] = {}

    async def is_allowed(
        self, identifier: str, max_requests: int, window_seconds: int
    ) -> bool:
        """Check if request is allowed within rate limit"""

        if identifier not in self.locks:
            self.locks[identifier] = asyncio.Lock()

        async with self.locks[identifier]:
            now = time.time()
            window_start = now - window_seconds

            times = self.requests[identifier]

            # Remove old requests
            while times and times[0] < window_start:
                times.popleft()

            # Check limit
            if len(times) < max_requests:
                times.append(now)
                return True

            return False


# Global instance
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware class for rate limiting"""

    async def dispatch(self, request: Request, call_next):
        # Only rate limit content creation
        if request.url.path == "/content" and request.method == "POST":
            # Get identifier
            user_id = "unknown"

            if hasattr(request.state, "user"):
                user = request.state.user
                if user and hasattr(user, "id"):
                    user_id = f"user:{user.id}"
            elif request.client:
                user_id = f"ip:{request.client.host}"

            # Check limits
            allowed_minute = await rate_limiter.is_allowed(f"{user_id}:minute", 10, 60)
            allowed_hour = await rate_limiter.is_allowed(f"{user_id}:hour", 50, 3600)

            if not (allowed_minute and allowed_hour):
                limit_type = "per minute" if not allowed_minute else "per hour"
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limit_exceeded",
                        "message": f"Too many requests {limit_type}. Please try again later.",
                        "detail": "Rate limit: 10/minute, 50/hour",
                    },
                    headers={
                        "Access-Control-Allow-Origin": "http://localhost:3000",
                        "Access-Control-Allow-Credentials": "true",
                    },
                )

        # Process request
        response = await call_next(request)
        return response
