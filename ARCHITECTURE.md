# Content Queue Architecture and Design Doc

---

## 1) What the app does
Content Queue is a read-it-later app. Users paste a URL and the system:
1) Saves it to their personal queue.
2) Extracts the title, description, and thumbnail.
3) Extracts the article text so it can be read in the app.
4) Allows organization into lists.
5) Supports semantic search (search by meaning, not exact words).

---

## 2) Glossary (simple definitions)
- **Frontend**: Code running in the browser (UI, buttons, pages).
- **Backend**: Code running on the server (security, data rules, API).
- **API**: A set of URLs that the frontend calls to get or update data.
- **Database**: A system that stores structured data as tables and rows.
- **Relational DB**: A database with tables that can be linked by keys.
- **ORM**: Object-Relational Mapper. Lets you use classes instead of raw SQL.
- **JWT**: JSON Web Token. A signed string that proves a user is logged in.
- **Hashing**: Turning a password into an irreversible string.
- **Background job**: Work done after a user request returns.
- **Queue**: A waiting line for background jobs.
- **Worker**: A process that pulls jobs from the queue and runs them.
- **Embedding**: A vector (list of numbers) representing text meaning.
- **Vector search**: Finding similar items by comparing embeddings.
- **CORS**: Browser rule controlling which websites can call APIs.
- **SSRF**: Server-Side Request Forgery (dangerous server-side URL fetches).
- **XSS**: Cross-Site Scripting (malicious HTML/JS in the browser).

---

## 3) System overview (components and connections)

```
Browser
  -> Next.js Frontend (Vercel)
     -> FastAPI Backend (Railway)
        -> Postgres DB (pgvector)
        -> Redis (Celery broker/result)
        -> Celery Workers (Railway)
              -> URL fetch + metadata extraction
              -> Full text extraction
              -> Embedding generation
```

Why this split:
- The frontend must feel fast and responsive.
- The backend must enforce security and data ownership.
- Slow work (fetching/parsing web pages) should not block user requests.

---

## 4) Technology choices and what they actually do

### Frontend technologies

**Next.js**
- What it is: A framework on top of React that handles routing, builds, and
  deployment optimization.
- Why we use it: It provides a clean project structure, routing built in, and
  easy deployment on Vercel.
- How it works here: Pages live under `frontend/app`. Each folder maps to a URL.

**App Router (Next.js feature)**
- What it is: Next.js routing system where folders define routes.
- Example: `frontend/app/lists/[id]/page.tsx` becomes `/lists/<id>`.
- Why we use it: File-based routing is simple and predictable.

**React**
- What it is: A library for building UI with reusable components.
- Why we use it: The UI is made of repeated pieces (cards, lists, modals).
- Key concept: Components take props and manage state.

**React Context**
- What it is: A way to share state globally without passing props through every
  component.
- Example: List counts shown in the sidebar and lists page use a shared context.

**Tailwind CSS**
- What it is: A utility-first CSS framework where styles are written as classes
  like `bg-gray-50` or `text-sm`.
- Why we use it: It speeds up UI development and keeps styles close to code.

### Backend technologies

**FastAPI**
- What it is: A Python web framework for building APIs.
- Why we use it: It is lightweight, fast, and uses type hints for validation.
- How it works: Functions decorated with `@router.get` or `@router.post`
  become API endpoints.

**Pydantic**
- What it is: A validation library used by FastAPI.
- Why it matters: It automatically checks request/response shapes and types.

**SQLAlchemy**
- What it is: An ORM (Object-Relational Mapper).
- Why we use it: It lets us treat database tables like Python classes.
- Example: `ContentItem` is a Python class mapped to a table.

**Postgres**
- What it is: A relational database.
- Why we use it: Strong support for relationships (users, lists, content).
- Example: A list can contain many items, and items can belong to many lists.

**pgvector**
- What it is: A Postgres extension that supports storing and searching vectors.
- Why we use it: It enables similarity search inside Postgres itself.

**Redis**
- What it is: An in-memory data store used as a message broker.
- Why we use it: Celery needs a fast queue system to store pending jobs.

**Celery**
- What it is: A task queue for Python.
- Why we use it: It runs slow work (URL parsing, embeddings) in the background.

**OpenAI Embeddings**
- What it is: A model that turns text into vectors.
- Why we use it: Enables semantic search by meaning.

---

## 5) Data model (tables explained)

### Users table
Stores login identity.
- `id`: unique user ID.
- `email`: login identifier, unique.
- `hashed_password`: stored hash, never plain text.
- `full_name`, `is_active`.

### Content items table
Represents a saved URL.
Fields include:
- Ownership: `user_id`.
- URL: `original_url`.
- Metadata: `title`, `description`, `thumbnail_url`, `content_type`.
- Full text: `full_text`, `word_count`, `reading_time_minutes`.
- Status: `is_read`, `is_archived`, `read_position`.
- Processing: `processing_status`, `processing_error`.
- Embedding: `embedding` (pgvector).
- Soft delete: `deleted_at`.

### Lists table
User-defined collections.
- `owner_id`, `name`, `description`, `is_shared`.

