# Implementation Plan — 10 Tasks for Haiku Execution

> Each task includes: what to build, where files go, exact APIs/libraries, and step-by-step instructions so a fast model can execute without ambiguity.

---

## Skills You'll Build Along the Way

| Skill | Tasks That Build It |
|-------|-------------------|
| **LLM API Integration** (OpenAI structured output, prompt engineering) | Task 1 (TLDR), Task 2 (Distillation) |
| **Celery Background Jobs** (async task chains, retries, error handling) | Task 1, Task 4, Task 5 |
| **PDF Processing Pipeline** (PyMuPDF, text extraction, format normalization) | Task 4 |
| **Email Infrastructure** (inbound parsing, webhook processing, DNS/MX) | Task 5 |
| **Advanced CSS/Typography** (custom properties, font loading, responsive reading) | Task 6, Task 7 |
| **React Context + localStorage Persistence** (settings state management) | Task 6, Task 7 |
| **Mobile-First UX** (bottom sheets, touch targets, iOS integration) | Task 8 |
| **Data Visualization** (SVG heatmaps, activity calendars, stats aggregation) | Task 9 |
| **Web Scraping Hardening** (User-Agent rotation, fallback extractors, paywall detection) | Task 4 |
| **Product Design Thinking** (progressive disclosure, warm microcopy, opinionated UX) | Task 10, all UI tasks |

---

## Task 1: Article TLDR (LLM-Generated Summary)

### What
Add a one-paragraph TLDR to each article, generated via OpenAI after content extraction. Show it in the Reader behind a toggle — collapsed by default, revealed on click.

### Backend

**New field on `ContentItem` model:**

File: `content-queue-backend/app/models/content.py`
```python
tldr = Column(Text, nullable=True)  # LLM-generated one-paragraph summary
```

**New Alembic migration:**
```bash
cd content-queue-backend
alembic revision --autogenerate -m "add_tldr_to_content_items"
alembic upgrade head
```

**New Celery task:**

File: `content-queue-backend/app/tasks/summarize.py`
```python
from app.core.celery_app import celery_app
from app.tasks.extraction import DatabaseTask
from app.models.content import ContentItem
from uuid import UUID
import openai
import os
import logging

logger = logging.getLogger(__name__)

@celery_app.task(base=DatabaseTask, bind=True, max_retries=2)
def generate_tldr(self, content_item_id: str):
    """Generate a one-paragraph TLDR using OpenAI."""
    try:
        item = self.db.query(ContentItem).filter(
            ContentItem.id == UUID(content_item_id)
        ).first()

        if not item or not item.full_text:
            return

        # Strip HTML for the prompt
        from bs4 import BeautifulSoup
        plain_text = BeautifulSoup(item.full_text, "html.parser").get_text()

        # Truncate to ~4000 words to stay within token limits
        words = plain_text.split()
        truncated = " ".join(words[:4000])

        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise summarizer. Write exactly ONE paragraph (3-5 sentences) that captures the core argument and key insight of this article. Be direct, no fluff. Write in a neutral, intelligent tone — like a friend explaining what they just read."
                },
                {
                    "role": "user",
                    "content": f"Article title: {item.title}\n\n{truncated}"
                }
            ],
            max_tokens=200,
            temperature=0.3,
        )

        item.tldr = response.choices[0].message.content.strip()
        self.db.commit()
        logger.info(f"Generated TLDR for {content_item_id}")

    except Exception as e:
        logger.error(f"TLDR generation failed: {e}")
        self.retry(countdown=60)
```

**Chain into extraction pipeline:**

File: `content-queue-backend/app/tasks/extraction.py`

At the end of `extract_full_content`, after triggering `generate_embedding`, add:
```python
from app.tasks.summarize import generate_tldr
generate_tldr.delay(str(item.id))
```

**Update schema to include `tldr`:**

File: `content-queue-backend/app/schemas/content.py`

Add `tldr: str | None = None` to `ContentItemResponse` and `ContentItemDetail`.

### Frontend

**Update types:**

File: `frontend/types/index.ts`
```typescript
tldr?: string;  // Add to ContentItem interface
```

**Reader.tsx — Add collapsible TLDR section:**

Add below the metadata div, above the description, in `Reader.tsx`:

```tsx
{/* TLDR Section - collapsed by default */}
{content.tldr && (
  <div className="mb-8">
    <button
      onClick={() => setShowTldr(!showTldr)}
      className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)]
                 bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]
                 hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]
                 transition-colors"
    >
      {showTldr ? "Hide TLDR" : "Show TLDR"}
    </button>
    {showTldr && (
      <div className="mt-3 p-4 border-l-2 border-[var(--color-accent)]
                      bg-[var(--color-bg-secondary)] text-sm leading-relaxed
                      text-[var(--color-text-secondary)]">
        {content.tldr}
      </div>
    )}
  </div>
)}
```

Add state: `const [showTldr, setShowTldr] = useState(false);`

### Notes
- Cost: ~$0.001 per article with gpt-4o-mini
- TLDR generates in background after full text extraction
- Non-blocking: if generation fails, article still works

---

## Task 2: Highlight Distillation

### What
When a user has 3+ highlights on an article, show a "Distill" option in the HighlightsPanel that uses LLM to synthesize their highlights into a coherent summary — in their voice, based on what they found important.

