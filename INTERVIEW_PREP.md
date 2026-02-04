# Content Queue / Signal - Complete Technical Interview Guide

> **Your Personal "Read-it-Later" App with AI-Powered Knowledge Management**

---

## Table of Contents
1. [30-Second Pitch](#30-second-pitch)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack Deep Dive](#technology-stack-deep-dive)
4. [Database Schema & Design Decisions](#database-schema--design-decisions)
5. [Authentication & Security](#authentication--security)
6. [Background Job Processing Pipeline](#background-job-processing-pipeline)
7. [Semantic Search Implementation](#semantic-search-implementation)
8. [Frontend Architecture](#frontend-architecture)
9. [Key Features Implemented](#key-features-implemented)
10. [Scaling & Performance Considerations](#scaling--performance-considerations)
11. [Design Philosophy & Product Thinking](#design-philosophy--product-thinking)
12. [Interview Q&A Scenarios](#interview-qa-scenarios)

---

## 30-Second Pitch

**"I built a read-it-later application called Signal that transforms passive content consumption into active thinking. It's a full-stack TypeScript/Python app deployed on Vercel and Railway, featuring semantic search powered by OpenAI embeddings, background job processing with Celery, and a typography-first editorial design aesthetic inspired by Are.na."**

**Tech Stack Summary:**
- Frontend: Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS v4
- Backend: FastAPI, SQLAlchemy, PostgreSQL with pgvector extension
- Background Processing: Celery + Redis
- AI/ML: OpenAI embeddings for semantic search
- Deployment: Vercel (frontend), Railway (backend + workers)

---

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│                                                              │
│  Next.js App (React 19, TypeScript, Tailwind CSS v4)       │
│  • App Router file-based routing                            │
│  • React Context for global state                           │
│  • Optimistic UI updates                                    │
│  • localStorage for JWT tokens                              │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS/REST API
                   │ (JWT Bearer Token Auth)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Railway)                 │
│                                                              │
│  • CORS Middleware                                           │
│  • Rate Limiting Middleware (in-memory, 10/min, 50/hr)     │
│  • JWT Authentication via python-jose                        │
│  • Pydantic validation on all requests/responses            │
│  • RESTful API endpoints                                    │
└────┬─────────────────────┬──────────────────────────────────┘
     │                     │
     │                     │ Enqueue background jobs
     │                     ▼
     │              ┌──────────────────┐
     │              │   REDIS (Broker)  │
     │              │  • Task queue     │
     │              │  • Result backend │
     │              └──────┬───────────┘
     │                     │
     │                     │ Pull jobs
     │                     ▼
     │              ┌──────────────────────────────────┐
     │              │   CELERY WORKERS (Railway)        │
     │              │  1. extract_metadata              │
     │              │  2. extract_full_content          │
     │              │  3. generate_embedding (OpenAI)   │
     │              └──────┬───────────────────────────┘
     │                     │
     │                     │ Update DB
     ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│           POSTGRESQL DATABASE (Railway, pgvector)             │
│  Tables: users, content_items, lists, content_list_membership│
│          highlights, tags                                     │
│  Extensions: pgvector (1536-dimensional embeddings)           │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Frontend (Vercel)**
- User interface and interactions
- Client-side routing (Next.js App Router)
- Optimistic UI updates for responsiveness
- JWT token storage and management
- API calls with error handling

**Backend API (Railway)**
- Request validation (Pydantic schemas)
- Authentication/authorization (JWT)
- Business logic enforcement
- Rate limiting (prevents abuse)
- Database CRUD operations
- Background job orchestration

**Celery Workers (Railway)**
- Asynchronous web scraping
- Content extraction (trafilatura, newspaper3k)
- Metadata parsing (BeautifulSoup)
- Embedding generation (OpenAI API)
- Retry logic for failed tasks

**PostgreSQL + pgvector**
- Relational data storage
- Vector storage for embeddings
- Similarity search (cosine distance)

**Redis**
- Message broker for Celery
- Task queue storage
- Result backend

---

## Technology Stack Deep Dive

### Frontend Technologies

#### **Next.js 14 (App Router)**
**What:** React meta-framework with built-in routing, SSR, and optimizations.

**Why chosen:**
- App Router provides file-based routing (folders = URLs)
- Server Components reduce JavaScript bundle size
- Built-in optimizations (code splitting, lazy loading, image optimization)
- Seamless Vercel deployment

**How used:**
```
frontend/app/
├── dashboard/page.tsx        → /dashboard
├── content/[id]/page.tsx     → /content/:id
├── lists/[id]/page.tsx       → /lists/:id
├── settings/page.tsx         → /settings
└── layout.tsx                → Shared layout wrapper
```

**Trade-offs:**
- ✅ File-based routing is intuitive and maintainable
- ✅ Automatic code splitting improves performance
- ⚠️ App Router has different patterns than Pages Router (learning curve)

---

#### **React 19**
**What:** UI library for building component-based interfaces.

**Key patterns used:**
- **React Context**: Global state management (AuthContext, ListsContext, ToastContext, ReadingSettingsContext)
- **useState**: Local component state
- **useEffect**: Side effects (data fetching, subscriptions)
- **useCallback/useMemo**: Performance optimization
- **Custom hooks**: Reusable logic (useAuth, useToast, useReadingSettings)

**Example - AuthContext pattern:**
```tsx
// Context provides auth state globally
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Any component can access auth state
const Navbar = () => {
  const { user, logout } = useAuth();
  return <button onClick={logout}>Logout {user.email}</button>;
};
```

---

#### **TypeScript**
**What:** Statically-typed superset of JavaScript.

**Why chosen:**
- Catch bugs at compile-time instead of runtime
- Better IDE autocomplete and refactoring
- Self-documenting code (types show expected data shapes)

**Example - Type safety:**
```tsx
// Shared type definitions
export interface ContentItem {
  id: string;
  title: string;
  original_url: string;
  is_read: boolean;
  is_archived: boolean;
  read_position?: number;
  processing_status: "pending" | "processing" | "completed" | "failed";
  // ... more fields
}

// API function with type safety
async function getContent(id: string): Promise<ContentItem> {
  const res = await fetch(`/api/content/${id}`);
  return res.json(); // TypeScript knows this returns ContentItem
}
```

---

#### **Tailwind CSS v4**
**What:** Utility-first CSS framework.

**Why chosen:**
- Rapid UI development with pre-defined classes
- Design consistency via design tokens
- No naming conflicts (no global CSS)
- Tree-shaking removes unused styles

**Custom design system:**
```css
/* CSS variables for theme consistency */
:root {
  --color-bg-primary: #fffef7;      /* Warm cream */
  --color-text-primary: #1a1a1a;    /* Ink black */
  --color-accent: #3d46c2;          /* Are.na blue */
  --font-serif: 'EB Garamond', Georgia, serif;
  --font-sans: 'Inter', system-ui, sans-serif;
}

/* Dark mode override */
.dark {
  --color-bg-primary: #0d0d0d;
  --color-text-primary: #f5f5f5;
  --color-accent: #6b73e8;
}
```

**Typography-first approach:**
- Generous line-height (1.75)
- Optimal line length (65-75 characters)
- Proper vertical rhythm
- Serif fonts for reading, sans-serif for UI

---

### Backend Technologies

#### **FastAPI**
**What:** Modern Python web framework for building APIs.

**Why chosen over Django:**
- Lightweight and focused on APIs (no template engine, admin panel)
- Automatic request/response validation via Pydantic
- OpenAPI documentation auto-generated
- Async support for concurrent operations
- Type hints for better IDE support

**Example - Route definition:**
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/content", tags=["content"])

# Pydantic schema validates request body
class ContentCreate(BaseModel):
    original_url: str
    tags: list[str] = []

# Dependency injection for auth
@router.post("/", response_model=ContentItemResponse)
async def create_content(
    data: ContentCreate,
    current_user: User = Depends(get_current_active_user),  # JWT validation
    db: Session = Depends(get_db),  # Database session
):
    # Business logic
    new_item = ContentItem(user_id=current_user.id, **data.dict())
    db.add(new_item)
    db.commit()

    # Enqueue background job
    extract_metadata.delay(str(new_item.id))

    return new_item
```

---

#### **SQLAlchemy (ORM)**
**What:** Python SQL toolkit and Object-Relational Mapper.

**Why ORM instead of raw SQL:**
- Write Python objects instead of SQL strings
- Database-agnostic (can switch from Postgres to MySQL)
- Prevents SQL injection via parameterized queries
- Relationships handled automatically

**Example - Model definition:**
```python
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)

    # Metadata
    title = Column(String(500))
    original_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)

    # Content
    full_text = Column(Text)
    word_count = Column(Integer)

    # AI/ML
    embedding = Column(Vector(1536))  # pgvector extension

    # Status tracking
    processing_status = Column(String(20), default="pending")
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="content_items")
    highlights = relationship("Highlight", back_populates="content_item")
```

---

#### **PostgreSQL + pgvector**
**What:** Relational database with vector extension.

**Why chosen:**
- Robust relational model for structured data
- ACID compliance (data integrity)
- pgvector extension for embedding storage
- Mature ecosystem and tooling

**Why pgvector instead of dedicated vector DB (Pinecone, Weaviate):**
- ✅ Simpler architecture (one database, not two)
- ✅ ACID transactions across relational + vector data
- ✅ Lower operational complexity
- ⚠️ Scales to ~1M vectors before performance degrades
- ⚠️ Fewer specialized vector operations

**Vector similarity search:**
```sql
-- Find similar articles using cosine distance
SELECT id, title, 1 - (embedding <=> :query_embedding) AS similarity
FROM content_items
WHERE user_id = :user_id
  AND deleted_at IS NULL
ORDER BY embedding <=> :query_embedding  -- <=> is cosine distance operator
LIMIT 10;
```

---

#### **Celery + Redis**
**What:** Distributed task queue for background job processing.

**Why background jobs instead of synchronous processing:**
- User doesn't wait for slow operations (web scraping takes 2-10 seconds)
- Graceful failure handling (retry network errors)
- Smooths out traffic spikes (queue absorbs bursts)
- Scales independently (add more workers without touching API)

**Task pipeline architecture:**
```python
# Task 1: Extract metadata (OG tags, Twitter cards)
@celery_app.task(bind=True, max_retries=3)
def extract_metadata(self, content_item_id: str):
    item = db.query(ContentItem).get(content_item_id)

    # Fetch HTML
    response = requests.get(item.original_url, timeout=10)
    soup = BeautifulSoup(response.text, "html.parser")

    # Parse metadata
    item.title = soup.find("meta", property="og:title")["content"]
    item.description = soup.find("meta", property="og:description")["content"]
    item.thumbnail_url = soup.find("meta", property="og:image")["content"]

    db.commit()

    # Chain to next task
    extract_full_content.delay(content_item_id)

# Task 2: Extract article text
@celery_app.task(bind=True, max_retries=2)
def extract_full_content(self, content_item_id: str):
    item = db.query(ContentItem).get(content_item_id)

    # Use trafilatura for extraction
    html = requests.get(item.original_url).text
    article_text = trafilatura.extract(html, include_images=True, output_format='html')

    item.full_text = article_text
    item.word_count = len(article_text.split())
    item.reading_time_minutes = item.word_count // 200
    item.processing_status = "completed"

    db.commit()

    # Chain to embedding generation
    generate_embedding.delay(content_item_id)

# Task 3: Generate embeddings
@celery_app.task(bind=True, max_retries=2)
def generate_embedding(self, content_item_id: str):
    item = db.query(ContentItem).get(content_item_id)

    # Combine text for embedding
    text = f"{item.title}\n\n{item.description}\n\n{item.full_text}"

    # Call OpenAI API
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000]  # Truncate to token limit
    )

    item.embedding = response.data[0].embedding  # 1536-dimensional vector
    db.commit()
```

**Retry logic:**
```python
@celery_app.task(bind=True, max_retries=3)
def risky_task(self, data):
    try:
        # Do something that might fail
        result = external_api_call(data)
        return result
    except (requests.Timeout, requests.ConnectionError) as e:
        # Retry with exponential backoff
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    except Exception as e:
        # Log and fail permanently
        logger.error(f"Task failed: {e}")
        raise
```

---

#### **OpenAI Embeddings**
**What:** ML model that converts text to numerical vectors.

**Why embeddings for search:**
- Semantic understanding (finds "EV charging" when you search "electric cars")
- Language-agnostic (can match synonyms, paraphrases)
- Captures context and meaning

**Model choice:**
- `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens)
- Cheaper than `text-embedding-3-large` (3072 dimensions)
- Good enough for ~100k articles

**Embedding workflow:**
```
User searches "climate change solutions"
        ↓
Convert query to embedding vector [0.123, -0.456, 0.789, ...]
        ↓
Find articles with similar embedding vectors (cosine similarity)
        ↓
Rank results by similarity score (0.0 to 1.0)
```

---

## Database Schema & Design Decisions

### Entity-Relationship Diagram

```
┌──────────────┐
│    users     │
├──────────────┤
│ id (UUID)    │───┐
│ email        │   │
│ hashed_pw    │   │
│ full_name    │   │
│ is_active    │   │
└──────────────┘   │
                   │ 1:N (user has many content items)
                   │
┌──────────────────┴──────────────┐
│        content_items            │
├─────────────────────────────────┤
│ id (UUID)                       │───┐
│ user_id (FK → users.id)         │   │
│ original_url                    │   │ 1:N (item has many highlights)
│ title                           │   │
│ description                     │   │
│ thumbnail_url                   │   │
│ full_text                       │   │
│ word_count                      │   │
│ reading_time_minutes            │   │
│ embedding (Vector 1536)         │   │
│ processing_status               │   │
│ is_read, is_archived            │   │
│ read_position                   │   │
│ deleted_at (soft delete)        │   │
│ created_at, updated_at          │   │
└─────────────────────────────────┘   │
          │                            │
          │ N:M (via join table)       │
          │                            │
┌─────────┴──────────────────┐         │
│ content_list_membership    │         │
├────────────────────────────┤         │
│ content_item_id (FK)       │         │
│ list_id (FK)               │         │
│ added_at                   │         │
│ added_by (FK → users.id)   │         │
└────────────────────────────┘         │
          │                            │
          │ N:1 (many items per list)  │
          │                            │
┌─────────┴─────────┐                  │
│      lists        │                  │
├───────────────────┤                  │
│ id (UUID)         │                  │
│ owner_id (FK)     │                  │
│ name              │                  │
│ description       │                  │
│ is_shared         │                  │
│ created_at        │                  │
└───────────────────┘                  │
                                       │
                                       │
                            ┌──────────┴──────────┐
                            │    highlights       │
                            ├─────────────────────┤
                            │ id (UUID)           │
                            │ content_item_id (FK)│
                            │ user_id (FK)        │
                            │ text                │
                            │ note                │
                            │ start_offset        │
                            │ end_offset          │
                            │ color (yellow/etc)  │
                            │ created_at          │
                            └─────────────────────┘
```

### Key Design Decisions

#### **1. Why UUID instead of Auto-Increment IDs?**
- ✅ No collision risk when merging data from different sources
- ✅ Can generate IDs client-side (offline support future)
- ✅ Harder to enumerate/scrape (security through obscurity)
- ⚠️ Slightly larger storage (16 bytes vs 4-8 bytes)
- ⚠️ Less human-readable in URLs

---

#### **2. Why Soft Delete (`deleted_at`) instead of Hard Delete?**
```python
# Soft delete
deleted_at = Column(DateTime, nullable=True)

# All queries filter out deleted items
items = db.query(ContentItem).filter(
    ContentItem.user_id == user_id,
    ContentItem.deleted_at.is_(None)  # Exclude soft-deleted
).all()
```

**Benefits:**
- ✅ Allows "undo" functionality
- ✅ Maintains referential integrity (foreign keys still valid)
- ✅ Audit trail (can see what was deleted and when)
- ✅ Prevents accidental data loss

**Trade-offs:**
- ⚠️ Must remember to filter `deleted_at IS NULL` in every query
- ⚠️ Database size grows (deleted rows stay in table)

---

#### **3. Why Many-to-Many Join Table for Lists?**

**Without join table (bad):**
```python
# Can't support "item in multiple lists"
class ContentItem:
    list_id = Column(UUID, ForeignKey("lists.id"))  # Only ONE list!
```

**With join table (correct):**
```python
# Join table supports many-to-many
class ContentListMembership:
    content_item_id = Column(UUID, ForeignKey("content_items.id"))
    list_id = Column(UUID, ForeignKey("lists.id"))
    added_at = Column(DateTime)  # Extra metadata
```

**Benefits:**
- ✅ One article can be in "Work", "Favorites", "To Read"
- ✅ Can add metadata (when added, who added it)
- ✅ Standard relational pattern

---

#### **4. Why Store `processing_status` enum?**
```python
processing_status = Column(String(20))
# Values: "pending" | "processing" | "completed" | "failed"
```

**Use case:**
- User saves URL → status = "pending"
- Worker starts → status = "processing"
- Success → status = "completed"
- Failure → status = "failed" (+ error message stored)

**Frontend can show:**
- "Finding your article..." (pending)
- "Extracting content..." (processing)
- Show full text (completed)
- "Extraction failed" (failed)

---

#### **5. Why Store `read_position` as Float (0.0 to 1.0)?**
```python
read_position = Column(Float)  # 0.0 = start, 1.0 = end, 0.5 = halfway
```

**Alternative:** Store absolute scroll position in pixels
**Problem:** Breaks if window size changes

**Our approach:** Store percentage
- ✅ Works on any screen size
- ✅ Survives CSS changes
- ✅ Simple to calculate: `position = scrollTop / (docHeight - windowHeight)`

---

## Authentication & Security

### JWT Authentication Flow

```
1. User Registration
   ┌─────────┐
   │ Frontend│  POST /auth/register { email, password }
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Backend │  • Hash password with bcrypt
   │         │  • Store in database
   │         │  • Return success
   └─────────┘

2. User Login
   ┌─────────┐
   │ Frontend│  POST /auth/login { email, password }
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Backend │  • Load user from DB
   │         │  • Verify password hash
   │         │  • Generate JWT token
   │         │    {
   │         │      "sub": "user@example.com",
   │         │      "exp": <timestamp>
   │         │    }
   │         │  • Sign with secret key
   │         │  • Return { access_token: "..." }
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Frontend│  • Store token in localStorage
   │         │  • Redirect to dashboard
   └─────────┘

3. Authenticated Request
   ┌─────────┐
   │ Frontend│  GET /content
   │         │  Header: Authorization: Bearer <token>
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Backend │  • Extract token from header
   │         │  • Verify signature (ensures token is valid)
   │         │  • Check expiration (ensures not expired)
   │         │  • Extract user email from "sub" field
   │         │  • Load user from database
   │         │  • Proceed with request
   └─────────┘
```

### Implementation Details

```python
# backend/app/core/security.py
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash password for storage
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Verify password on login
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# Create JWT token
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Verify JWT token
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        # Decode and verify
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

        if email is None:
            raise HTTPException(401, "Invalid token")

        # Load user
        user = db.query(User).filter(User.email == email).first()

        if user is None:
            raise HTTPException(401, "User not found")

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.JWTError:
        raise HTTPException(401, "Invalid token")
```

### Security Considerations

#### **Current Protections:**
1. ✅ Passwords hashed with bcrypt (computationally expensive to crack)
2. ✅ JWT tokens signed with secret key (can't be forged)
3. ✅ Token expiration (limits damage from stolen token)
4. ✅ CORS restrictions (only frontend domain can call API)
5. ✅ Rate limiting (10 requests/minute, 50/hour per user)

#### **Known Vulnerabilities (and fixes for production):**

**1. XSS (Cross-Site Scripting)**
- **Risk:** Extracted HTML is rendered directly (`dangerouslySetInnerHTML`)
- **Attack:** Malicious article injects `<script>alert('stolen')</script>`
- **Fix:** Sanitize HTML with DOMPurify or use sandboxed iframe

**2. SSRF (Server-Side Request Forgery)**
- **Risk:** Backend fetches user-provided URLs
- **Attack:** User submits `http://localhost:6379/` (Redis internal port)
- **Fix:** Validate URLs, block internal IPs (127.0.0.1, 192.168.x.x, 10.x.x.x)

**3. localStorage Token Storage**
- **Risk:** JavaScript can read localStorage (vulnerable to XSS)
- **Better:** httpOnly cookies (JavaScript can't access)
- **Best:** httpOnly + SameSite=Strict + CSRF protection

**4. In-Memory Rate Limiting**
- **Risk:** Resets on server restart, doesn't share across instances
- **Fix:** Store rate limit counters in Redis with TTL

---

## Background Job Processing Pipeline

### Content Extraction Pipeline

```
User submits URL
       ↓
API creates ContentItem (status = "pending")
       ↓
API returns immediately (200 OK)
       ↓
API enqueues: extract_metadata.delay(item_id)
       ↓
┌─────────────────────────────────────┐
│     CELERY WORKER (Task 1)          │
│  extract_metadata                   │
│  • Fetch HTML                       │
│  • Parse <meta> tags                │
│  • Extract title, description, img  │
│  • Update DB (status = "processing")│
│  • Enqueue: extract_full_content()  │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│     CELERY WORKER (Task 2)          │
│  extract_full_content               │
│  • Fetch HTML again                 │
│  • Run trafilatura extraction       │
│  • Convert XML to HTML              │
│  • Calculate word count             │
│  • Update DB (status = "completed") │
│  • Enqueue: generate_embedding()    │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│     CELERY WORKER (Task 3)          │
│  generate_embedding                 │
│  • Combine title + description + text
│  • Call OpenAI API                  │
│  • Store 1536-dim vector in DB     │
└─────────────────────────────────────┘
```

### Error Handling & Retries

```python
@celery_app.task(bind=True, max_retries=3)
def extract_metadata(self, content_item_id: str):
    try:
        # Attempt extraction
        response = requests.get(url, timeout=10)
        # ... parse and save

    except (requests.Timeout, requests.ConnectionError) as e:
        # Transient network error → retry
        # Exponential backoff: 60s, 120s, 240s
        retry_delay = 60 * (2 ** self.request.retries)
        self.retry(exc=e, countdown=retry_delay)

    except Exception as e:
        # Permanent error (404, parse failure) → fail
        logger.error(f"Extraction failed permanently: {e}")
        item.processing_status = "failed"
        item.processing_error = str(e)
        db.commit()
        raise
```

**Why this approach:**
- Temporary failures (network glitch) get retried automatically
- Permanent failures (404 page, paywall) fail fast and save error message
- Exponential backoff prevents hammering failing services

---

### Task Monitoring

**How to check job status:**
```python
# Frontend polls API
GET /content/{id}

Response:
{
  "processing_status": "processing",
  "title": "Article Title",
  "full_text": null  // Not ready yet
}

# After job completes
{
  "processing_status": "completed",
  "title": "Article Title",
  "full_text": "<p>Article content...</p>"
}
```

**Alternative (better for production):**
- WebSockets for real-time updates
- Server-Sent Events (SSE)
- Celery result backend to query job state directly

---

## Semantic Search Implementation

### How Vector Similarity Search Works

```
Step 1: Generate Embeddings for All Articles
┌──────────────────────────────────┐
│ Article: "How to train LLMs"     │
│ Embedding: [0.12, -0.45, 0.78...]│  ← 1536 numbers
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Article: "Fine-tuning GPT-4"     │
│ Embedding: [0.15, -0.42, 0.81...]│  ← Similar to above
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Article: "Chocolate Cake Recipe" │
│ Embedding: [-0.89, 0.23, -0.11...]│  ← Very different
└──────────────────────────────────┘

Step 2: User Searches "machine learning tutorials"
Query embedding: [0.14, -0.43, 0.79...]  ← Generated from query text

Step 3: Calculate Cosine Similarity
cosine_similarity(query, article1) = 0.95  ← Very similar
cosine_similarity(query, article2) = 0.92  ← Very similar
cosine_similarity(query, article3) = 0.12  ← Not similar

Step 4: Return Top Results Ranked by Similarity
1. "How to train LLMs" (95% match)
2. "Fine-tuning GPT-4" (92% match)
```

### Implementation Code

```python
# backend/app/api/search.py

@router.get("/semantic")
async def semantic_search(
    query: str,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Generate embedding for search query
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = response.data[0].embedding

    # Find similar articles using pgvector
    # <=> is the cosine distance operator
    results = db.execute(text("""
        SELECT
            id,
            title,
            description,
            1 - (embedding <=> :query_embedding) AS similarity
        FROM content_items
        WHERE user_id = :user_id
          AND deleted_at IS NULL
          AND embedding IS NOT NULL
        ORDER BY embedding <=> :query_embedding
        LIMIT :limit
    """), {
        "query_embedding": query_embedding,
        "user_id": current_user.id,
        "limit": limit
    }).fetchall()

    return [
        {
            "item": get_content_item(row.id),
            "similarity_score": row.similarity
        }
        for row in results
        if row.similarity > 0.7  # Only return good matches
    ]
```

### Why Cosine Similarity?

**Alternatives:**
- Euclidean distance (L2): Measures straight-line distance
- Dot product: Measures magnitude + direction

**Cosine distance:** Measures angle between vectors (ignores magnitude)
- ✅ Best for text embeddings (length of document doesn't matter)
- ✅ Range: 0 (identical) to 2 (opposite)
- ✅ Normalized: can set threshold (e.g., 0.7 = "good match")

---

## Frontend Architecture

### App Router File Structure

```
frontend/app/
├── layout.tsx                    # Root layout (wraps entire app)
├── page.tsx                      # Landing page (/)
├── theme-script.tsx              # Prevent FOUC on theme
├── globals.css                   # Global styles + CSS variables
├── dashboard/
│   └── page.tsx                  # Main queue (/dashboard)
├── content/
│   └── [id]/
│       └── page.tsx              # Reader view (/content/:id)
├── lists/
│   ├── page.tsx                  # All lists (/lists)
│   └── [id]/
│       └── page.tsx              # List detail (/lists/:id)
└── settings/
    └── page.tsx                  # Settings (/settings)

frontend/components/
├── AddContentForm.tsx            # URL submission
├── ContentList.tsx               # Queue with filters
├── ContentItem.tsx               # Card component
├── Reader.tsx                    # Article reading view
├── Navbar.tsx                    # Top navigation
├── Sidebar.tsx                   # Lists navigation
├── HighlightToolbar.tsx          # Text selection UI
├── HighlightRenderer.tsx         # Render highlights in article
├── HighlightsPanel.tsx           # Sidebar showing all highlights
├── BionicText.tsx                # Bionic reading formatter
├── SettingsPreview.tsx           # Live preview of settings
└── ThemeToggle.tsx               # Light/dark/sepia switcher

frontend/contexts/
├── AuthContext.tsx               # User authentication state
├── ToastContext.tsx              # Global notifications
├── ListsContext.tsx              # List counts (sidebar)
├── ThemeContext.tsx              # Theme state
└── ReadingSettingsContext.tsx    # Typography preferences

frontend/lib/
├── api.ts                        # API client (fetch wrappers)
├── bionicReading.ts              # Text transformation utilities
└── utils.ts                      # Helper functions
```

### State Management Patterns

#### **1. Global State (React Context)**
Used for data needed across multiple pages/components.

```tsx
// contexts/ListsContext.tsx
export const ListsProvider = ({ children }) => {
  const [lists, setLists] = useState([]);
  const [counts, setCounts] = useState({});

  // Fetch lists on mount
  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    const data = await listsAPI.getAll();
    setLists(data);

    // Extract counts
    const newCounts = {};
    data.forEach(list => {
      newCounts[list.id] = list.content_count;
    });
    setCounts(newCounts);
  };

  return (
    <ListsContext.Provider value={{ lists, counts, refetch: fetchLists }}>
      {children}
    </ListsContext.Provider>
  );
};

// Any component can access
const Sidebar = () => {
  const { lists, counts } = useLists();
  return lists.map(list => (
    <div>{list.name} ({counts[list.id]})</div>
  ));
};
```

#### **2. Local State (useState)**
Used for component-specific data.

```tsx
const ContentList = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const data = await contentAPI.getAll({ filter });
      setItems(data);
      setLoading(false);
    };
    fetchItems();
  }, [filter]);  // Re-fetch when filter changes

  return <div>...</div>;
};
```

#### **3. Optimistic Updates**
Update UI immediately, revert on error.

```tsx
const markAsRead = async (itemId) => {
  // 1. Update UI immediately
  setItems(prev => prev.map(item =>
    item.id === itemId ? { ...item, is_read: true } : item
  ));

  try {
    // 2. Call API
    await contentAPI.update(itemId, { is_read: true });

    // 3. Success! UI already updated
    toast.success("Marked as read");

  } catch (error) {
    // 4. Revert on error
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, is_read: false } : item
    ));

    toast.error("Failed to update");
  }
};
```

**Why optimistic updates:**
- ✅ UI feels instant (no loading spinner)
- ✅ Better perceived performance
- ⚠️ More complex code (handle rollbacks)

---

### API Client Pattern

```tsx
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to get auth headers
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export const contentAPI = {
  // GET /content
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/content?${query}`, {
      headers: authHeaders()
    });

    if (!res.ok) throw new Error("Failed to fetch content");
    return res.json();
  },

  // POST /content
  create: async (data) => {
    const res = await fetch(`${API_BASE}/content`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to create content");
    }

    return res.json();
  },

  // PATCH /content/{id}
  update: async (id, updates) => {
    const res = await fetch(`${API_BASE}/content/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(updates)
    });

    if (!res.ok) throw new Error("Failed to update");
    return res.json();
  },

  // DELETE /content/{id}
  delete: async (id) => {
    const res = await fetch(`${API_BASE}/content/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    if (!res.ok) throw new Error("Failed to delete");
  }
};
```

---

## Key Features Implemented

### 1. **Highlights & Annotations**
**Tech:** Text selection API, character offset tracking, color coding

```tsx
// Detect text selection
useEffect(() => {
  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      // Get character offsets in original plain text
      const offsets = calculateOffsets(selection);

      setSelection({
        text,
        startOffset: offsets.start,
        endOffset: offsets.end,
        position: { x: rect.left, y: rect.top }
      });
    }
  };

  document.addEventListener("mouseup", handleSelection);
  document.addEventListener("touchend", handleSelection);

  return () => {
    document.removeEventListener("mouseup", handleSelection);
    document.removeEventListener("touchend", handleSelection);
  };
}, []);
```

**Rendering highlights:**
```tsx
// Wrap highlighted text in <mark> tags
const renderWithHighlights = (html, highlights) => {
  const plainText = stripHtml(html);

  // Sort highlights by start position
  const sorted = highlights.sort((a, b) => a.start_offset - b.start_offset);

  // Insert <mark> tags
  let result = "";
  let lastIndex = 0;

  sorted.forEach(h => {
    result += plainText.slice(lastIndex, h.start_offset);
    result += `<mark class="bg-${h.color}-200" data-highlight-id="${h.id}">`;
    result += plainText.slice(h.start_offset, h.end_offset);
    result += `</mark>`;
    lastIndex = h.end_offset;
  });

  result += plainText.slice(lastIndex);
  return result;
};
```

---

### 2. **Reading Progress Tracking**
**Tech:** Scroll position as percentage, debounced saves

```tsx
// Track scroll position
useEffect(() => {
  let saveTimeout;

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = scrollTop / docHeight;

    // Update progress bar
    setProgress(scrollPercent * 100);

    // Debounce: save 1 second after scrolling stops
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      contentAPI.update(itemId, { read_position: scrollPercent });
    }, 1000);
  };

  window.addEventListener("scroll", handleScroll);
  return () => {
    window.removeEventListener("scroll", handleScroll);
    clearTimeout(saveTimeout);
  };
}, [itemId]);