### content_list_membership table
Join table for many-to-many relationship.
- `content_item_id`, `list_id`.
- `added_at`, `added_by`.

Why this structure:
- A user can have many lists.
- A content item can appear in multiple lists.
- The join table models this properly.

---

## 6) Authentication (end-to-end explanation)

### Registration
1) User submits email and password.
2) Backend hashes the password with bcrypt.
3) User row is saved in the database.

### Login
1) User submits email and password.
2) Backend compares password to stored hash.
3) Backend generates a JWT token:
   - Contains user email in the `sub` field.
   - Has an expiration timestamp.
4) Backend returns token to frontend.

### Authenticated requests
1) Frontend stores token in localStorage.
2) Each API call adds:
   `Authorization: Bearer <token>`
3) Backend verifies token signature and expiration.
4) Backend loads the user and continues request.

Why JWT:
- Stateless: any backend instance can verify it.
- Scales easily without shared session storage.

Security caveat:
- localStorage is vulnerable to XSS. A production hardening would use httpOnly
  cookies and strict CSP headers.

---

## 7) API design (what each endpoint does)

### Auth
- `POST /auth/register`: create a user.
- `POST /auth/login`: return a JWT token.
- `GET /auth/me`: return current user info.

### Content
- `POST /content`: create item and enqueue extraction.
- `GET /content`: list items (supports filters and pagination).
- `GET /content/{id}`: fetch single item.
- `GET /content/{id}/full`: fetch full text.
- `PATCH /content/{id}`: update read/archive/tags/progress.
- `DELETE /content/{id}`: soft delete item.

### Lists
- `POST /lists`: create list.
- `GET /lists`: list all lists with content counts.
- `GET /lists/{id}`: list details.
- `PATCH /lists/{id}`: update name/description/share.
- `DELETE /lists/{id}`: delete list.
- `GET /lists/{id}/content`: items in a list.
- `POST /lists/{id}/content`: add content to list.
- `DELETE /lists/{id}/content`: remove content from list.

### Search
- `GET /search/semantic?query=...`: semantic search by embedding.
- `GET /search/{id}/similar`: find items similar to a given item.

### Analytics
- `GET /analytics/stats`: totals for read/unread/archived and time.

---

## 8) Frontend design (how pages are built)

### Main pages
- `/dashboard`: main queue list with filters and add form.
- `/lists`: list management.
- `/lists/[id]`: view items inside a list.
- `/content/[id]`: reader view.

### Key components
- `AddContentForm`: collects URL.
- `ContentList`: fetches items and applies filters.
- `ContentItem`: individual card with actions.
- `Reader`: shows full text and saves progress.
- `Sidebar`: list navigation.

### State and shared data
React Context is used for shared state:
- **AuthContext**: current user and login/logout.
- **ListsContext**: list counts.
- **ToastContext**: user notifications.

Why context:
- Without it, data would need to be passed through many components.

---

## 9) Background processing (deep technical detail)

### Why background jobs
Fetching and parsing web pages can take seconds and can fail. If we did it in
the API request, the UI would feel slow and unreliable.

### How it works in this app
1) API stores the content item.
2) API enqueues a job in Redis.
3) Celery worker picks it up and runs extraction steps.
4) Worker updates the database.

### Stage 1: Metadata extraction
- Uses `requests` to fetch HTML.
- Uses BeautifulSoup to parse OG/Twitter tags.
- Updates title, description, thumbnail.

### Stage 2: Full text extraction
- Uses trafilatura to extract article text.
- Converts structured XML to HTML.
- Stores HTML in `full_text`.
- Computes word count and reading time.

### Stage 3: Embedding generation
- Combines title + description + full text.
- Calls OpenAI embeddings API.
- Stores vector in Postgres (pgvector).

Why separate stages:
- Each step can fail independently.
- Embeddings only make sense after text extraction.
- Easier to debug and retry.

---

## 10) Semantic search explained

Keyword search looks for exact words. Semantic search looks for meaning.

Steps:
1) Each article gets an embedding vector (1536 numbers).
2) Query text gets its own embedding.
3) Postgres compares vectors using cosine distance.
4) Items are ranked by similarity.

Example:
- Query: "electric cars"
- Results may include articles about "EV charging" even if "electric cars" is
  not a literal phrase in the article.

---

## 11) Error handling and reliability

### Backend
- 401 if token invalid.
- 404 if item not found or soft-deleted.
- 429 on rate limit.

### Background jobs
- Retries on temporary network failures.
- Saves error messages if extraction fails.

### Frontend
- Optimistic updates for responsiveness.
- Reverts UI if API call fails.
- Toasts inform the user of errors.

---

## 12) Security considerations

Current protections:
- Password hashing with bcrypt.
- JWT authentication.
- CORS restricted by environment variable.
- Rate limiting for content creation.

Known risks:
- **XSS**: extracted HTML is rendered directly.
- **SSRF**: backend fetches user-provided URLs.
- **Rate limit scope**: in-memory only.

Fixes:
- Sanitize HTML or use sandboxed iframes.
- Validate URLs and block internal IPs.
- Move rate limiting to Redis.