### Backend

**New endpoint:**

File: `content-queue-backend/app/api/highlights.py`

Add a new route:
```python
@router.post("/{content_id}/highlights/distill")
async def distill_highlights(
    content_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate a distillation from the user's highlights on this article."""
    highlights = db.query(Highlight).filter(
        Highlight.content_item_id == content_id,
        Highlight.user_id == current_user.id,
    ).order_by(Highlight.start_offset).all()

    if len(highlights) < 3:
        raise HTTPException(400, "Need at least 3 highlights to distill")

    # Get article context
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()

    highlight_texts = []
    for h in highlights:
        entry = f'"{h.text}"'
        if h.note:
            entry += f" [Your note: {h.note}]"
        highlight_texts.append(entry)

    highlights_block = "\n\n".join(highlight_texts)

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are helping a reader distill their highlights into a personal synthesis. "
                    "Based on the passages they highlighted (and any notes they wrote), write a "
                    "2-4 paragraph summary that weaves together the key ideas THEY found important. "
                    "Use second person ('You highlighted...', 'The key tension you noticed...'). "
                    "Be thoughtful, not robotic. End with one open question for further thinking."
                )
            },
            {
                "role": "user",
                "content": f"Article: {item.title}\n\nHighlights:\n{highlights_block}"
            }
        ],
        max_tokens=500,
        temperature=0.5,
    )

    return {"distillation": response.choices[0].message.content.strip()}
```

**Update API client:**

File: `frontend/lib/api.ts`

Add to `highlightsAPI`:
```typescript
distill: async (contentId: string): Promise<{ distillation: string }> => {
  const res = await fetch(`${BASE}/content/${contentId}/highlights/distill`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Distillation failed");
  return res.json();
},
```

### Frontend

**HighlightsPanel.tsx — Add distill button and display:**

Add a "Distill My Highlights" button at the top of the panel when highlights.length >= 3. On click, call the API and display the result in a styled block at the top of the panel.

```tsx
// State
const [distillation, setDistillation] = useState<string | null>(null);
const [isDistilling, setIsDistilling] = useState(false);

// Handler
const handleDistill = async () => {
  setIsDistilling(true);
  try {
    const result = await highlightsAPI.distill(contentId);
    setDistillation(result.distillation);
  } catch (err) {
    console.error(err);
  } finally {
    setIsDistilling(false);
  }
};

// UI - add at top of panel, before highlight list
{highlights.length >= 3 && (
  <div className="p-3 border-b border-[var(--color-border)]">
    <button
      onClick={handleDistill}
      disabled={isDistilling}
      className="w-full text-xs px-2 py-1.5 rounded-none border border-[var(--color-border)]
                 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]
                 hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
    >
      {isDistilling ? "Thinking..." : "Distill My Highlights"}
    </button>
    {distillation && (
      <div className="mt-3 p-3 text-sm leading-relaxed text-[var(--color-text-secondary)]
                      bg-[var(--color-bg-secondary)] border-l-2 border-[var(--color-accent)]">
        {distillation}
      </div>
    )}
  </div>
)}
```

**Note:** `contentId` prop needs to be passed to HighlightsPanel — check if it already exists, if not add it.

---

## Task 3: Lists as Projects (Notes + Context)

### What
Upgrade Lists to function like Claude Projects. Each list gets a description/notes area where users can write context, research questions, or project notes. This turns a "folder of articles" into a "research workspace."

### Backend

**The `List` model already has `description` (Text, nullable).** Expand it:

File: `content-queue-backend/app/models/list.py`

Add:
```python
notes = Column(Text, nullable=True)  # Rich text project notes (Markdown)
```

**New migration:**
```bash
alembic revision --autogenerate -m "add_notes_to_lists"
alembic upgrade head
```

**Update schemas:**

File: `content-queue-backend/app/schemas/list.py`

Add `notes: str | None = None` to `ListResponse`, `ListCreate`, `ListUpdate`.

**Update PATCH endpoint** to accept `notes` field (it should already handle any field in `ListUpdate`).

### Frontend

**List detail page** (`frontend/app/lists/[id]/page.tsx` or its client component):

Add a collapsible notes section at the top:

```tsx
const [showNotes, setShowNotes] = useState(!!list.notes);
const [notes, setNotes] = useState(list.notes || "");
const [isSavingNotes, setIsSavingNotes] = useState(false);

// Auto-save notes with debounce
useEffect(() => {
  if (notes === (list.notes || "")) return;
  const timeout = setTimeout(async () => {
    setIsSavingNotes(true);
    try {
      await listsAPI.update(list.id, { notes });
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setIsSavingNotes(false);
    }
  }, 1500); // Auto-save after 1.5s of inactivity
  return () => clearTimeout(timeout);
}, [notes]);

// UI
<div className="mb-6">
  <button
    onClick={() => setShowNotes(!showNotes)}
    className="text-xs px-2 py-1 rounded-none border border-[var(--color-border)]
               bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]
               hover:border-[var(--color-accent)] transition-colors"
  >
    {showNotes ? "Hide Notes" : "Project Notes"}
    {isSavingNotes && " · Saving..."}
  </button>
  {showNotes && (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Research question, context, or notes for this project..."
      className="mt-3 w-full min-h-[120px] p-4 text-sm leading-relaxed
                 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                 rounded-none text-[var(--color-text-primary)]
                 placeholder-[var(--color-text-muted)] resize-y
                 focus:outline-none focus:border-[var(--color-accent)]"
    />
  )}
</div>
```

