# Claude Code Conversation Rules for Content Queue Project

## Communication Style

**Tutorial-Style Learning Approach:**
- Provide commands and code snippets with clear explanations of what they do
- Assume user can learn in large volumes but wants to understand each step
- This is a learning exercise, not just "magic code that works"
- **IMPORTANT:** Don't paste entire file contents in chat. Show only:
  - Small code snippets (examples, key changes)
  - Overall structure/outline
  - Specific lines that need changes
  - User should get the gist without walls of code


## Project Context

### Stack
- **Frontend:** Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis
- **Content Extraction:** trafilatura (XML → HTML conversion)
- **AI/ML:** OpenAI embeddings, pgvector for semantic search

### Key Patterns

### Documentation Workflow

**ARCHITECTURE.md must be updated in the same commit as any feature change:**
- New feature or component → add/update the relevant section
- Bug fix to a documented component → update the description if it changed
- New file → mention it in the relevant section

This keeps `ARCHITECTURE.md` current so any session or contributor can orient
quickly without reading all the source code.

### Debugging Notes

- Console errors are normal when throwing JavaScript errors (browser logs them)
- Check backend logs for Celery task status
- Rate limiting uses in-memory storage (resets on server restart)
- CORS headers must be included in error responses (429, 500, etc.)