// Restore position on page load
useEffect(() => {
  if (content.read_position) {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTo = docHeight * content.read_position;
    window.scrollTo({ top: scrollTo, behavior: "smooth" });
  }
}, [content.id]);
```

---

### 3. **Advanced Typography Settings**
**Tech:** CSS custom properties, localStorage persistence

```tsx
// Reading settings stored in localStorage
const DEFAULTS = {
  theme: "light",
  fontFamily: "serif",
  fontSize: "medium",
  contentWidth: "medium",
  lineHeight: "comfortable",
  letterSpacing: "normal",
  bionicReading: false
};

// Apply settings dynamically
<div
  className={`
    ${settings.fontFamily === "serif" ? "font-serif-setting" : "font-sans-setting"}
    ${settings.fontSize === "large" ? "text-large-setting" : "text-medium-setting"}
    ${settings.lineHeight === "spacious" ? "line-height-spacious" : "line-height-comfortable"}
    ${settings.bionicReading ? "bionic-reading" : ""}
  `}
>
  {content}
</div>
```

**CSS classes:**
```css
.font-serif-setting {
  font-family: var(--font-serif), Georgia, serif;
}

.text-large-setting {
  font-size: 1.1875rem;
  line-height: 1.8;
}

.line-height-spacious {
  line-height: 2 !important;
}