### Design
- Auto-saves on debounce (no save button needed)
- Placeholder text guides purpose: "Research question, context, or notes..."
- Plain textarea for now; Markdown rendering can come later

---

## Task 4: PDF Support, Twitter Threads, Scraper Hardening

### What
- Accept PDF file uploads and extract text
- Improve Twitter/X thread extraction
- Add fallback extractors for difficult domains (NYTimes, etc.)

### Backend — PDF Support

**Add PyMuPDF dependency:**

File: `content-queue-backend/pyproject.toml`
```
"pymupdf (>=1.25.0,<2.0.0)",
```

**New upload endpoint:**

File: `content-queue-backend/app/api/content.py`

Add a new route for PDF upload:
```python
from fastapi import UploadFile, File
import tempfile

@router.post("/upload", response_model=ContentItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_content(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF file for extraction."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are supported")

    if file.size and file.size > 30 * 1024 * 1024:  # 30MB limit
        raise HTTPException(400, "File too large (max 30MB)")

    # Save temp file
    content_bytes = await file.read()

    new_item = ContentItem(
        user_id=current_user.id,
        original_url=f"upload://{file.filename}",
        title=file.filename.replace('.pdf', ''),
        content_type="pdf",
        submitted_via="web",
        processing_status="pending",
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Trigger PDF extraction task
    extract_pdf.delay(str(new_item.id), content_bytes)

    return _build_response(new_item)
```

**PDF extraction task:**

File: `content-queue-backend/app/tasks/extraction.py`

Add:
```python
import fitz  # PyMuPDF

@celery_app.task(base=DatabaseTask, bind=True, max_retries=2)
def extract_pdf(self, content_item_id: str, pdf_bytes: bytes):
    """Extract text from uploaded PDF using PyMuPDF."""
    try:
        item = self.db.query(ContentItem).filter(
            ContentItem.id == UUID(content_item_id)
        ).first()
        if not item:
            return

        item.processing_status = "processing"
        self.db.commit()

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        html_parts = []
        for page_num, page in enumerate(doc):
            text = page.get_text("html")
            html_parts.append(f'<div class="pdf-page" data-page="{page_num + 1}">{text}</div>')

        full_html = "\n".join(html_parts)
        plain_text = "\n".join(page.get_text() for page in doc)

        word_count = len(plain_text.split())

        item.full_text = full_html
        item.word_count = word_count
        item.reading_time_minutes = max(1, word_count // 200)
        item.processing_status = "completed"

        if not item.title or item.title == doc.name:
            # Try to extract title from PDF metadata
            metadata = doc.metadata
            if metadata.get("title"):
                item.title = metadata["title"]

        self.db.commit()
        doc.close()

        # Chain to embedding + TLDR
        generate_embedding.delay(content_item_id)
        generate_tldr.delay(content_item_id)

    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        item.processing_status = "failed"
        item.processing_error = str(e)
        self.db.commit()
```

**Frontend — PDF upload UI:**

File: `frontend/components/AddContentForm.tsx`

Add a file input alongside the URL input:
```tsx
<div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
  <span>or</span>
  <label className="cursor-pointer px-2 py-1 rounded-none border border-[var(--color-border)]
                     hover:border-[var(--color-accent)] transition-colors">
    Upload PDF
    <input
      type="file"
      accept=".pdf"
      className="hidden"
      onChange={handleFileUpload}
    />
  </label>
</div>
```

### Backend — Twitter Thread Improvement

File: `content-queue-backend/app/tasks/extraction.py`

In `extract_metadata`, add Twitter/X detection:
```python
def is_twitter_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.hostname in ("twitter.com", "x.com", "www.twitter.com", "www.x.com")

# In extract_metadata, before the general fetch:
if is_twitter_url(item.original_url):
    # Try using nitter instances or oembed API
    try:
        # Twitter oembed API (free, no auth needed)
        oembed_url = f"https://publish.twitter.com/oembed?url={item.original_url}"
        oembed_resp = requests.get(oembed_url, timeout=10)
        if oembed_resp.ok:
            oembed_data = oembed_resp.json()
            item.title = f"Tweet by {oembed_data.get('author_name', 'Unknown')}"
            # The html field contains the tweet content
            item.full_text = oembed_data.get("html", "")
            item.content_type = "tweet"
            item.processing_status = "completed"
            self.db.commit()
            generate_embedding.delay(content_item_id)
            return
    except Exception:
        pass  # Fall through to normal extraction
```

### Backend — Scraper Hardening for Paywalled Sites

File: `content-queue-backend/app/tasks/extraction.py`

