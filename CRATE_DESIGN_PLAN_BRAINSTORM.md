# sed.i — Crates: A Vinyl Vertical

> *The same philosophy that makes sed.i meaningful for reading — deliberate curation, accumulated understanding, resistance to algorithmic flattening — applies even more naturally to vinyl. Nobody who collects records is optimizing for speed.*

---

## The Thesis

Vinyl collectors already think the way sed.i wants readers to think. They're deliberate. They dig. They develop taste over years, not minutes. They have obsessions that recur — a label, an era, a pressing plant, a producer. They remember *where* they found something and *why* it mattered.

No existing tool honors this. Discogs is a database and a marketplace. Waxlog is a 3D shelf visualizer. Spotify is a feed. None of them ask: *what does your collection say about you? What patterns are you building? What are you circling back to?*

**Crates** is the vinyl vertical of sed.i. Same infrastructure. Same signal-capture philosophy. Different medium.

---

## What Makes This Not Generic

This isn't "add music to your reading app." This is built for people who:

- Know the difference between a Japanese OBI pressing and a US first press
- Have opinions about specific mastering engineers (Sterling Sound vs. Bernie Grundman)
- Organize by label, not genre
- Have a wantlist that's more curated than their collection
- Think of crate digging as a practice, not a shopping trip
- Can tell you the story behind how they found a particular record

**The niche is deep vinyl heads who treat collecting as a form of thinking** — the same way sed.i treats reading as a form of thinking.

---

## Core Concepts

### The Crate (not "playlist")

A Crate in sed.i is the equivalent of a Workspace. It's not a playlist — playlists are for listening. A Crate is for *thinking about music together*.

Examples of real crates a collector might build:
- "Spiritual Jazz — the lineage from Coltrane to Kamasi"
- "Everything Madlib touched in 2004"
- "Records I found at Dusty Groove that one trip"
- "Blue Note 1500 series — the ones I actually own"
- "Samples from Endtroducing"
- "My dad's collection — the ones worth keeping"