.content-width-narrow {
  max-width: 32rem;  /* ~65 characters per line */
}

/* Bionic reading: bold first 40% of each word */
.bionic-reading strong {
  font-weight: 700;
  color: var(--color-text-primary);
}
```

---

### 4. **Focus Mode**
**Tech:** IntersectionObserver API, opacity transitions

```tsx
const [focusMode, setFocusMode] = useState(false);
const [focusParagraph, setFocusParagraph] = useState(null);

useEffect(() => {
  if (!focusMode) return;

  // Observe which paragraph is in viewport center
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute("data-para-index"));
          setFocusParagraph(index);

          // Update CSS classes
          document.querySelectorAll("[data-para-index]").forEach((p, i) => {
            p.classList.toggle("focused", i === index);
            p.classList.toggle("near-focused", Math.abs(i - index) === 1);
          });
        }
      });
    },
    { threshold: 0.5, rootMargin: "-30% 0px -30% 0px" }
  );

  // Observe all paragraphs
  document.querySelectorAll("p, h2, h3").forEach((p, i) => {
    p.setAttribute("data-para-index", i);
    observer.observe(p);
  });

  return () => observer.disconnect();
}, [focusMode]);
```

**CSS:**
```css
.focus-mode p,
.focus-mode h2,
.focus-mode h3 {
  opacity: 0.3;
  transition: opacity 0.4s ease;
}