Add request headers rotation and fallback strategy:
```python
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
]

PAYWALL_DOMAINS = {"nytimes.com", "wsj.com", "washingtonpost.com", "theatlantic.com", "ft.com"}

def get_headers(url: str) -> dict:
    import random
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.google.com/",  # Some sites allow Google referrals
        "DNT": "1",
    }

    parsed = urlparse(url)
    domain = parsed.hostname.replace("www.", "") if parsed.hostname else ""

    if domain in PAYWALL_DOMAINS:
        # Use Googlebot UA as fallback for paywall sites
        headers["User-Agent"] = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

    return headers

# In extract_full_content, add fallback chain:
def extract_with_fallbacks(url: str, html: str) -> str | None:
    """Try multiple extraction methods in order."""

    # 1. trafilatura (best for most sites)
    result = trafilatura.extract(html, include_images=True, output_format='html')
    if result and len(result) > 200:
        return result

    # 2. newspaper3k fallback
    try:
        from newspaper import Article
        article = Article(url)
        article.set_html(html)
        article.parse()
        if article.text and len(article.text) > 200:
            # Convert plain text to basic HTML
            paragraphs = article.text.split('\n\n')
            return '\n'.join(f'<p>{p.strip()}</p>' for p in paragraphs if p.strip())
    except Exception:
        pass

    # 3. BeautifulSoup heuristic fallback
    try:
        soup = BeautifulSoup(html, 'html.parser')
        # Remove script, style, nav, footer, header
        for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        # Find main content area
        main = soup.find('article') or soup.find('main') or soup.find(class_=['article', 'post', 'content', 'story'])
        if main:
            return str(main)
    except Exception:
        pass

    return None
```

---

## Task 5: Email-to-Save (Inbound Email)

### What
Give each user a unique email address (e.g., `save-abc123@sedi.app`). Forwarding or sending URLs/newsletters to that address saves the content.

### Architecture
Use **SendGrid Inbound Parse** (free tier: 100 emails/day) or **Resend** (newer, cleaner API).

### Backend

**New field on User model:**

File: `content-queue-backend/app/models/user.py`
```python
import secrets

email_token = Column(String, unique=True, index=True, default=lambda: secrets.token_hex(8))
# This generates addresses like: save-a1b2c3d4e5f6g7h8@sedi.app
```

**New migration:**
```bash
alembic revision --autogenerate -m "add_email_token_to_users"
alembic upgrade head
```

**Webhook endpoint:**

File: `content-queue-backend/app/api/email_webhook.py`
```python
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.content import ContentItem
from app.tasks.extraction import extract_metadata
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["webhook"])

@router.post("/email")
async def receive_email(request: Request, db: Session = next(get_db())):
    """
    Webhook called by SendGrid/Resend when email arrives.
    Parses the 'to' address to find the user, extracts URLs from body, saves them.
    """
    # Parse form data (SendGrid sends multipart/form-data)
    form = await request.form()

    to_address = form.get("to", "")
    subject = form.get("subject", "")
    text_body = form.get("text", "")
    html_body = form.get("html", "")

    # Extract user token from email address
    # Format: save-{token}@sedi.app
    match = re.search(r'save-([a-f0-9]+)@', to_address)
    if not match:
        logger.warning(f"Invalid inbound email address: {to_address}")
        return {"status": "ignored"}

    token = match.group(1)
    user = db.query(User).filter(User.email_token == token).first()
    if not user:
        logger.warning(f"No user found for token: {token}")
        return {"status": "user_not_found"}

    # Extract URLs from the email body
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    urls = re.findall(url_pattern, text_body or html_body or "")

    saved_count = 0
    for url in urls[:5]:  # Max 5 URLs per email
        # Skip email-related URLs
        if "unsubscribe" in url.lower() or "mailto:" in url.lower():
            continue

        new_item = ContentItem(
            user_id=user.id,
            original_url=url,
            submitted_via="email",
            processing_status="pending",
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        extract_metadata.delay(str(new_item.id))
        saved_count += 1

    # If no URLs found, save the email body itself as content
    if saved_count == 0 and (text_body or html_body):
        new_item = ContentItem(
            user_id=user.id,
            original_url=f"email://{subject or 'forwarded'}",
            title=subject or "Forwarded Email",
            full_text=html_body or f"<p>{text_body}</p>",
            submitted_via="email",
            content_type="email",
            processing_status="completed",
            word_count=len((text_body or "").split()),
        )
        db.add(new_item)
        db.commit()
        saved_count = 1

    return {"status": "ok", "saved": saved_count}
```

**Register route in main.py:**
```python
from app.api.email_webhook import router as email_router
app.include_router(email_router)
```

**User settings endpoint (show email address):**

File: `content-queue-backend/app/api/auth.py`

The `/auth/me` endpoint should return `email_token` so frontend can display:
`save-{token}@sedi.app`

### Frontend

**Settings page** (Task 6) will show the user's unique email address with a copy button.

### DNS Setup (Manual, one-time)
- Add MX record: `sedi.app → mx.sendgrid.net` (priority 10)
- Configure SendGrid Inbound Parse: domain `sedi.app`, URL: `https://api.sedi.app/webhook/email`

---

## Task 6: Settings Page (Reading Experience Controls)

### What
A dedicated `/settings` page where users configure their reading experience: theme, font family, font size, content width, line height, letter spacing. Defaults to beautiful typography. Settings persist in localStorage and apply globally.

### Frontend

**New Context: ReadingSettingsContext**

