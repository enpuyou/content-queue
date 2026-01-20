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

## Priority Options

Based on what's completed and the Signal vision, here are your options:

### Option 1: Highlights First (Recommended)
**Why**: Foundation for everything. Makes the app immediately more useful.
**Scope**: Phase A only (~3-4 sessions)
**Result**: Active reading experience

### Option 2: Full Claims Pipeline
**Why**: The differentiator. "See what you believe."
**Scope**: Phase A + B (~6-8 sessions)
**Result**: Extract and verify ideas from reading

### Option 3: Design Overhaul First
**Why**: Set the visual foundation before adding features.
**Scope**: Phase F (~2-3 sessions)
**Result**: Beautiful, calm interface

### Option 4: Extension + Highlights
**Why**: Two high-impact features that work together.
**Scope**: Phase A + G (~5-6 sessions)
**Result**: Complete capture → engage loop

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

**Last completed**: Sidebar list count auto-updates, hover-reveal actions on content cards

**Recommended next**: **Phase A - Highlights** (the foundation for active reading)