.focus-mode .focused {
  opacity: 1;
}

.focus-mode .near-focused {
  opacity: 0.6;  /* Previous/next paragraph slightly visible */
}
```

---

## Scaling & Performance Considerations

### Current Bottlenecks

**1. Background Job Queue**
- **Problem:** Each URL takes 5-15 seconds to process
- **Impact:** Queue backlog during traffic spikes
- **Solution:** Add more Celery workers, prioritize jobs

**2. Semantic Search**
- **Problem:** Cosine distance calculation is O(n) on dataset size
- **Impact:** Slow queries with >100k articles
- **Solution:** HNSW indexing (pgvector supports this), approximate nearest neighbor search

**3. Database Query Performance**
- **Problem:** Complex queries with JOINs slow down
- **Impact:** Pagination, filtering become sluggish
- **Solution:** Add indexes, query optimization, caching

---

### Scaling Strategy

#### **Horizontal Scaling (Add More Instances)**

```
Current:
┌─────────────┐
│  FastAPI    │──┐
│  Instance   │  │
└─────────────┘  │
                  ├──→ PostgreSQL
┌─────────────┐  │
│   Celery    │──┘
│   Worker    │
└─────────────┘

Scaled:
┌─────────────┐
│  FastAPI    │──┐
│  Instance 1 │  │
└─────────────┘  │
┌─────────────┐  │
│  FastAPI    │  │
│  Instance 2 │  ├──→ PostgreSQL + Redis
└─────────────┘  │
┌─────────────┐  │
│   Celery    │  │
│   Worker 1  │  │
└─────────────┘  │
┌─────────────┐  │
│   Celery    │  │
│   Worker 2  │──┘
└─────────────┘
```

**Why this works:**
- FastAPI is stateless (no session storage) → can run many instances
- Celery workers pull from shared Redis queue → add workers = faster processing
- PostgreSQL handles multiple connections

---

#### **Caching Strategy**

```python
# Cache expensive queries
from functools import lru_cache
import redis

redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

@router.get("/analytics/stats")
async def get_stats(current_user: User = Depends(get_current_active_user)):
    cache_key = f"stats:{current_user.id}"

    # Check cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Compute fresh
    stats = compute_stats(current_user.id)

    # Cache for 5 minutes
    redis_client.setex(cache_key, 300, json.dumps(stats))

    return stats
```

**What to cache:**
- ✅ User stats (read count, archived count)
- ✅ List counts (rarely change)
- ✅ Search results (especially for popular queries)
- ❌ Don't cache: Real-time data (reading progress), user-specific writes

---

#### **Database Optimization**

**Add indexes:**
```sql
-- Speed up queries filtering by user_id
CREATE INDEX idx_content_user_id ON content_items(user_id);

-- Speed up queries filtering by status
CREATE INDEX idx_content_status ON content_items(user_id, is_read, is_archived);

-- Speed up vector similarity search
CREATE INDEX ON content_items USING hnsw (embedding vector_cosine_ops);
```

**Query optimization:**
```python
# Bad: N+1 query problem
items = db.query(ContentItem).filter(user_id=user.id).all()
for item in items:
    print(item.user.email)  # Queries DB for each user!

# Good: Eager loading
items = db.query(ContentItem).options(
    joinedload(ContentItem.user)
).filter(user_id=user.id).all()
```

---

#### **Rate Limiting (Production)**

**Current (in-memory):**
```python
# Resets on server restart, doesn't share across instances
rate_limit_storage = {}
```

**Better (Redis):**
```python
def check_rate_limit(user_id: str) -> bool:
    key = f"rate_limit:{user_id}"

    # Increment counter
    count = redis_client.incr(key)

    # Set expiry on first request
    if count == 1:
        redis_client.expire(key, 60)  # 60 seconds

    # Reject if over limit
    if count > 10:
        raise HTTPException(429, "Rate limit exceeded")

    return True