File: `frontend/contexts/ReadingSettingsContext.tsx`
```tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ReadingSettings {
  theme: "light" | "dark" | "sepia";
  fontFamily: "system" | "serif" | "sans";
  fontSize: "small" | "medium" | "large";
  contentWidth: "narrow" | "medium" | "wide";
  lineHeight: "compact" | "comfortable" | "spacious";
  letterSpacing: "tight" | "normal" | "wide";
  bionicReading: boolean;
}

const DEFAULTS: ReadingSettings = {
  theme: "light",
  fontFamily: "serif",
  fontSize: "medium",
  contentWidth: "medium",
  lineHeight: "comfortable",
  letterSpacing: "normal",
  bionicReading: false,
};

const STORAGE_KEY = "sedi-reading-settings";

interface ReadingSettingsContextType {
  settings: ReadingSettings;
  updateSetting: <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => void;
  resetSettings: () => void;
}

const ReadingSettingsContext = createContext<ReadingSettingsContextType | null>(null);

export function ReadingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULTS, ...JSON.parse(saved) });
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, loaded]);

  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings(DEFAULTS);

  return (
    <ReadingSettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </ReadingSettingsContext.Provider>
  );
}

export function useReadingSettings() {
  const ctx = useContext(ReadingSettingsContext);
  if (!ctx) throw new Error("useReadingSettings must be used within ReadingSettingsProvider");
  return ctx;
}
```

**CSS mappings for settings:**

File: `frontend/app/globals.css`

Add sepia theme:
```css
.sepia {
  --color-bg-primary: #f5f0e8;
  --color-bg-secondary: #ede6da;
  --color-bg-tertiary: #e5ddd0;
  --color-text-primary: #433422;
  --color-text-secondary: #5c4a35;
  --color-text-muted: #7a6b5a;
  --color-text-faint: #998672;
  --color-border: #d4c9b8;
  --color-border-subtle: #e0d6c7;
  --color-accent: #8b5e3c;
  --color-accent-hover: #6d4a2e;
}
```

**Settings page:**

File: `frontend/app/settings/page.tsx`
```tsx
// Page with sections for each setting group
// Each setting is a row with label + button group (not dropdowns — feels more tactile)
//
// Layout:
// ┌─────────────────────────────────────┐
// │ Reading Settings                     │
// │                                      │
// │ Theme:        [Light] [Dark] [Sepia] │
// │ Font:         [Serif] [Sans] [System]│
// │ Size:         [S] [M] [L]            │
// │ Width:        [Narrow] [Medium] [Wide]│
// │ Line Height:  [Compact] [Comfy] [Spacious]│
// │ Spacing:      [Tight] [Normal] [Wide]│
// │ Bionic:       [Off] [On]             │
// │                                      │
// │ [Reset to Defaults]                  │
// │                                      │
// │ ─────────────────────────────────── │
// │ Your Save-by-Email Address           │
// │ save-abc123@sedi.app  [Copy]         │
// │                                      │
// │ ─────────────────────────────────── │
// │ Account                              │
// │ [Logout]                             │
// └─────────────────────────────────────┘
```

Each setting row uses the same button style as filter buttons — small, `rounded-none`, border accent when active.

**Add to Navbar:**

Add a "Settings" link/button next to Queue and Lists in `Navbar.tsx`.

**Apply settings in Reader.tsx:**

Use `useReadingSettings()` to map settings to CSS classes:
```typescript
const fontFamilyClass = {
  system: "font-sans",
  serif: "font-serif",
  sans: "font-sans",
}[settings.fontFamily];

const fontSizeClass = {
  small: "text-sm md:text-base",
  medium: "text-base md:text-lg",
  large: "text-lg md:text-xl",
}[settings.fontSize];

const widthClass = {
  narrow: "max-w-lg",   // ~32rem, ~55 chars
  medium: "max-w-2xl",  // ~42rem, ~65 chars (default)
  wide: "max-w-3xl",    // ~48rem, ~75 chars
}[settings.contentWidth];

const lineHeightClass = {
  compact: "leading-relaxed",    // 1.625
  comfortable: "leading-loose",  // 1.75
  spacious: "[leading-[2]]",     // 2.0
}[settings.lineHeight];

const letterSpacingClass = {
  tight: "tracking-tight",
  normal: "tracking-normal",
  wide: "tracking-wide",
}[settings.letterSpacing];
```

---

## Task 7: Focus Mode & Reader Enhancements

### What
- Paragraph focus (dim non-current paragraphs)
- Reading progress indicator
- Heading hierarchy with anchor links
- Bionic reading (toggle in settings, not on reader page)

### Frontend

**7A: Paragraph Focus Mode**

File: `frontend/components/Reader.tsx`

Add a "Focus" toggle to the reader navbar:
```tsx
const [focusMode, setFocusMode] = useState(false);
const [focusParagraph, setFocusParagraph] = useState<number | null>(null);

// Detect which paragraph is in view
useEffect(() => {
  if (!focusMode) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute("data-para-index") || "0");
          setFocusParagraph(index);
        }
      });
    },
    { threshold: 0.5, rootMargin: "-30% 0px -30% 0px" }
  );

  const paragraphs = document.querySelectorAll("#reader-content p, #reader-content h2, #reader-content h3");
  paragraphs.forEach((p, i) => {
    p.setAttribute("data-para-index", String(i));
    observer.observe(p);
  });

  return () => observer.disconnect();
}, [focusMode]);

// Apply dimming CSS
// Add to reader-content wrapper:
className={`${focusMode ? "focus-mode" : ""}`}
```

