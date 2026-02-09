# Testing the Highlight Connections Feature

This guide will help you test the new highlight connections feature that finds semantic connections between highlights across different articles.

## Prerequisites

1. **Database migration applied**
2. **At least 2-3 articles with highlights** in your database
3. **Celery worker running**

## Step 1: Apply Database Migration

```bash
cd content-queue-backend
alembic upgrade head
```

This adds the `embedding` column to the `highlights` table.

## Step 2: Start Celery Worker

In a separate terminal:

```bash
cd content-queue-backend
celery -A app.core.celery_app worker --loglevel=info
```

Keep this running in the background.

## Step 3: Generate Highlight Embeddings

Run the embedding script:

```bash
cd content-queue-backend
python scripts/embed_highlights.py
```

**What this does:**
- Finds all users in the database
- Queues a batch embedding task for each user
- The task embeds all highlights that don't already have embeddings

**Expected output:**
```
Found 1 user(s)

Queueing highlight embeddings for user: your@email.com (uuid-here)
  Task ID: task-uuid-here

✓ All embedding tasks queued successfully!

Check Celery worker logs to see progress.
```

**Check the Celery logs** to see the embeddings being generated:
```
Successfully embedded 5 highlights for user abc-123
```

## Step 4: Verify Embeddings Were Created

Check the database:

```bash
psql -d your_database_name
```

```sql
-- Check how many highlights have embeddings
SELECT
  COUNT(*) as total_highlights,
  COUNT(embedding) as highlights_with_embeddings
FROM highlights;

-- See sample highlights with embeddings
SELECT id, text, embedding IS NOT NULL as has_embedding
FROM highlights
LIMIT 5;
```

## Step 5: Test the Backend API

Get a JWT token first (login via the frontend or API).

### Test 1: Find connections for a specific highlight

```bash
TOKEN="your_jwt_token"
HIGHLIGHT_ID="highlight-uuid-from-database"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/search/connections/${HIGHLIGHT_ID}?limit=10&threshold=0.3"
```

**Expected response:**
```json
[
  {
    "item": {
      "id": "other-highlight-id",
      "text": "Similar text from another article",
      "color": "yellow",
      "similarity_score": 0.85
    },
    "from_article_id": "article-uuid",
    "from_article_title": "Article Title"
  }
]
```

### Test 2: Find all connections for an article

```bash
ARTICLE_ID="article-uuid-from-database"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/search/connections/article/${ARTICLE_ID}"
```

**Expected response:**
```json
[
  {
    "article_id": "connected-article-uuid",
    "article_title": "Connected Article Title",
    "highlight_pairs": [
      {
        "user_highlight_id": "highlight-1-uuid",
        "user_highlight_text": "Your highlight text",
        "connected_highlight_id": "highlight-2-uuid",
        "connected_highlight_text": "Similar highlight from other article",
        "similarity": 0.82
      }
    ],
    "total_similarity": 0.82
  }
]
```

## Step 6: Test the Frontend UI

### Connection Indicators

1. Open an article that has highlights with embeddings
2. Look for **small blue dots** next to highlighted text
3. These appear when a highlight has connections to other articles

### Connections Panel

1. Open an article in the Reader
2. Press **'c'** key or click the **"Connections"** button in the navbar
3. The connections panel should slide in from the left side
4. You should see:
   - List of connected articles
   - Number of highlight connections per article
   - Preview of highlight pairs (yours ↔ theirs)
   - Similarity scores

### Click Connection Indicator

1. Click the **blue dot** next to a highlighted text
2. The connections panel should automatically open
3. You'll see the connections for that specific highlight

### Navigate to Connected Articles

1. In the connections panel, click on an article title
2. You should navigate to that article
3. If you click on a specific highlight pair, it should navigate to that article and scroll to the connected highlight

## Step 7: Test Keyboard Shortcuts

- **'c'** - Toggle connections panel
- **'h'** - Toggle highlights panel
- **Esc** - Back to dashboard

## Troubleshooting

### No connections appear

**Possible causes:**
1. **Embeddings not generated yet** - Wait for Celery task to complete
2. **Not enough highlights** - Need at least 2-3 articles with multiple highlights
3. **Highlights are too different** - Try highlighting similar concepts across articles