```

---

## Design Philosophy & Product Thinking

### Are.na-Inspired Aesthetic

**Core principles:**
1. **Typography-first:** Content is king, UI fades to background
2. **Generous whitespace:** Breathing room reduces cognitive load
3. **Subtle interactions:** 150ms transitions, no flashy animations
4. **Intentional friction:** No infinite scroll, deliberate reading

**Visual system:**
```css
/* Warm, editorial color palette */
:root {
  --color-bg-primary: #fffef7;      /* Cream paper */
  --color-text-primary: #1a1a1a;    /* Ink black */
  --color-accent: #3d46c2;          /* Are.na blue */

  --font-serif: 'EB Garamond', Georgia, serif;
  --font-sans: 'Inter', system-ui, sans-serif;
}

/* No rounded corners (editorial, not app-like) */
.rounded-none { border-radius: 0; }

/* Optimal line length for reading */
.content-width-medium {
  max-width: 42rem;  /* ~65 characters */
}

/* Comfortable line height */
.line-height-comfortable {
  line-height: 1.7;
}
```

---

### Warm Microcopy

**Instead of technical jargon, use friendly language:**

| ❌ Cold/Technical | ✅ Warm/Human |
|------------------|---------------|
| "Loading..." | "Finding your articles..." |
| "Processing" | "Preparing your article..." |
| "Error: 404" | "Hmm, we couldn't find that." |
| "Content extraction failed" | "This one didn't extract well. Try the original URL." |
| "Mark as read" | "I've read this" |
| "Delete" | "Remove from queue" |

---

### Anti-Patterns Avoided

**1. No Gamification**
- ❌ Streaks, badges, "You read 5 articles this week!" notifications
- ✅ Quiet stats page that respects user's pace

**2. No Engagement Metrics**
- ❌ "147 items unread" anxiety-inducing count
- ✅ Simple filter: "Unread", no count shown

**3. No Dark Patterns**
- ❌ Making "cancel" hard to find
- ✅ Consistent button placement, clear labels

**4. No AI Slop**
- ❌ "✨ AI-Powered Smart Insights!"
- ✅ AI as invisible infrastructure (embeddings for search, quiet TLDR)

---

## Interview Q&A Scenarios

### Architecture Questions

**Q: Why did you separate the frontend and backend instead of building a monolith?**

**A:** Separating frontend and backend provides clear separation of concerns and better scalability. The browser handles UI rendering and user interactions, while the server enforces authentication, authorization, and business logic before touching the database. This architecture also allows independent scaling—if the frontend needs more capacity, I can deploy more Next.js instances on Vercel without touching the backend. The contract between them is a well-defined REST API, which makes it easier to test and maintain each layer independently. It also gives flexibility for future expansions like a mobile app or Chrome extension that can reuse the same API.

---

**Q: Why use background jobs instead of processing URLs synchronously?**

**A:** Synchronous processing would block the HTTP request while the server fetches and parses a webpage, which can take 5-15 seconds and is prone to failure (timeouts, paywalls, slow servers). This creates a terrible user experience—imagine staring at a loading spinner for 10 seconds just to save an article. Background jobs let the API return immediately with a "pending" status, so the UI stays responsive. The heavy work happens asynchronously in Celery workers, which can retry failures, handle spikes in traffic by queuing jobs, and scale independently by adding more workers. It transforms a blocking, unreliable operation into a smooth, resilient pipeline.

---

**Q: Walk me through what happens when a user saves a URL, from click to database.**

**A:**
1. User pastes URL in the frontend and clicks "Save"
2. Frontend calls `POST /content` with the URL in the request body
3. Backend validates the request (Pydantic schema checks URL format)
4. Backend authenticates the user via JWT token
5. Backend creates a `ContentItem` row with `processing_status = "pending"`
6. Backend commits to database and returns the new item immediately (200 OK)
7. Backend enqueues `extract_metadata.delay(item_id)` to Redis
8. API request completes, frontend shows "Finding your article..." status
9. Celery worker picks up the job from Redis
10. Worker fetches HTML, parses `<meta>` tags, updates database
11. Worker enqueues `extract_full_content.delay(item_id)`
12. Second worker extracts article text with trafilatura, saves to DB
13. Second worker enqueues `generate_embedding.delay(item_id)`
14. Third worker calls OpenAI API, stores embedding vector
15. Frontend polls `GET /content/{id}` and sees `processing_status = "completed"`
16. Frontend displays the full article

---

### Database & Data Modeling

**Q: Why did you use a join table for the many-to-many relationship between content and lists?**

**A:** A join table is the correct relational model for many-to-many relationships. Each article can belong to multiple lists (e.g., "Work", "Favorites", "To Read"), and each list can contain multiple articles. Without a join table, I'd have to either limit articles to one list (bad UX) or store a list of list IDs in a JSON field (non-relational, hard to query efficiently). The join table also lets me store additional metadata like when the item was added to the list, or who added it, without duplicating content data. This follows normalization principles and keeps data integrity strong.

---

**Q: Why soft delete instead of hard delete?**

**A:** Soft deletes set a `deleted_at` timestamp instead of removing the row from the database. This provides several benefits: users can undo accidental deletions, I can build an "undo" feature later, and I maintain referential integrity—foreign keys don't break if a referenced item is soft-deleted. It also creates an audit trail for debugging and analytics. The trade-off is that every query must filter `deleted_at IS NULL`, and the database size grows because deleted rows stay in the table. In production, I'd add a background job to permanently delete items older than 90 days.

---

**Q: How did you handle storing embeddings in the database?**

**A:** I used PostgreSQL's pgvector extension, which adds a `vector` column type for storing high-dimensional arrays. Each embedding is 1536 floating-point numbers from OpenAI's `text-embedding-3-small` model. pgvector provides operators for cosine distance (`<=>`), dot product, and L2 distance, which makes similarity queries straightforward SQL. I chose pgvector over a dedicated vector database like Pinecone because it simplifies the architecture—I only need one database instead of two—and it keeps relational and vector data in sync with ACID transactions. The trade-off is performance: pgvector scales to about 1 million vectors before approximate nearest neighbor search becomes necessary, but for this use case (personal reading queue), that's more than sufficient.

---

### Authentication & Security

**Q: Explain how JWT authentication works in your app, step by step.**

**A:**
1. **Login:** User submits email and password to `POST /auth/login`
2. **Verification:** Backend loads user from database, verifies password hash with bcrypt
3. **Token generation:** Backend creates a JWT containing `{"sub": "user@example.com", "exp": <timestamp>}` and signs it with a secret key using HS256
4. **Response:** Backend returns `{"access_token": "..."}`
5. **Storage:** Frontend stores token in localStorage
6. **Authenticated requests:** Frontend includes `Authorization: Bearer <token>` header on every API call
7. **Validation:** Backend extracts token, verifies signature (proves it was issued by this server), checks expiration, extracts email from `sub` field, and loads user from database
8. **Authorization:** If valid, request proceeds; if invalid/expired, return 401

The key insight is that JWTs are stateless—the server doesn't need to store sessions. Any backend instance can verify the token using the shared secret key, which makes horizontal scaling trivial.

---

**Q: What are the security vulnerabilities in your current implementation, and how would you fix them?**

**A:**
1. **XSS (Cross-Site Scripting):** Extracted HTML is rendered directly with `dangerouslySetInnerHTML`, which allows malicious scripts. **Fix:** Sanitize HTML with DOMPurify or use a sandboxed iframe.

2. **SSRF (Server-Side Request Forgery):** Backend fetches user-provided URLs, which could target internal services (e.g., `http://localhost:6379`). **Fix:** Validate URLs against a blocklist of internal IP ranges (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16) and only allow HTTP/HTTPS schemes.