File: `frontend/app/globals.css`
```css
/* Focus Mode - dim non-active paragraphs */
.focus-mode p,
.focus-mode h2,
.focus-mode h3,
.focus-mode blockquote,
.focus-mode ul,
.focus-mode ol {
  opacity: 0.3;
  transition: opacity 0.4s ease;
}

.focus-mode p[data-para-index].focused,
.focus-mode h2[data-para-index].focused,
.focus-mode h3[data-para-index].focused,
.focus-mode blockquote[data-para-index].focused,
.focus-mode ul[data-para-index].focused,
.focus-mode ol[data-para-index].focused {
  opacity: 1;
}

/* Also brighten the paragraph above and below for context */
.focus-mode [data-para-index].near-focused {
  opacity: 0.6;
}
```

When focusParagraph changes, add/remove `.focused` and `.near-focused` classes via JS.

**7B: Reading Progress Indicator**

Two options — implement both, let user pick in settings:

**Option 1: Top bar (thin line at top of screen)**
```tsx
const [readProgress, setReadProgress] = useState(0);

// In scroll handler (already exists):
setReadProgress(Math.min(scrollPercent * 100, 100));

// UI: thin bar at very top, above navbar
<div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-[var(--color-border-subtle)]">
  <div
    className="h-full bg-[var(--color-accent)] transition-[width] duration-150"
    style={{ width: `${readProgress}%` }}
  />
</div>
```

**Option 2: Circular indicator (in navbar)**
```tsx
<div className="relative w-6 h-6">
  <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
    <circle cx="18" cy="18" r="15.5" fill="none"
            stroke="var(--color-border)" strokeWidth="2" />
    <circle cx="18" cy="18" r="15.5" fill="none"
            stroke="var(--color-accent)" strokeWidth="2"
            strokeDasharray={`${readProgress} 100`}
            strokeLinecap="round" />
  </svg>
  <span className="absolute inset-0 flex items-center justify-center text-[8px]
                    text-[var(--color-text-muted)]">
    {Math.round(readProgress)}%
  </span>
</div>
```

**7C: Heading Hierarchy + Anchor Links**

File: `frontend/components/HighlightRenderer.tsx` (or create new `ArticleRenderer.tsx`)

Post-process the article HTML to add anchor IDs to headings:
```typescript
function addHeadingAnchors(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("h1, h2, h3, h4").forEach((heading) => {
    const id = heading.textContent
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "";
    heading.id = id;

    // Add hover anchor link
    const anchor = doc.createElement("a");
    anchor.href = `#${id}`;
    anchor.className = "heading-anchor";
    anchor.textContent = "#";
    heading.prepend(anchor);
  });

  return doc.body.innerHTML;
}
```

CSS:
```css
.heading-anchor {
  opacity: 0;
  margin-right: 0.5rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: opacity 0.2s;
}

h1:hover .heading-anchor,
h2:hover .heading-anchor,
h3:hover .heading-anchor {
  opacity: 0.5;
}
```

**7D: Bionic Reading**

File: `frontend/lib/bionicReading.ts`
```typescript
/**
 * Convert text to bionic reading format.
 * Bolds the first ~50% of each word to create fixation points.
 */
export function toBionic(html: string): string {
  // Only process text nodes, not HTML tags
  return html.replace(/>([^<]+)</g, (match, text) => {
    const bionicText = text.replace(/\b(\w+)\b/g, (word: string) => {
      if (word.length <= 1) return word;
      const boldLen = Math.ceil(word.length * 0.5);
      return `<b>${word.slice(0, boldLen)}</b>${word.slice(boldLen)}`;
    });
    return `>${bionicText}<`;
  });
}
```

Apply conditionally in Reader/HighlightRenderer based on `settings.bionicReading`.

---

## Task 8: Mobile Highlight Bottom Sheet

### What
On mobile, when text is selected: show a small "Highlight" button below the iOS native menu. When tapped, open a bottom sheet with color picker, note input, and save/cancel.

### Frontend

**Redesign HighlightToolbar.tsx for mobile:**

File: `frontend/components/HighlightToolbar.tsx`

```tsx
// Detect mobile
const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

