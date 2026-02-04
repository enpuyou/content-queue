# Signal - A Thinking Partner for Reading

> *Not another read-it-later app. A tool for building understanding.*

---

## Vision

Signal transforms passive content consumption into active thinking. Inspired by Are.na's quiet, intentional design—anti-consumerist, anti-flashy AI slop. We want something quiet and deep.

**Core philosophy:**
- Typography-first, content-focused
- No dark patterns, no engagement metrics
- AI as invisible infrastructure, not a feature
- Tools for thought, not tools for productivity theater

---

## Completed (Foundation)

### ✅ Phase 1: Core MVP
- [x] Authentication (login/register)
- [x] Add content via URL
- [x] Content List View with metadata, filtering, sorting, pagination
- [x] Reading View with clean typography, progress tracking
- [x] Quick Actions (mark read, archive, delete) - hover-reveal icons
- [x] Toast notifications
- [x] Optimistic UI updates
- [x] Rate limiting

### ✅ Phase 2: Organization
- [x] Lists & Collections (CRUD, add content, bulk operations)
- [x] Auto-updating list counts in sidebar
- [x] Semantic search with embeddings
- [x] "Find Similar" feature
- [x] Manual tagging system
- [x] Text search

### ✅ Infrastructure
- [x] Backend: Railway (FastAPI + Celery)
- [x] Frontend: Vercel (Next.js)
- [x] Database: Railway pgvector
- [x] Redis for background jobs

---

## The Signal Roadmap

### Phase A: Highlights & Annotations (Foundation)
**Goal**: Turn reading into active engagement

The most fundamental shift—from consuming to capturing.

#### Backend
- [ ] Create `Highlight` model
  ```
  - id, content_item_id, user_id
  - text (the highlighted text)
  - note (optional annotation)
  - start_offset, end_offset (character positions)
  - color (yellow/green/blue/pink)
  - created_at
  ```
- [ ] CRUD endpoints: POST/GET/PATCH/DELETE `/content/{id}/highlights`
- [ ] Export endpoint: GET `/content/{id}/highlights/export` (Markdown)

#### Frontend
- [ ] Text selection detection in Reader
- [ ] Highlight toolbar on selection (highlight, add note, cancel)
- [ ] Render highlights with colored backgrounds
- [ ] Click highlight to view/edit note
- [ ] Highlights panel (slide-out sidebar)
- [ ] Export highlights button (copy as Markdown)

**Why first**: Everything else builds on this. Claims come from highlights. Signals are patterns across highlights.

---

### Phase B: Claims Extraction
**Goal**: Surface the ideas that matter

#### Backend
- [ ] Create `Claim` model
  ```
  - id, content_item_id, user_id
  - claim_text (the extracted assertion)
  - source_highlight_id (optional - link to evidence)
  - is_verified (user confirmed accuracy)
  - embedding (vector for similarity)
  - created_at
  ```
- [ ] LLM extraction job: POST `/content/{id}/extract-claims`
- [ ] Celery task for background extraction
- [ ] Similarity matching: GET `/claims/similar?text=...`

#### Frontend
- [ ] "Extract Claims" button in reader
- [ ] Claims panel showing extracted assertions
- [ ] Verify/dismiss individual claims
- [ ] Link claims to source highlights
- [ ] "Find contradictions" feature (claims that conflict)

---

### Phase C: Connections & Signals
**Goal**: See patterns across your reading

#### Backend
- [ ] Similarity matching between content items
- [ ] Endpoint: GET `/content/{id}/related` (based on embeddings)
- [ ] Cluster detection for recurring themes

#### Frontend
- [ ] "Related Items" section in reader sidebar
- [ ] Signal cards showing recurring themes
- [ ] Visual connections between related content

---

### Phase D: Workspaces
**Goal**: Focus mode for deep work

#### Backend
- [ ] Create `Workspace` model
  ```
  - id, user_id, name, description
  - theme (research question or topic)
  - created_at, updated_at
  ```