3. **localStorage token storage:** Vulnerable to XSS attacks because JavaScript can read localStorage. **Fix:** Use httpOnly cookies so JavaScript can't access the token, and add CSRF protection with double-submit tokens.

4. **In-memory rate limiting:** Resets on server restart and doesn't work across multiple instances. **Fix:** Move rate limit counters to Redis with TTL expiration.

5. **No HTTPS enforcement:** In development, but production should enforce HTTPS with HSTS headers.

---

### Performance & Scaling

**Q: What would break first if your app got 10,000 active users?**

**A:** The extraction pipeline would bottleneck first. Each URL requires 3 background jobs (metadata extraction, full-text extraction, embedding generation), and each job takes 5-15 seconds. If 1,000 users save 10 URLs each per day, that's 30,000 jobs. With 2 Celery workers, that's 208 hours of work per day—far more than 24 hours. The queue would grow indefinitely, and users would wait hours for content to appear. The second bottleneck would be semantic search: cosine distance calculation is O(n) on dataset size, so with 100,000 articles per user, queries would slow down significantly. After that, database queries for filtering and pagination would degrade as the tables grow.

**Solutions:**
1. Add more Celery workers (horizontal scaling)
2. Implement job prioritization (recent saves first)
3. Cache search results in Redis
4. Add HNSW indexing for approximate nearest neighbor search
5. Add database indexes on frequently queried columns