// MOBILE: Bottom sheet approach
if (isMobile) {
  if (!isExpanded) {
    // Step 1: Small floating button BELOW the selection
    // Position it lower to avoid iOS native menu (which appears above)
    return (
      <div
        className="highlight-toolbar fixed z-50"
        style={{
          left: `${selection.position.x}px`,
          top: `${Math.min(selection.position.y + 50, window.innerHeight - 60)}px`,
          transform: "translateX(-50%)",
        }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-none
                     bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]
                     border border-[var(--color-border)] shadow-lg
                     hover:border-[var(--color-accent)] transition-all
                     text-xs font-medium"
        >
          <Highlighter size={12} />
          Highlight
        </button>
      </div>
    );
  }

  // Step 2: Bottom sheet with full controls
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div className="highlight-toolbar fixed bottom-0 left-0 right-0 z-50
                      bg-[var(--color-bg-primary)] border-t border-[var(--color-border)]
                      shadow-2xl animate-slide-up pb-safe">
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* Selected text preview */}
          <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                          rounded-none text-sm text-[var(--color-text-secondary)]">
            "{selection.text.substring(0, 120)}{selection.text.length > 120 ? "..." : ""}"
          </div>

          {/* Color picker - larger touch targets */}
          <div className="flex gap-3 justify-center">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.name)}
                className={`w-10 h-10 rounded-none border-2 transition-all ${
                  selectedColor === color.name
                    ? "border-[var(--color-text-primary)] scale-110"
                    : "border-[var(--color-border)] opacity-60"
                }`}
                style={{ backgroundColor: `var(--highlight-${color.name})` }}
              />
            ))}
          </div>

          {/* Note input */}
          {(showNoteInput || isEditing) && (
            <textarea
              placeholder={isEditing ? "Edit note..." : "Add a note..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)]
                         bg-transparent rounded-none focus:outline-none
                         focus:border-[var(--color-accent)] text-[var(--color-text-primary)]
                         placeholder-[var(--color-text-muted)] resize-none"
              rows={2}
            />
          )}

          {/* Action buttons - consistent style */}
          <div className="flex gap-2">
            {!isEditing && (
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="flex-1 text-sm px-3 py-2.5 rounded-none
                           bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]
                           border border-[var(--color-border)]
                           hover:border-[var(--color-accent)] transition-colors"
              >
                {showNoteInput ? "Hide Note" : "Add Note"}
              </button>
            )}
            <button
              onClick={handleSaveHighlight}
              disabled={isLoading}
              className="flex-1 text-sm px-3 py-2.5 rounded-none
                         bg-[var(--color-accent)] text-white
                         hover:bg-[var(--color-accent-hover)] transition-colors
                         disabled:opacity-50"
            >
              {isLoading ? "Saving..." : isEditing ? "Update" : "Save"}
            </button>
            {isEditing && (
              <button
                onClick={handleDeleteHighlight}
                disabled={isLoading}
                className="flex-1 text-sm px-3 py-2.5 rounded-none
                           border border-red-300 text-red-600
                           hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}
            <button
              onClick={onClose}
              className="text-sm px-3 py-2.5 rounded-none
                         bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]
                         border border-[var(--color-border)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// DESKTOP: Keep existing floating toolbar (current code, but fix rounded-full → rounded-none)
```

**Add slide-up animation:**

File: `frontend/app/globals.css`
```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.25s ease-out;
}

/* Safe area for iPhone notch/home indicator */
.pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

**Key design decisions:**
- Floating "Highlight" button appears BELOW selection (avoids iOS native menu above)
- Bottom sheet uses full-width layout with large touch targets (44px+)
- All buttons use `rounded-none` to match app style
- Backdrop dismisses on tap
- No `rounded-full` — consistent with editorial aesthetic

---

## Task 9: Profile / Reflections Page with Reading Calendar

### What
A `/profile` page showing weekly reading stats, a GitHub-style reading activity calendar, and reflective insights. Not gamified — warm and thoughtful.

### Backend

**New analytics endpoint:**

File: `content-queue-backend/app/api/analytics.py`

Expand existing stats endpoint or add:
```python
@router.get("/analytics/activity")
async def get_reading_activity(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return daily reading activity for the past year."""
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date

    one_year_ago = datetime.utcnow() - timedelta(days=365)

    # Count articles read per day (based on read_at or updated_at when is_read)
    daily_reads = db.query(
        cast(ContentItem.read_at, Date).label("date"),
        func.count(ContentItem.id).label("count"),
    ).filter(
        ContentItem.user_id == current_user.id,
        ContentItem.is_read == True,
        ContentItem.read_at >= one_year_ago,
        ContentItem.deleted_at.is_(None),
    ).group_by(cast(ContentItem.read_at, Date)).all()

    # Count highlights per day
    daily_highlights = db.query(
        cast(Highlight.created_at, Date).label("date"),
        func.count(Highlight.id).label("count"),
    ).filter(
        Highlight.user_id == current_user.id,
        Highlight.created_at >= one_year_ago,
    ).group_by(cast(Highlight.created_at, Date)).all()

    # Weekly stats
    this_week = datetime.utcnow() - timedelta(days=7)
    weekly_reads = db.query(func.count(ContentItem.id)).filter(
        ContentItem.user_id == current_user.id,
        ContentItem.is_read == True,
        ContentItem.read_at >= this_week,
    ).scalar()

    weekly_highlights = db.query(func.count(Highlight.id)).filter(
        Highlight.user_id == current_user.id,
        Highlight.created_at >= this_week,
    ).scalar()

    # Total reading time this week
    weekly_reading_time = db.query(
        func.sum(ContentItem.reading_time_minutes)
    ).filter(
        ContentItem.user_id == current_user.id,
        ContentItem.is_read == True,
        ContentItem.read_at >= this_week,
    ).scalar() or 0

    return {
        "daily_activity": [
            {"date": str(r.date), "reads": r.count}
            for r in daily_reads
        ],
        "daily_highlights": [
            {"date": str(h.date), "highlights": h.count}
            for h in daily_highlights
        ],
        "weekly": {
            "articles_read": weekly_reads,
            "highlights_created": weekly_highlights,
            "reading_minutes": weekly_reading_time,
        },
    }
```