- [ ] Workspace content association (many-to-many)
- [ ] Workspace claims aggregation

#### Frontend
- [ ] Workspace list view
- [ ] Create/edit workspace modal
- [ ] Add content to workspace from reader
- [ ] Workspace detail page with:
  - All associated content
  - Aggregated highlights
  - Extracted claims
  - Related external content suggestions

---

### Phase E: Reflection & Review
**Goal**: Consolidate understanding

#### Backend
- [ ] Weekly digest generation (Celery scheduled task)
- [ ] Endpoint: GET `/reflections/weekly`
- [ ] Store reflection entries

#### Frontend
- [ ] Weekly Review page
- [ ] "What did I learn?" prompts
- [ ] Highlight review (spaced repetition style)
- [ ] Reading stats (quiet, not gamified)

---

### Phase F: Design Polish
**Goal**: The Are.na aesthetic

#### Visual System
- [ ] CSS custom properties for theming
  ```css
  --color-ink: #1a1a1a
  --color-paper: #fafaf8
  --color-highlight-yellow: #fff3cd
  --color-accent: #2563eb
  --font-body: 'Literata', Georgia, serif
  --font-ui: 'Inter', system-ui, sans-serif
  ```
- [ ] Light/Dark/Sepia themes
- [ ] Generous whitespace (space-6 minimum)
- [ ] Subtle animations (150ms, ease-out)

#### Typography
- [ ] Reader font controls (size, family, width)
- [ ] Optimal line length (65-75 chars)
- [ ] Proper vertical rhythm

---

### Phase G: Chrome Extension
**Goal**: Capture from anywhere

- [ ] One-click save to Signal
- [ ] Quick highlight before saving
- [ ] Add to workspace on save
- [ ] Keyboard shortcut (Cmd+Shift+S)

---

## Phase H: Production Polish Sprint (ACTIVE)
**Goal**: Make the app ready for real users — beautiful, functional, and warm.

> Detailed implementation specs in `IMPLEMENTATION_PLAN.md`

### H.1 Warm Microcopy ✏️
- [ ] Replace all "Loading..." → "Finding your articles...", "Preparing your article...", etc.
- [ ] Second person, warm verbs throughout

### H.2 Settings Page + Reading Controls 📐
- [ ] New `ReadingSettingsContext` (persists to localStorage)
- [ ] `/settings` page with controls: theme (light/dark/sepia), font family, font size, content width, line height, letter spacing, bionic reading toggle
- [ ] Sepia theme CSS variables
- [ ] Apply settings globally in Reader
- [ ] Beautiful defaults (serif, medium, comfortable)

### H.3 Focus Mode + Reader Enhancements 🔭
- [ ] Paragraph focus mode (dim non-current paragraphs via IntersectionObserver)
- [ ] Reading progress indicator (top bar + optional circular)
- [ ] Heading hierarchy with anchor links
- [ ] Bionic reading engine (`lib/bionicReading.ts`) — toggled in settings, not reader

### H.4 Mobile Highlight Bottom Sheet 📱
- [ ] Detect mobile → show "Highlight" button BELOW iOS native menu
- [ ] Bottom sheet with: text preview, color picker (large touch targets), note input, save/cancel
- [ ] Backdrop dismissal, slide-up animation, `pb-safe` for notch
- [ ] All `rounded-none` — consistent editorial style

### H.5 Article TLDR (LLM-Generated) 🤖
- [ ] Backend: `tldr` column on ContentItem + Celery task using gpt-4o-mini
- [ ] Chain into extraction pipeline (after full text extraction)
- [ ] Frontend: collapsible "Show TLDR" button in Reader

### H.6 Highlight Distillation 🧬
- [ ] Backend: POST endpoint that synthesizes 3+ highlights via LLM
- [ ] Writes in second person ("You highlighted...", "The key tension you noticed...")
- [ ] Frontend: "Distill My Highlights" button in HighlightsPanel