A Crate can hold records from your collection, your wantlist, or neither (records you're just thinking about). It has notes. It accumulates. It's not meant to be "finished."

### The Signal (applied to music)

In reading, a signal is a moment of recognition — a highlighted passage, a note, a claim extracted. In vinyl:

- **A dig note**: "Found this at Easy Street for $3, the sleeve is beat but the wax is pristine"
- **A pressing observation**: "The RVG stamp in the dead wax — this is the real one"
- **A connection**: "This bassline is literally the same phrase as [other record]"
- **A listening note**: "Side B opener hits completely different at 2am"
- **A provenance note**: "Inherited from uncle's collection, he saw them live at Fillmore"

These are the vinyl equivalent of highlights + annotations. They accumulate on a record over time. They're *yours*.

### Obsession Detection (already in the roadmap)

This already exists in sed.i's planned feature set. For vinyl, it surfaces things like:
- "You've added 8 records on Prestige in the last 3 months"
- "You keep coming back to late-70s Japanese jazz fusion"
- "3 records in your wantlist share the same session musician"

---

## User Flows

### Flow 1: Adding a Record

**Via Discogs URL (primary)**
```
User pastes: https://www.discogs.com/release/3227456
→ Backend extracts release ID from URL
→ Discogs API returns: artist, title, label, year, format, tracklist,
  genre/style, catalog number, images, credits, marketplace stats
→ Record saved with full metadata
→ User can add to collection, wantlist, or just "library" (thinking about it)
→ Optional: add a dig note ("where I found this", condition, price paid)
```

**Via Discogs collection sync (secondary)**
```
User connects Discogs account via OAuth
→ Import existing collection + wantlist
→ Each record gets a sed.i entry with Discogs metadata
→ User can enrich with notes, crate assignments over time
```

**Via search (tertiary)**
```
User searches "Miles Davis Kind of Blue"
→ Discogs search API returns releases
→ User picks the specific pressing they own/want
→ Important: pressing specificity matters to collectors
```

### Flow 2: Browsing Your Collection

The collection view is NOT a grid of album covers. That's what every app does. Instead:

**Default view: The Shelf**
- Records displayed as spines — vertical, like they'd sit in a shelf or crate
- Spine shows: artist, title, label, year
- Hover/click reveals the cover art
- Sorted by however YOU sort your physical records (label? alphabetical? genre? chronological acquisition?)

**Alternative view: The Table**
- For the data-minded collector
- Columns: Artist, Title, Label, Cat#, Year, Format, Condition, Date Added
- Sortable, filterable
- Feels like a record store inventory system, not a social media grid

**Alternative view: Covers**
- Simple grid of album art for visual browsing
- But restrained — no infinite scroll, shows page count

### Flow 3: Playing / Listening

Here's where YouTube integration comes in — but it's deliberately minimal.

**The idea:** When viewing a record, you can listen to it. Not through Spotify (algorithmic, ephemeral). Through YouTube — where full albums often exist, uploaded by labels or enthusiasts.

**Implementation:**
- Backend searches YouTube Data API for "[Artist] [Album] full album" or specific tracks
- Stores matched YouTube video IDs per record
- User can manually correct/override the match
- Embedded player uses `youtube-nocookie.com` for privacy-enhanced mode
- Player is small, quiet, tucked at the bottom of the record view — not the centerpiece

**On ads:** Embedded YouTube videos *can* still show ads — this depends on the uploader's monetization settings, not on your embed method. The `youtube-nocookie.com` domain prevents *tracking cookies* but doesn't guarantee ad-free playback. Be upfront about this. The experience will still be cleaner than YouTube itself because there's no recommendation sidebar, no autoplay, no algorithmic next-up.

**The Crate Player:**
When a Crate has records with matched YouTube videos, you can "play the crate" — it queues up the records in order. This is the closest thing to a playlist, but it's tied to a crate (a thinking container), not a listening queue.

### Flow 4: Weekly Reflection (adapted for vinyl)

Already planned for reading. For vinyl:

> *"This week you added 3 records to your collection. Two of them are on CTI Records — you've been gravitating toward Creed Taylor's productions lately. Your wantlist grew by 5, mostly 70s Brazilian pressings. The record you've had the longest without writing any notes about is [X] — anything to say about it?"*

Not gamification. Not stats. A quiet mirror.

---

## Data Architecture

### New Model: `VinylRecord`

```
VinylRecord
├── id (UUID)
├── user_id (FK → Users)
├── discogs_release_id (integer, from Discogs)
├── discogs_master_id (integer, nullable — groups pressings)
│
├── # Core metadata (from Discogs)
├── artist (text)
├── title (text)
├── label (text)
├── catalog_number (text)        — e.g. "BLP 4003"
├── year (integer)
├── country (text)
├── format_description (text)    — e.g. "LP, Album, Stereo, Gatefold"
├── genres (ARRAY[text])
├── styles (ARRAY[text])
├── tracklist (JSONB)            — [{position, title, duration}]
├── credits (JSONB)              — [{name, role}]
├── cover_image_url (text)
├── thumb_image_url (text)
│
├── # User-specific
├── status (enum)                — 'collection', 'wantlist', 'library'
├── condition_media (text)       — Goldmine grading: M, NM, VG+, VG, G+, G, F, P
├── condition_sleeve (text)      — same scale
├── price_paid (decimal, nullable)
├── purchase_location (text)     — "Easy Street Records, Seattle"
├── purchase_date (date)
├── notes (text)                 — general dig notes
│
├── # Playback
├── youtube_video_ids (ARRAY[text])  — matched YouTube videos
├── youtube_match_status (enum)      — 'auto', 'manual', 'none'
│
├── # AI/embeddings
├── embedding (Vector(1536))     — from combined metadata + notes
│
├── created_at, updated_at, deleted_at
```

### New Model: `Crate`

```
Crate
├── id (UUID)
├── user_id (FK → Users)
├── name (text)
├── description (text)
├── notes (text)                 — evolving notes about this crate
├── is_ordered (boolean)         — does order matter?
├── created_at, updated_at
```

### Join: `CrateRecord`

```
CrateRecord
├── crate_id (FK)
├── vinyl_record_id (FK)
├── position (integer)           — order within crate
├── note (text)                  — why this record is in this crate
├── added_at
```

### New Model: `VinylSignal`

```
VinylSignal
├── id (UUID)
├── vinyl_record_id (FK)
├── user_id (FK)
├── signal_type (enum)           — 'dig_note', 'pressing_observation',
│                                   'connection', 'listening_note', 'provenance'
├── content (text)
├── connected_record_id (FK, nullable) — for cross-record connections
├── created_at
```

### Reuse from existing architecture:
- User auth (already built)
- Embedding generation via OpenAI (already built — adapt for vinyl metadata)
- Semantic search via pgvector (already built)
- Background processing via Celery (already built — use for Discogs/YouTube API calls)
- Redis caching (already built)

---

## API Design

### Discogs Integration

```
POST   /vinyl/import/discogs-url     — paste a Discogs URL, create record
POST   /vinyl/import/discogs-sync    — OAuth sync collection + wantlist
GET    /vinyl/search/discogs         — proxy search to Discogs API

# Rate limits: 60 req/min authenticated.
# Cache aggressively — release metadata doesn't change.
# Store Discogs data locally after first fetch.
```

### Collection

```
GET    /vinyl                        — list user's records (filterable, sortable)
GET    /vinyl/:id                    — single record with signals + crates
PATCH  /vinyl/:id                    — update user fields (condition, notes, status)
DELETE /vinyl/:id                    — soft delete
```

### Crates

```
POST   /crates                       — create crate
GET    /crates                       — list crates
GET    /crates/:id                   — crate detail with records
PATCH  /crates/:id                   — update crate metadata
POST   /crates/:id/records           — add records to crate
DELETE /crates/:id/records/:rid      — remove record from crate
PATCH  /crates/:id/reorder           — reorder records
```

### YouTube Matching

```
POST   /vinyl/:id/youtube/match      — trigger auto-match via YouTube API
PATCH  /vinyl/:id/youtube             — manually set/override video IDs
GET    /vinyl/:id/youtube             — get matched videos for playback
```

### Signals

```
POST   /vinyl/:id/signals            — add a signal
GET    /vinyl/:id/signals            — signals for a record
GET    /signals                      — all signals (for cross-record patterns)
```

---

## Design Language: Retro-Modern

The vinyl vertical should feel related to sed.i's reading interface but with its own warmth. Think: **the inside of a really good record store meets Swiss typography meets 1970s label design.**

### Typography

- **Display / Record titles**: A serif with character — not Garamond (too classical), not the existing EB Garamond. Something with more warmth. Consider:
  - **Playfair Display** — high contrast, editorial, works at large sizes for album titles
  - **Fraunces** — a "wonky" old-style serif, has a hand-crafted quality, Google Font
  - **Instrument Serif** — elegant but not stuffy, contemporary warmth
- **UI / metadata**: Keep Inter or the existing sans — continuity with the reading side
- **Monospace for catalog numbers and technical data**: JetBrains Mono or IBM Plex Mono (already in the sed.i design spec) — catalog numbers like `BLP 4003` or `CTI 6001` should feel like they're stamped

### Color

Extend the existing palette with vinyl-specific warmth:

```css
/* Vinyl-specific additions to existing sed.i palette */

/* Light mode */
--color-vinyl-warm:     #2C2416;    /* Dark brown-black, like old vinyl */
--color-vinyl-groove:   #3D3429;    /* Warm dark, dead wax color */
--color-label-red:      #C4453C;    /* Classic label red (think: Columbia 6-eye) */
--color-label-blue:     #2B4C7E;    /* Blue Note blue */
--color-sleeve-cream:   #F5F0E8;    /* Aged sleeve paper */
--color-wax-black:      #1A1714;    /* Record surface */

/* Keep the accent blue from sed.i for interactive elements */
/* The warmth comes from backgrounds and text, not from the UI chrome */
```

The page background shifts subtly warmer in Crates — like the difference between a bookshop and a record store. Same calm, slightly different temperature.

### Layout Principles

**The Shelf View** (signature interaction):
```
┌─────────────────────────────────────────────────┐
│                                                   │
│  ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃    │
│  ┃K┃ ┃M┃ ┃C┃ ┃A┃ ┃B┃ ┃S┃ ┃D┃ ┃T┃ ┃M┃ ┃J┃    │
│  ┃i┃ ┃i┃ ┃o┃ ┃l┃ ┃l┃ ┃o┃ ┃e┃ ┃h┃ ┃a┃ ┃o┃    │
│  ┃n┃ ┃l┃ ┃l┃ ┃i┃ ┃u┃ ┃n┃ ┃x┃ ┃e┃ ┃r┃ ┃h┃    │
│  ┃d┃ ┃e┃ ┃t┃ ┃c┃ ┃e┃ ┃i┃ ┃t┃ ┃l┃ ┃v┃ ┃n┃    │
│  ┃ ┃ ┃s┃ ┃r┃ ┃e┃ ┃ ┃ ┃c┃ ┃e┃ ┃o┃ ┃i┃ ┃ ┃    │
│  ┃o┃ ┃ ┃ ┃a┃ ┃ ┃ ┃N┃ ┃ ┃ ┃r┃ ┃n┃ ┃n┃ ┃C┃    │
│  ┃f┃ ┃D┃ ┃n┃ ┃i┃ ┃o┃ ┃Y┃ ┃i┃ ┃i┃ ┃ ┃ ┃o┃    │
│  ┃ ┃ ┃a┃ ┃e┃ ┃n┃ ┃t┃ ┃o┃ ┃t┃ ┃c┃ ┃G┃ ┃l┃    │
│  ┃B┃ ┃v┃ ┃ ┃ ┃ ┃ ┃e┃ ┃u┃ ┃y┃ ┃s┃ ┃a┃ ┃t┃    │
│  ┃l┃ ┃i┃ ┃ ┃ ┃C┃ ┃ ┃ ┃t┃ ┃ ┃ ┃ ┃ ┃y┃ ┃r┃    │
│  ┃u┃ ┃s┃ ┃ ┃ ┃h┃ ┃ ┃ ┃h┃ ┃ ┃ ┃ ┃ ┃e┃ ┃a┃    │
│  ┃e┃ ┃ ┃ ┃ ┃ ┃a┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃n┃    │
│  ┃ ┃ ┃ ┃ ┃ ┃ ┃i┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃e┃    │
│  ┃ ┃ ┃ ┃ ┃ ┃ ┃n┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┃    │
│  ┗━┛ ┗━┛ ┗━┛ ┗━┛ ┗━┛ ┗━┛ ┗━┛ ┗━┛ ┗━┛ ┗━┛    │
│                                                   │
│  ← previous                          next →       │
│                                                   │
└─────────────────────────────────────────────────┘
```

Records as spines. Pull one out (click) and it expands to show the cover, metadata, your notes, your signals. This is the **signature interaction** — it should feel like thumbing through a crate.

**Record Detail View:**
```
┌──────────────────────────────────────────────────┐
│                                                    │
│  ┌──────────┐                                      │
│  │          │   Miles Davis                        │
│  │  [cover  │   Kind of Blue                       │
│  │   art]   │                                      │
│  │          │   Columbia · CS 8163 · 1959 · US     │
│  │          │   LP, Album, Stereo                  │
│  └──────────┘   Condition: VG+ / VG               │
│                                                    │
│  ─────────────────────────────────────────         │
│                                                    │
│  TRACKLIST                          ▶ Play Album   │
│                                                    │
│  A1  So What .......................... 9:22       │
│  A2  Freddie Freeloader ............... 9:46       │
│  A3  Blue in Green .................... 5:37       │
│  B1  All Blues ........................ 11:33      │
│  B2  Flamenco Sketches ............... 9:26       │
│                                                    │
│  ─────────────────────────────────────────         │
│                                                    │
│  CREDITS                                           │
│  Miles Davis — trumpet                             │
│  John Coltrane — tenor saxophone                   │
│  Cannonball Adderley — alto saxophone              │
│  Bill Evans — piano                                │
│  ...                                               │
│                                                    │
│  ─────────────────────────────────────────         │
│                                                    │
│  YOUR SIGNALS                          + add       │
│                                                    │
│  🔖 dig note · Nov 2024                           │
│  "Found this at Everyday Music on Capitol Hill.    │
│   $18 — sleeve has ring wear but wax plays clean.  │
│   The 2-eye Columbia label, not the 6-eye."        │
│                                                    │
│  🔗 connection · Dec 2024                          │
│  "Bill Evans' playing here directly leads to       │
│   'Explorations' — need to find a clean copy."     │
│   → linked to: Bill Evans — Explorations           │
│                                                    │
│  ─────────────────────────────────────────         │
│                                                    │
│  IN CRATES                                         │
│  ◦ Jazz Essentials — the canon                     │
│  ◦ Records that changed how I hear music           │
│                                                    │
└──────────────────────────────────────────────────┘
```

### Retro Touches (subtle, not cosplay)

The retro feel comes from *materiality cues*, not from slapping a vintage filter on everything:

- **Catalog numbers in monospace** — `CS 8163` should look like it's printed on a spine sticker
- **Goldmine grading displayed as abbreviations** — `M / NM / VG+ / VG / G+ / G / F / P` — the way collectors actually talk
- **Subtle paper texture** on the background — barely perceptible, warmer than the reading side
- **Thin rule lines** separating sections — like the lines on a record store price tag
- **No rounded corners on album art** — square, like the actual sleeve
- **Slightly narrower, denser type** for tracklists — like liner notes
- **Side A / Side B** designation in the tracklist — honor the format

What we do NOT do:
- No skeuomorphic turntable animations
- No "vinyl spinning" loading states
- No fake grooves or record textures
- No "now playing" bars with waveforms
- No retro color filters on album art
- No pixel art or 8-bit anything

The retro feeling is in the *information design*, not in decorative elements.

---

## YouTube Integration: Details

### Matching Strategy

```python
# Priority order for YouTube matching:
# 1. "[Artist] [Album Title] full album" — often uploaded by labels
# 2. "[Artist] [Album Title] [Label]" — more specific
# 3. Individual tracks: "[Artist] [Track Title]"

# YouTube Data API v3 search endpoint
# GET https://www.googleapis.com/youtube/v3/search
# ?part=snippet
# &q=Miles+Davis+Kind+of+Blue+full+album
# &type=video
# &videoDuration=long  (for full albums)
# &maxResults=5

# Store multiple candidates, let user pick/override
# Cache aggressively — album YouTube matches rarely change
```

### Playback UX

- Player lives at the bottom of the Record Detail view
- Uses `youtube-nocookie.com` embed for privacy
- Minimal controls: play/pause, progress, volume
- No recommendations, no related videos (`rel=0`)
- When playing a Crate, shows a simple queue: current record highlighted, next record visible
- Player does NOT persist across page navigation — this is intentional. It's not a music player. It's a listening tool for a specific record or crate.

### Honest Limitations

Be transparent in the UI:
- "Playback via YouTube — availability depends on uploads"
- Some records won't have YouTube matches. That's fine. This isn't a streaming service.
- Some matches will be wrong. Manual override is always available.
- Ads may appear on embedded videos. This is YouTube's decision, not ours.

---

## What This Enables for sed.i as a Whole

### Cross-medium connections

The most powerful future feature: connections between what you *read* and what you *listen to*.

- "You saved an article about spiritual jazz last month. You've added 4 records in that style since."
- "Your reading about Harlem Renaissance literature and your collection of 1960s jazz from the same era — there's a pattern here."
- "You highlighted a passage about minimalism in architecture. You also collect Steve Reich pressings."

This is the cognitive infrastructure thesis in action. sed.i doesn't just store things — it notices patterns across the things you care about, regardless of medium.

### The content type abstraction

To support this properly, the backend should eventually have:

```
ContentItem (abstract)
├── ArticleItem (reading)
├── VinylItem (music)
├── [future: FilmItem, PodcastItem, etc.]

Signal (abstract)
├── ReadingSignal (highlight, claim, note)
├── VinylSignal (dig note, pressing observation, connection)

Workspace / Crate (abstract container)
├── Can hold any content type
├── Cross-medium crates: "Japanese aesthetics" holding articles + records
```

This isn't needed for v1 of Crates. But designing with this in mind means the architecture doesn't fight you later.

---

## What To Build When

### If you build this after the fair (recommended):

**Phase 1: Core collection (2-3 sessions)**
- VinylRecord model + API
- Discogs URL import (paste URL → record saved)
- Collection view (table view first, shelf view as polish)
- Basic filtering/sorting

**Phase 2: Signals + Crates (2-3 sessions)**
- VinylSignal model + API
- Crate model + API
- Record detail view with signals
- Crate management UI

**Phase 3: YouTube + playback (2 sessions)**
- YouTube matching (background job)
- Embedded player on record detail
- Crate player

**Phase 4: The magic (2-3 sessions)**
- Embeddings for vinyl metadata
- Semantic search across collection
- "Similar records" detection
- Cross-medium connections (articles ↔ records)
- Weekly reflection adapted for vinyl

**Phase 5: Design polish (1-2 sessions)**
- Shelf view (the signature interaction)
- Typography refinements
- The warm paper texture
- Responsive / mobile

---

## The Name

**Crates.**

Within sed.i, the vinyl section is just called Crates. No explanation needed. If you know, you know.

The sidebar navigation:
```
sed.i
├── Library          ← reading
├── Crates           ← vinyl
├── Workspaces       ← cross-medium thinking
├── Signals          ← everything you've noticed
```

Or maybe the top-level is even simpler — just two modes, like flipping a record:

```
Reading  |  Listening
```

---

## Summary

This works because:

1. **It's philosophically native** — vinyl collecting IS deliberate curation. You don't need to convince collectors to slow down.
2. **The infrastructure already exists** — embeddings, semantic search, signals, background processing. It's a new content type, not a new app.
3. **Discogs API is solid** — free, well-documented, has everything you need. 60 req/min is generous.
4. **YouTube is good enough** — not perfect, but sufficient for "I want to listen to this record I'm thinking about." No licensing deals needed.
5. **It's genuinely niche** — no one is building a vinyl *thinking tool*. They're building catalogs, marketplaces, and visualizers. This is different.
6. **It comes from you** — you ran a record store. This isn't a feature spec. It's lived experience turned into software.

The question isn't whether this should exist. It's when you build it.

---

## Design Decision: Album Art Grid (not Shelf View)

**Date:** Feb 2025

After prototyping the shelf/spine view, vertical text at screen distances is not readable enough. The signature view is now an **album art grid** — square cover images in a responsive CSS grid.

**Layout:** `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))` — 2 cols mobile, 4-5 desktop.

**Card structure:**
- Square cover image (from Discogs `cover_image_url`, placeholder initials if missing)
- Artist name: uppercase sans, 10px, muted
- Album title: serif, 13px, primary
- Metadata line: monospace, 9px, faint — `Label · Cat# · Year`
- `WANTLIST` badge overlay (top-left of cover) for wantlist items
- Accent-color signal dot (bottom-right of cover) when record has signals/notes

**Detail view:** Click card → overlay panel (not a new page for MVP). Shows cover art, full metadata, tracklist with Side A/B, condition, signals section.

**Design ethos stays the same:** No rounded corners on covers. Monospace for catalog numbers. Thin rule lines. Retro feel comes from information design, not decoration. Uses existing sed.i color variables — no separate vinyl palette for v1.

See `shelf-mockup.html` for the interactive mockup.

---

## Design Feedback (Feb 2025 — Post-Backend)

### Detail Page: Gatefold Vinyl Feel
- The original detail overlay felt retro and good — keep that direction
- Improve it: should feel like **opening/unfolding a vinyl gatefold**
- Layout: cover art on one side, details on the other (two-panel spread)
- Think "gatefold sleeve opened flat on a table" — picture left, info right
- NOT a modal or card — it should feel physical and intentional

### Grid: Square Covers + Hover Info
- Grid should use **square aspect-ratio** cards (just the cover, no text below)
- On hover: overlay the record info (artist, title, year) on top of the cover
- This makes the grid cleaner and more visual
- Navbar button for Crates must stay consistent with existing Queue/Lists/Settings style
- Current look is "a good start" but needs more personality — defer deep aesthetic work

### Aesthetic Direction (Future Polish)
- Current mockup is not yet "impressive" or "never seen before"
- Needs to feel modern AND retro simultaneously — not achieved yet
- Will revisit design language after MVP functionality is in place
- are.na grid inspiration is the right direction but needs more unique identity

### Workflow Rule
- After each multi-file task: show diffs, let user review and approve before continuing

---

## Implementation Plan (Haiku-Ready Task Breakdown)

Each task below is scoped for a single focused session. Tasks reference specific files and patterns to follow so any model (including Haiku) can pick them up.

### Feature Toggle

**Task 0: Add SHOW_CRATES feature flag**
- File: `frontend/lib/flags.ts`
- Add: `export const SHOW_CRATES = process.env.NEXT_PUBLIC_SHOW_CRATES !== "false";`
- File: `frontend/components/Navbar.tsx`
- Wrap new Crates nav button in `{SHOW_CRATES && (...)}`
- Follow exact same pattern as existing Queue/Lists/Settings buttons
- Both desktop nav-buttons section (~line 73-104) and mobile menu section (~line 157-196)
- Add: `const isCratesActive = pathname === "/crates" || pathname.startsWith("/crates/");`

---

### Phase 1: Backend — Model + Migration + API

**Task 1: VinylRecord SQLAlchemy model**
- File: `content-queue-backend/app/models/vinyl.py` (new)
- Pattern: Follow `app/models/content.py` exactly
- Import `Base` from `app.core.database`
- Columns:
  - `id` (UUID, primary key, default uuid4)
  - `user_id` (UUID, ForeignKey → users.id, not null)
  - `discogs_release_id` (Integer, nullable)
  - `discogs_master_id` (Integer, nullable)
  - `artist` (String, not null)
  - `title` (String, not null)
  - `label` (String, nullable)
  - `catalog_number` (String, nullable)
  - `year` (Integer, nullable)
  - `country` (String, nullable)
  - `format_description` (String, nullable)
  - `genres` (ARRAY(String), nullable)
  - `styles` (ARRAY(String), nullable)
  - `tracklist` (JSON, nullable) — `[{position, title, duration}]`
  - `credits` (JSON, nullable) — `[{name, role}]`
  - `cover_image_url` (String, nullable)
  - `thumb_image_url` (String, nullable)
  - `status` (String, default "collection") — `collection`, `wantlist`, `library`
  - `condition_media` (String, nullable) — Goldmine grading
  - `condition_sleeve` (String, nullable)
  - `notes` (Text, nullable)
  - `created_at`, `updated_at`, `deleted_at` (DateTime, following content.py pattern)
- Add model import to `app/models/__init__.py`

**Task 2: Alembic migration for vinyl_records table**
- File: `content-queue-backend/alembic/versions/004_add_vinyl_records.py` (new)
- Pattern: Follow `001_add_auto_tags_column.py`
- `down_revision` should reference the latest existing migration
- Creates `vinyl_records` table with all columns from Task 1
- Index on `user_id` and `discogs_release_id`

**Task 3: Pydantic schemas for vinyl**
- File: `content-queue-backend/app/schemas/vinyl.py` (new)
- Pattern: Follow `app/schemas/content.py`
- `VinylRecordCreate` — fields: `discogs_url: str` (primary input)
- `VinylRecordUpdate` — optional fields: status, condition_media, condition_sleeve, notes
- `VinylRecordResponse` — all fields, `model_config = ConfigDict(from_attributes=True)`
- `VinylRecordList` — items list + total + skip + limit

**Task 4: Vinyl API endpoints**
- File: `content-queue-backend/app/api/vinyl.py` (new)
- Pattern: Follow `app/api/content.py` exactly
- `router = APIRouter(prefix="/vinyl", tags=["vinyl"])`
- Endpoints:
  - `GET /vinyl` — list user's records (filterable by status, sortable by created_at/year/artist)
  - `GET /vinyl/{id}` — single record
  - `POST /vinyl` — create from Discogs URL (triggers Celery task for metadata fetch)
  - `PATCH /vinyl/{id}` — update user fields (status, condition, notes)
  - `DELETE /vinyl/{id}` — soft delete (set deleted_at)
- Auth: `current_user: User = Depends(get_current_active_user)`
- Register router in `app/main.py`: `app.include_router(vinyl.router)`

**Task 5: Discogs metadata extraction Celery task**
- File: `content-queue-backend/app/tasks/discogs.py` (new)
- Pattern: Follow `app/tasks/extraction.py` (DatabaseTask base class)
- Function: `fetch_discogs_metadata(vinyl_record_id: str)`
  - Parse Discogs release ID from URL (regex: `/release/(\d+)`)
  - Call Discogs API: `GET https://api.discogs.com/releases/{id}`
  - Headers: `User-Agent: sed.i/1.0` (Discogs requires this)
  - Auth: Discogs personal access token from env `DISCOGS_TOKEN`
  - Map response fields to VinylRecord columns
  - Save `cover_image_url` from `images[0].uri` (type "primary")
  - Save `thumb_image_url` from `images[0].uri150`
- Register task import in `app/core/celery_app.py`

---

### Phase 2: Frontend — Crates Page + Grid

**Task 6: Crates page skeleton**
- File: `frontend/app/crates/page.tsx` (new)
- Pattern: Follow `frontend/app/dashboard/page.tsx` and `DashboardClient.tsx`
- "use client" component with Navbar
- State: `records[]`, `loading`, `filter` (all/collection/wantlist)
- Fetch from `GET /vinyl?status={filter}` on mount
- Layout: `max-width: 900px; margin: 0 auto` (same as dashboard)

**Task 7: Vinyl API client functions**
- File: `frontend/lib/api.ts` — add `vinylAPI` object
- Pattern: Follow existing `contentAPI` object in same file
- Functions: `list(params)`, `get(id)`, `create(discogsUrl)`, `update(id, data)`, `delete(id)`
- All use `fetchWithAuth` helper that already exists

**Task 8: AddRecordForm component**
- File: `frontend/components/AddRecordForm.tsx` (new)
- Pattern: Follow `frontend/components/AddContentForm.tsx`
- Single URL input + Add button
- Placeholder: "Paste a Discogs URL to add a record..."
- On submit: call `vinylAPI.create(url)`, show toast, refresh list
- Same styling as AddContentForm (border, font-size, padding)

**Task 9: VinylCard component (album grid card)**
- File: `frontend/components/VinylCard.tsx` (new)
- Props: `record: VinylRecord`, `onClick: (id) => void`
- Structure (matching mockup):
  - Square cover: `aspect-ratio: 1`, border, cover_image_url or initials placeholder
  - Wantlist badge: top-left monospace uppercase if status === "wantlist"
  - Signal dot: bottom-right accent circle (future — skip for v1)
  - Below cover: artist (uppercase sans 10px), title (serif 13px), meta (mono 9px)
- Hover: `translateY(-3px)`, border → accent color

**Task 10: RecordDetail overlay component**
- File: `frontend/components/RecordDetail.tsx` (new)
- Props: `record: VinylRecord | null`, `isOpen: boolean`, `onClose: () => void`
- Fixed overlay with backdrop click to close
- Shows: cover art, artist, title, label/cat#/year/country, format, condition
- Tracklist section with Side A/B grouping (from record.tracklist JSON)
- Notes/signals section (just record.notes for v1)
- Delete button, status toggle (collection ↔ wantlist)

---

### Phase 3: Polish + Signals (defer)

These are post-MVP and intentionally not broken down yet:
- VinylSignal model + API (dig notes, pressing observations, connections)
- Signal UI in RecordDetail
- YouTube matching + embedded player
- Embeddings + semantic search
- Cross-medium connections

---

## Implemented Features (Feb 2025)

### Phase 1 Complete
- VinylRecord model + Discogs URL import + Celery background fetch
- Album art grid with responsive columns (2 mobile → 6 desktop)
- Gatefold detail overlay (cover left, info right, smooth open/close)
- Status filter (All / Collection / Wantlist / Library)
- Sort options (Recently Added / Artist / Year)
- Polling for pending records (auto-refresh every 3s)
- Keyboard: Escape to close detail panel

### Phase 1.5 — Complete

- **Search within crates** — client-side filter across artist, title, label, genres, styles, tags
- **Manual cover image update** — hover cover → "edit cover" → paste URL overlay
- **Genre/style display** — genres (solid border) + styles (dashed border) shown in detail panel, styles editable via comma-separated input
- **YouTube video links** — pulled from Discogs API `videos` field (deduplicated), user can add/remove manually
- **Discogs styles already pulled** — `styles` (house, techno, ambient) are children of `genres` (Electronic, Dance)

### Phase 1.6 — Complete

- **Hover label/year/catno sticker** — on card hover, a mono strip slides up from the bottom showing `Label · CAT-001 · 1994`
- **Catalog number from Discogs** — pulls `labels[0].catno` during metadata fetch, new `catalog_number` column
- **Dominant color accent** — extracts dominant color from cover art via client-side canvas, shows as 2px top border on each card
- **"Now Digging" bar** — below controls, shows last-clicked record with tiny cover + artist/title. Persists in localStorage across refreshes
- **Grid density toggle** — two modes: loose (current, captions visible) and tight (more columns, covers only, minimal gaps)
- **Alphabet dividers** — when sorted by artist, thin horizontal rules with a single letter separate artist groups (A, B, C...)
- **Keyboard shortcuts** — `?` shows overlay, `/` focuses search, `1/2/3` sort, `d` toggles density, `Esc` closes
- **Infinite scroll pagination** — shows 18 records initially (~3 rows), loads 18 more on scroll via IntersectionObserver
- **YouTube queue player** — persistent audio player in navbar using YouTube IFrame API. Hidden iframe, `PlayerContext` wrapping the app, play/pause/prev/next controls. "Play all" and per-track "+Q" buttons in RecordDetail. Queue persists across page navigation

---

## Potential Features (Backlog)

Ranked by estimated impact vs effort:

### High Return — Near Term
1. **Discogs collection import** — OAuth connect → bulk import existing collection + wantlist. Would dramatically reduce onboarding friction. Requires Discogs OAuth setup.
2. **Dig Notes / VinylSignal** — Typed notes per record (dig note, pressing observation, listening note, provenance). The core differentiator from Discogs. Needs VinylSignal model + API + UI section in detail panel.
3. **Crate containers** — Named collections that hold records (like playlists but for thinking). "Everything Madlib touched", "Records from that Tokyo trip", etc.
4. **Embedded YouTube player** — Instead of just links, embed a player at bottom of detail panel. Use `youtube-nocookie.com` for privacy. Minimal: play/pause, no recommendations.

### Medium Return — Medium Term
5. **Stats bar** — "47 records · 12 labels · spanning 1958–2024" at top of collection. Light analytics without gamification.
6. **Random pick / "Dig"** — "What should I listen to?" button that picks a random record from collection. Simple but delightful.
7. **Genre chip filtering** — clickable genre/style chips in the controls bar. Click "House" → filter to only house records.
8. **Drag to rate** — star rating in detail panel, maybe drag interaction or simple 1-5 click.
9. **Shelf/spine view** — the original vision: records as vertical spines. Revisit when collection sizes are larger.
10. **Table view** — sortable data table for the data-minded collector. Columns: Artist, Title, Label, Year, Status, Date Added.

### Lower Priority — Future
11. **Discogs marketplace stats** — lowest price, median price for your pressing. Interesting but not core.
12. **Share a record** — generate a shareable link/card for a specific record with your notes.
13. **Weekly vinyl reflection** — "This week you added 3 records, two from CTI Records..."
14. **Cross-medium connections** — link articles ↔ records ("you read about spiritual jazz and own 4 records in that style")
15. **Embeddings + semantic search** — "records similar to Kind of Blue" using pgvector
16. **Condition grading** — Goldmine scale (M/NM/VG+/VG/G+/G/F/P) for media + sleeve

### Layout Ideas
- Current header (title + input) is left-aligned at grid edge with record count
- Input bar is `max-w-md` — wide enough to paste URLs, not overwhelming
- Controls bar: filters left, search + sort right
- Search: expandable input (`w-24` → `w-40` on focus), prefixed with `/`
- Cards: no hover lift (felt cheap), subtle opacity shift on cover image instead
- Caption below card: tighter spacing (`mt-1`, `mt-px` between artist/title)

---

## TypeScript Types

Add to `frontend/types/index.ts`:

```typescript
export interface VinylRecord {
  id: string;
  user_id: string;
  discogs_release_id: number | null;
  artist: string;
  title: string;
  label: string | null;
  catalog_number: string | null;
  year: number | null;
  country: string | null;
  format_description: string | null;
  genres: string[] | null;
  styles: string[] | null;
  tracklist: Array<{ position: string; title: string; duration: string }> | null;
  credits: Array<{ name: string; role: string }> | null;
  cover_image_url: string | null;
  thumb_image_url: string | null;
  status: "collection" | "wantlist" | "library";
  condition_media: string | null;
  condition_sleeve: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```