---

**Q: How would you monitor the health of your background job queue?**

**A:** I'd track three key metrics:

1. **Queue length:** Number of pending jobs. Alert if it grows above 1,000 (indicates workers can't keep up).
2. **Job duration:** P50, P95, P99 latency for each task type. Alert if extraction time exceeds 30 seconds.
3. **Failure rate:** Percentage of jobs that fail after retries. Alert if >5%.

For implementation, I'd use Celery's built-in monitoring (Flower) or export metrics to Prometheus/Datadog. I'd also add application-level logging to track task start/completion and store results in a metrics table for historical analysis. Critical alerts would go to PagerDuty; trends would show in Grafana dashboards.

---

### Product & Design

**Q: Why did you prioritize highlights over other features?**

**A:** Highlights are the foundation of active reading. Every other feature I planned—claims extraction, connections between articles, distillation—requires highlights as input. Without capturing what users find important, I can't build tools that help them think. It's also the most direct value proposition: instead of passively consuming articles, users engage by marking key passages and adding notes. This shifts behavior from "save and forget" to "save and process," which is the core problem the app solves.

---

**Q: What's the most interesting design trade-off you made?**

**A:** The decision to use optimistic UI updates. When a user marks an article as read, the UI updates immediately before the API call completes. If the call fails, I revert the change and show an error. This makes the app feel instant—no loading spinners for simple actions—but it adds complexity: I have to handle rollback logic and edge cases like network failures. The trade-off is worth it because perceived performance is crucial for user satisfaction. Users forgive the occasional revert, but they'd notice a slow, unresponsive UI every single time.

Another interesting trade-off was **pgvector vs. dedicated vector DB**. pgvector keeps the architecture simple (one database), but dedicated vector DBs scale better. For a personal reading queue, simplicity won—most users have <10k articles, and pgvector handles that easily. If this became a team product with shared libraries (1M+ articles), I'd migrate to Pinecone or Weaviate.

---

**Q: How does this project demonstrate full-stack skills?**

**A:**
- **Frontend:** React component architecture, state management with Context, optimistic updates, responsive design, TypeScript for type safety
- **Backend:** RESTful API design, JWT authentication, ORM usage, async background jobs, rate limiting
- **Database:** Relational modeling (many-to-many joins), soft deletes, vector storage, query optimization
- **DevOps:** Deployment on Vercel and Railway, environment management, background worker orchestration
- **AI/ML:** Semantic search with embeddings, vector similarity, OpenAI API integration
- **Product:** Typography-first design, intentional UX friction, warm microcopy, accessibility considerations

It's a complete end-to-end system that touches every layer of the stack and demonstrates product thinking, not just technical implementation.

---

## Summary: Your 2-Minute Elevator Pitch

**"I built Signal, a read-it-later app that transforms passive content consumption into active thinking. It's a full-stack TypeScript/Python application with a Next.js frontend, FastAPI backend, and Celery background job processing deployed on Vercel and Railway.**

**The core feature is semantic search powered by OpenAI embeddings stored in PostgreSQL with the pgvector extension. Users can search by meaning, not just keywords, and find related articles automatically. I implemented a multi-stage extraction pipeline that fetches metadata, parses article text with trafilatura, and generates 1536-dimensional embedding vectors asynchronously to keep the UI responsive.**

**On the frontend, I built a typography-first reading experience inspired by Are.na, with advanced settings for font customization, bionic reading mode, and focus mode that dims non-active paragraphs using the IntersectionObserver API. I used React Context for global state management and implemented optimistic UI updates for instant feedback.**

**The architecture demonstrates full-stack depth: JWT authentication, soft deletes for data recovery, many-to-many relational modeling, rate limiting, and horizontal scalability. I designed it with product thinking in mind—warm microcopy, intentional UX friction, and anti-gamification—to create a tool for deep work, not just another productivity app."**

---

Good luck with your interview! You've built a genuinely impressive full-stack project with real depth. 🚀