---

## 13) Scaling and performance

Potential growth issues:
- Extraction jobs can backlog the queue.
- Semantic search becomes expensive with many vectors.

Scaling plan:
- Add more FastAPI instances.
- Add more Celery workers.
- Add caching for analytics.
- Add pagination and indexes for large datasets.

---

## 14) Design tradeoffs (what we chose and why)

- **Polling vs websockets**: polling is simple; websockets are faster but more
  complex to operate.
- **JWT vs sessions**: JWT is stateless and scales easily; sessions can be more
  secure but need shared storage.
- **pgvector vs vector DB**: pgvector keeps operations simple; vector DBs scale
  better at large data sizes.

---

## 15) Interview Q&A (realistic and detailed)

### Architecture and design
Q: Why separate frontend and backend?
A: Separating the frontend and backend keeps responsibilities clear and secure.
The browser only handles UI and sends requests, while the backend enforces
authentication, authorization, and data rules before touching the database.
This also makes scaling easier because the UI and API can be deployed and
scaled independently, and the contract between them is the API.

Q: Why use background jobs instead of synchronous processing?
A: Synchronous processing would make the user wait while the server downloads
and parses a webpage, which is slow and error-prone. Background jobs let the API
return immediately, so the UI stays responsive while the heavy work happens in
workers. It also lets us retry failures and smooth out spikes in workload with a
queue.

Q: Why choose Next.js App Router?
A: The App Router uses a folder-based structure, so the URL layout matches the
filesystem, which is easy to understand and maintain. It also supports nested
layouts and route-level code splitting, so each page only loads what it needs.
Because Vercel is built for Next.js, deployment and production optimizations are
simple and reliable.

Q: Why choose FastAPI instead of Django?
A: FastAPI is lightweight and focused on APIs, which fits this project well.
Its type hints and automatic request validation reduce bugs and make the API
self-documenting. Django is great for large, full-featured apps, but here we
wanted a smaller, faster framework with fewer built-in opinions.


### Auth and security
Q: Explain JWT validation step-by-step.
A: The backend reads the token from the `Authorization` header and verifies the
signature using the server’s secret key, which proves the token was issued by
this system. It checks the expiration time, extracts the user identifier from
the `sub` field, and loads that user from the database. If any step fails (bad
signature, expired token, or missing user), the request is rejected with 401.


Q: How would you move from localStorage to safer auth?
A: The safest approach is to store tokens in httpOnly cookies so JavaScript
cannot read them, which reduces the risk from XSS. You would also add CSRF
protection (for example, double-submit tokens) and tighten CSP headers to block
inline scripts. This change keeps the same login flow but hardens it against
browser-based attacks.

### Data model
Q: Why use a join table for lists?
A: A join table is the correct relational model for a many-to-many relationship.
Each list can contain many items, and each item can belong to multiple lists.
The join table also lets us store extra fields like when the item was added or
who added it, without duplicating content data.

Q: Why soft delete instead of hard delete?
A: Soft deletes keep a record of what was removed, which allows recovery,
auditing, and future features like “undo.” It also prevents accidental data loss
if a user deletes something by mistake. The tradeoff is that queries must always
filter out deleted rows.

### Search
Q: Why semantic search?
A: Semantic search lets users find content by meaning, which is much closer to
how people remember articles. If a user remembers the concept but not the exact
words, embeddings still return relevant results. This improves the usefulness of
search compared to pure keyword matching.


Q: What are the downsides of embeddings?
A: Embeddings require external API calls, which add cost and latency. They can
also return results that are loosely related rather than exact, which can feel
noisy. Storing vectors increases database size, and similarity queries become
more expensive as the dataset grows.


### Scaling
Q: What breaks first if traffic grows?
A: The extraction pipeline is likely the first bottleneck because each URL
requires multiple network calls and parsing steps. As queue length grows, users
wait longer for content to finish processing. After that, database queries for
search and analytics become slower as data volume increases.

Q: How would you monitor health?
A: You would monitor queue length, task duration, and task failure rates for
background jobs, because those indicate processing health. For the API, you
track request latency, error rates, and database query performance. Alerts
should trigger on spikes in failures, slow response times, or rapidly growing
queues.

### Improvements
Q: What would you harden for production?
A: The top priorities are HTML sanitization (to prevent XSS), SSRF protections
for URL fetching, and shared rate limiting in Redis. I would also add security
headers (CSP, HSTS), better logging, and monitoring so failures are visible
before they affect users.

Q: What is the highest user-impact feature to add?
A: A browser extension has the highest impact because it removes friction from
the core workflow: saving links. If users can save content in one click from
their browser, they will use the product more often and build a larger queue.


---

## 16) Quick summary (30-second version)
Content Queue is a read-it-later app built with Next.js and FastAPI. When a user
saves a URL, the backend stores it immediately and queues background jobs to
extract metadata, full text, and embeddings for semantic search. The frontend
stays responsive with optimistic updates and polling. The system is deployed on
Vercel (frontend) and Railway (backend + workers).