### H.7 Lists as Projects 📂
- [ ] Backend: `notes` column on List model (Markdown text)
- [ ] Frontend: collapsible project notes textarea with auto-save (debounce 1.5s)
- [ ] Placeholder: "Research question, context, or notes for this project..."

### H.8 PDF Support + Scraper Hardening 📄
- [ ] Backend: PDF upload endpoint + PyMuPDF extraction task
- [ ] Frontend: "Upload PDF" button alongside URL input
- [ ] Twitter/X: Use oembed API for tweet/thread extraction
- [ ] Scraper: User-Agent rotation, fallback chain (trafilatura → newspaper3k → BeautifulSoup)
- [ ] Paywall detection + Googlebot UA fallback for NYTimes/WSJ/etc.

### H.9 Email-to-Save 📧
- [ ] Backend: `email_token` field on User (unique, indexed)
- [ ] Webhook endpoint (`/webhook/email`) for SendGrid/Resend inbound parse
- [ ] Extract URLs from email body, save as content; save full email if no URLs
- [ ] Frontend: Show unique email address in Settings with copy button
- [ ] DNS: MX record pointing to SendGrid/Resend

### H.10 Profile / Reflections Page 📊
- [ ] Backend: `/analytics/activity` endpoint (daily reads, highlights, weekly stats)
- [ ] Frontend: `/profile` page with:
  - Weekly stats cards (articles read, highlights, reading time)
  - GitHub-style heatmap calendar (react-activity-calendar)
  - Subtle accent colors matching theme
- [ ] Add "Profile" link to Navbar

---

## Future Concepts (Research & Brainstorming)

### 1. Novel LLM Features
*Move from "Passive Consumption" to "Active Thinking"*

*   **Socratic Reading Partner**: After reading ~70% of an article, surface thinking prompts — questions that challenge assumptions, connect to past reading, ask "what if the opposite were true?"
*   **Tension Detector**: Find contradictions across articles using embedding similarity on claims. Show: "This conflicts with something you read 2 weeks ago."
*   **Ghost Questions**: "Ask the article" — questions you'd ask the author. Uses article content as context.
*   **Progressive Summarization Assistant**: Help users distill highlights layer by layer (bold key phrases → summarize in own words)
*   **"What Would I Think?" Mode**: Before reading, show how a new article relates to existing highlights/beliefs
*   **Dynamic Knowledge Graph**: Visual graph linking entities across articles
*   **"Counter-Argument" Generator**: "Steel-man" opposing views
*   **Active Learning**: Auto-generated flashcards from highlights (spaced repetition)

### 2. Unique Workflows
*   **The Waiting Room**: Show only 3 articles per day. "47 more are waiting. They'll be here when you're ready."
*   **Reading Rituals**: Morning Pages Mode (coffee timer), Evening Digest (review highlights), Weekly Reflection
*   **Serendipity Mode**: Button that surfaces a random highlight from 6+ months ago
*   **Reading Moods**: Tag articles with emotional intent (🧘 Contemplative, ⚡ Energizing, 🌙 Before Sleep, 🔥 Challenge, 💡 Practical)
*   **Marginalia System**: Show notes in the margin like handwritten annotations in a physical book
*   **Sunday Review**: Weekly curated "issue" from your own backlog
*   **Quiet Mode**: No notification badges or anxiety-inducing counts

### 3. Expanded Inputs
*   **YouTube**: "Read" videos via transcript extraction (yt-dlp already in dependencies)
*   **Podcast Transcripts**: RSS feed → audio → whisper transcription
*   **Book Notes**: Kindle sync / manual chapter structure
*   **Voice Memos**: Recording → transcription → knowledge block
*   **Personal Notes**: Plain text entries (not from URLs)
*   **Newsletter Pipeline**: Auto-forward newsletters → extract → searchable

### 4. Experience Elevators
*   **Real-time Estimates**: Reading time based on actual scroll speed
*   **Progressive Cleanup**: "Hide" finished sections
*   **Audio Mode**: Text-to-speech with highlight-along-as-read
*   **The Thinking Canvas**: Spatially arrange highlights and notes (Kinopio-inspired)
*   **Night Mode**: Auto-switch after sunset