**Check embeddings:**
```sql
SELECT COUNT(*) FROM highlights WHERE embedding IS NOT NULL;
```

### Connection indicator doesn't show

**Verify the highlight has connections:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/search/connections/${HIGHLIGHT_ID}?limit=1"
```

If empty array `[]`, the highlight has no similar highlights in other articles.

### Connections panel is empty

**Check browser console for errors:**
- Open DevTools → Console
- Look for API errors or failed requests

**Check backend logs:**
```bash
# In the backend terminal
tail -f logs/app.log  # or wherever your logs are
```

### Task failed in Celery

**Check Celery logs for errors:**
- Look for API key issues: `OPENAI_API_KEY` must be set
- Look for rate limiting: Too many requests to OpenAI
- Look for token limits: Highlights are too long (unlikely, they're short)

## Expected Behavior

### Connection Quality Settings

The system uses these filters to ensure high-quality connections:

- **Similarity threshold**: 75% (0.75) - Only shows very similar highlights
- **Minimum highlight length**: 20 characters - Filters out short, generic text
- **Cosine similarity**: Uses OpenAI embeddings for semantic matching

You can adjust the threshold by modifying the API calls in [lib/api.ts](frontend/lib/api.ts).

### Good Test Case

Create highlights like:

**Article 1 - "AI Safety":**
- "AI alignment is a critical problem that requires careful consideration"
- "We need to ensure AI systems are beneficial to humanity"

**Article 2 - "Machine Learning Ethics":**
- "Ensuring AI systems align with human values is essential"
- "Beneficial AI requires careful design and ethical frameworks"

**Expected connections:**
- "AI alignment" ↔ "align with human values" (high similarity ~0.85+)
- "beneficial AI" ↔ "Beneficial AI requires" (high similarity ~0.88+)

### Poor Test Case (Should NOT Connect)

**Article 1 - "Cooking Pasta":**
- "Boil water for 10 minutes before adding pasta"

**Article 2 - "Machine Learning":**
- "Train the model for 10 epochs with batch size 32"

**Expected:** No connections shown (different semantic domains, similarity < 75%)

## Performance Notes

- **Embedding generation:** ~0.5-1 second per highlight (batched)
- **Connection search:** <100ms (vector search is very fast)
- **Panel loading:** Should be instant once embeddings exist

## Cost Estimates

Using OpenAI `text-embedding-3-small`:
- **~$0.0001 per highlight** (very cheap)
- **100 highlights = $0.01**
- **1000 highlights = $0.10**

Connection searches are **free** (just vector database queries).

## Next Steps

Once you verify the feature works:

1. **Add periodic task** to auto-embed highlights every 5 minutes
2. **Add UI indicator** for "embeddings in progress"
3. **Add connection strength threshold** in settings
4. **Consider adding highlight-to-paragraph connections** (2.4 in roadmap - optional)

## Cleanup and Maintenance

### Automatic Cleanup (Production)

A Celery beat task runs **daily** to automatically hard-delete articles that have been soft-deleted for more than 7 days:

- Task: `cleanup_old_deleted_items`
- Schedule: Every 24 hours
- What it does: Hard deletes old soft-deleted articles (CASCADE automatically removes highlights)

To start the Celery beat scheduler:

```bash
cd content-queue-backend
celery -A app.core.celery_app beat --loglevel=info
```

### Manual Cleanup (One-time)

To clean up existing orphaned highlights from already-deleted articles:

```bash
cd content-queue-backend

# Dry run first (see what would be deleted)
python scripts/cleanup_orphaned_highlights.py --dry-run

# Actually delete
python scripts/cleanup_orphaned_highlights.py
```

## Summary Checklist

- [ ] Migration applied (`embedding` column + CASCADE constraint)
- [ ] Celery worker running
- [ ] Celery beat running (for daily cleanup)
- [ ] Embeddings generated (check database)
- [ ] Backend API returns connections (test with curl)
- [ ] Connection indicators appear in Reader
- [ ] Connections panel opens (press 'c' or click button)
- [ ] Panel shows connected articles and highlight pairs
- [ ] Clicking connections navigates to articles
- [ ] TOC hides when connections panel is open
- [ ] No 404 errors in console (orphaned highlights cleaned up)