### Frontend

**Install react-activity-calendar:**
```bash
cd frontend && npm install react-activity-calendar
```

**Profile page:**

File: `frontend/app/profile/page.tsx`
```tsx
// Layout:
// ┌─────────────────────────────────────┐
// │ Your Reading Life                   │
// │                                      │
// │ This Week                            │
// │ ┌────┐ ┌────┐ ┌────┐               │
// │ │ 5  │ │ 12 │ │ ~2h│               │
// │ │read│ │ hi │ │time│               │
// │ └────┘ └────┘ └────┘               │
// │                                      │
// │ ─────────────────────────────────── │
// │                                      │
// │ Reading Activity                     │
// │ [GitHub-style heatmap calendar]      │
// │ ░░▒▓░░░▓▒░░░░▒░░░░░░▒▓▓░░░░░       │
// │                                      │
// │ ─────────────────────────────────── │
// │                                      │
// │ Settings link, email address, etc    │
// └─────────────────────────────────────┘
```

**Heatmap styling:**

Use CSS variables to match the app theme:
```tsx
<ActivityCalendar
  data={activityData}
  theme={{
    light: [
      "var(--color-bg-tertiary)",     // level 0
      "rgba(61, 70, 194, 0.2)",       // level 1
      "rgba(61, 70, 194, 0.4)",       // level 2
      "rgba(61, 70, 194, 0.6)",       // level 3
      "rgba(61, 70, 194, 0.9)",       // level 4
    ],
    dark: [
      "var(--color-bg-tertiary)",
      "rgba(107, 115, 232, 0.2)",
      "rgba(107, 115, 232, 0.4)",
      "rgba(107, 115, 232, 0.6)",
      "rgba(107, 115, 232, 0.9)",
    ],
  }}
  blockSize={11}
  blockMargin={3}
  blockRadius={1}  // Subtle rounding, not fully round
  fontSize={11}
  hideColorLegend={false}
  hideMonthLabels={false}
  hideTotalCount={true}  // We show our own stats above
/>
```

**Add "Profile" link to Navbar** (both desktop and mobile menu).

---

## Task 10: "Finding Your Articles" Loading State

### What
Replace "Loading..." with "Finding your articles..." throughout the app. Small change, big warmth.

### Files to Change

1. **`ContentList.tsx`** line ~354:
   - Change: `"Loading your queue..."` → `"Finding your articles..."`

2. **`Reader.tsx`** (processing states around line 651):
   - `"Content is being extracted..."` → `"Preparing your article..."`
   - `"Content extraction is pending..."` → `"Finding your article..."`
   - `"Full content not available yet."` → `"Still getting this one ready."`

3. **`Sidebar.tsx`** line ~138:
   - `"Loading lists..."` → `"Finding your lists..."`

4. **Landing page** `page.tsx` line ~23:
   - `"Loading..."` → `"Finding your way in..."`

5. **Any Suspense fallbacks** in dashboard:
   - `"Loading..."` → `"Finding your articles..."`

### Principle
Every loading state should feel like the app is working *for you*, not reporting a system status. Use second person, use warm verbs.

---

## Execution Order (Recommended)

Tasks are ordered by dependency and impact:

| Order | Task | Dependencies | Effort |
|-------|------|-------------|--------|
| 1 | **Task 10** (Loading copy) | None | 15 min |
| 2 | **Task 6** (Settings page + context) | None | 3-4 hours |
| 3 | **Task 7** (Focus mode + reader enhancements) | Task 6 (settings context) | 3-4 hours |
| 4 | **Task 8** (Mobile highlight bottom sheet) | None | 2-3 hours |
| 5 | **Task 1** (TLDR) | None (backend) | 2-3 hours |
| 6 | **Task 9** (Profile/reflections page) | None | 3-4 hours |
| 7 | **Task 2** (Highlight distillation) | Task 1 patterns | 2 hours |
| 8 | **Task 3** (Lists as projects) | None | 2 hours |
| 9 | **Task 4** (PDF + scraper hardening) | None | 4-5 hours |
| 10 | **Task 5** (Email-to-save) | DNS setup needed | 3-4 hours |

---

## Potential Skills Summary

After completing all 10 tasks, you'll have hands-on experience with:

1. **LLM Integration Patterns** — Prompt engineering, async generation, cost management
2. **Full-Stack Feature Development** — Backend model → migration → API → frontend
3. **Advanced React Patterns** — Context providers, IntersectionObserver, bottom sheets
4. **Mobile-First UX** — Touch targets, iOS quirks, responsive breakpoints
5. **File Upload Pipeline** — Multipart form data, binary processing, async extraction
6. **Email Infrastructure** — Inbound webhooks, DNS/MX records, parsing
7. **Typography Engineering** — CSS custom properties, variable fonts, line metrics
8. **Data Visualization** — SVG heatmaps, activity tracking, stats aggregation
9. **Web Scraping** — Multi-extractor fallbacks, UA rotation, paywall strategies
10. **Product Design** — Microcopy, progressive disclosure, emotional design