### 5. Profile & Reflections
*   **Year in Reading**: Annual reflection ("142 articles saved, 89 actually read — that's honest, not failure")
*   **Reading DNA**: Topic cluster visualization
*   **Forgotten Gems**: "Articles you saved but never finished. Maybe now's the time?"
*   **Your Words**: Word cloud from your notes/highlights
*   **The Constellation**: Knowledge graph visualization of connected ideas
*   **Input/Output Ratio**: Track "Active Reading" (highlighted) vs passive consumption

### 6. Platform Expansion
*   **Export as Second Brain**: Full export to Obsidian vault, Notion database, Markdown archive
*   **Chrome Extension**: One-click save + quick highlight (Plasmo framework)
*   **PWA / Offline**: Service worker for offline reading, IndexedDB for article storage
*   **Research Projects**: Workspaces with a research question, aggregated highlights, emerging themes

### 7. Design Principles
*   **Quiet, not silent.** Subtle personality, not sterile minimalism.
*   **Slow, not sluggish.** Intentional friction, not broken UX.
*   **Deep, not complex.** Power for those who want it, hidden for those who don't.
*   **Warm, not cold.** Human language, not corporate speak ("I've read this" not "Mark as read").
*   **Yours, not ours.** Your data, your knowledge, exportable always.

---

## Priority Options

### Current Priority: Phase H (Production Polish Sprint)
Execute tasks H.1–H.10 in dependency order. See `IMPLEMENTATION_PLAN.md` for complete specs.

### After Phase H
1. **Phase B: Claims Extraction** — The differentiator. "See what you believe."
2. **Phase C: Connections** — Patterns across reading.
3. **Phase G: Chrome Extension** — Acquisition channel.
4. **Phase D: Workspaces** — Deep research mode.

---

## Technical Notes

### New Backend Models Needed
```python
# models/highlight.py
class Highlight(Base):
    id = Column(UUID)
    content_item_id = Column(UUID, ForeignKey)
    user_id = Column(UUID, ForeignKey)
    text = Column(Text)
    note = Column(Text, nullable=True)
    start_offset = Column(Integer)
    end_offset = Column(Integer)
    color = Column(String, default="yellow")
    created_at = Column(DateTime)

# models/claim.py
class Claim(Base):
    id = Column(UUID)
    content_item_id = Column(UUID, ForeignKey)
    user_id = Column(UUID, ForeignKey)
    claim_text = Column(Text)
    source_highlight_id = Column(UUID, nullable=True)
    is_verified = Column(Boolean, default=False)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime)
```

### Frontend Component Structure
```
components/
├── highlights/
│   ├── HighlightToolbar.tsx
│   ├── HighlightRenderer.tsx
│   └── HighlightsPanel.tsx
├── claims/
│   ├── ClaimCard.tsx
│   ├── ClaimsPanel.tsx
│   └── ExtractClaimsButton.tsx
└── workspaces/
    ├── WorkspaceCard.tsx
    └── WorkspaceDetail.tsx
```

---

## What This Project Demonstrates

1. **Full-stack depth** - React, Next.js, FastAPI, PostgreSQL, Celery
2. **AI/ML integration** - Embeddings, LLM extraction, vector search
3. **Product thinking** - Opinionated design, not feature bloat
4. **System design** - Background jobs, caching, real-time updates
5. **Design sensibility** - Typography, whitespace, intentional UX

---

## Current Status

**Last completed**: Highlights (Phase A ~70%), mobile compatibility fixes, landing UI

**Active sprint**: **Phase H — Production Polish Sprint** (10 tasks, see `IMPLEMENTATION_PLAN.md`)

**Skills being developed**: LLM integration, Celery task chains, PDF processing, email infrastructure, advanced CSS/typography, mobile-first UX, data visualization, web scraping hardening, React context patterns, product design thinking
