# Claude Code Conversation Rules for Content Queue Project

## Communication Style

**Tutorial-Style Learning Approach:**
- Provide commands and code snippets with clear explanations of what they do
- User will manually type/paste code into the editor (not automatic edits)
- Assume user can learn in large volumes but wants to understand each step
- This is a learning exercise, not just "magic code that works"
- **IMPORTANT:** Don't paste entire file contents in chat. Show only:
  - Small code snippets (examples, key changes)
  - Overall structure/outline
  - Specific lines that need changes
  - User should get the gist without walls of code
- When making changes:
  1. Show the exact code to add/change (concisely)
  2. Explain what it does and why
  3. Indicate where it goes (file path, line numbers, or surrounding context)
  4. Let user implement it manually

**Example of good explanation:**
```
Let's add rate limiting to the content creation endpoint.

File: backend/app/middleware/rate_limit.py

Add these imports at the top:
```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
```

This imports the FastAPI Request object (to access request data) and
BaseHTTPMiddleware (to create custom middleware that runs on every request).

Next, create a RateLimiter class...
```

## Project Context

### Stack
- **Frontend:** Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis
- **Content Extraction:** trafilatura (XML → HTML conversion)
- **AI/ML:** OpenAI embeddings, pgvector for semantic search

### Key Patterns

**Frontend:**
- Optimistic UI updates (update state immediately, revert on error)
- Toast notifications for user feedback (`useToast()` context)
- Confirmation modals for destructive actions
- Client-side filtering with backend API integration

**Backend:**
- JWT authentication with Bearer tokens
- Soft deletes (set `deleted_at` timestamp)
- Background jobs with Celery for web scraping
- Rate limiting with custom middleware
- CORS headers for localhost:3000

### Current Phase
Working on Phase 1: Core MVP - Reading Queue Fundamentals

Completed:
- ✅ Content List View with real API integration
- ✅ Reading View with typography controls and themes
- ✅ Delete confirmation modals
- ✅ Toast notification system
- ✅ Read position tracking (scroll percentage)
- ✅ Backend error handling improvements
- ✅ Rate limiting (10/min, 50/hour per user)

### Important Files

**Frontend:**
- `frontend/components/ContentList.tsx` - Main content list with filtering
- `frontend/components/ContentItem.tsx` - Individual content card
- `frontend/components/Reader.tsx` - Full-screen article reader
- `frontend/components/AddContentForm.tsx` - URL submission form
- `frontend/contexts/ToastContext.tsx` - Global toast notifications
- `frontend/lib/api.ts` - API client with auth and error handling

**Backend:**
- `backend/app/main.py` - FastAPI app setup, middleware, CORS
- `backend/app/api/content.py` - Content CRUD endpoints
- `backend/app/middleware/rate_limit.py` - Custom rate limiting
- `backend/app/tasks/extraction.py` - Celery tasks for web scraping

### Known Issues / TODOs

1. **Image Handling:** In-article images not displaying properly
   - Need to convert relative URLs to absolute
   - Consider local hosting or image proxy
   - Location: `backend/app/tasks/extraction.py:280`

2. **Content Extraction:** Some sites don't extract well
   - Fallback strategy: XML → plain text → error
   - Consider adding newspaper3k as alternative

### Debugging Notes

- Console errors are normal when throwing JavaScript errors (browser logs them)
- Check backend logs for Celery task status
- Rate limiting uses in-memory storage (resets on server restart)
- CORS headers must be included in error responses (429, 500, etc.)

### Next Steps (Phase 2)

Upcoming features to implement:
- Lists & Collections (organize content into custom lists)
- Search (semantic search with embeddings)
- Tags & metadata
- Mobile responsive improvements
