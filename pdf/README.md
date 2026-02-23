# Local PDF Test Fixtures

This directory is **gitignored** — files here are never committed (they exceed GitHub's 1 MB limit).

## How to set up

Place the following PDFs here locally to use the dev test endpoints:

| File | Source |
|------|--------|
| `TabPFN_copy.pdf` | Any copy of the TabPFN paper (arXiv:2501.02945) |
| `3d-printed-protein.pdf` | Any copy of the 3D-printed protein structure paper |

## How to test PDF ingestion locally

1. Ensure `DEBUG=true` is set in your `.env`.
2. Start the backend: `poetry run uvicorn app.main:app --reload`
3. Paste one of these URLs into the app's URL input:
   - `http://localhost:8000/api/test/pdf` — serves `TabPFN_copy.pdf`
   - `http://localhost:8000/api/test/pdf_chem` — serves `3d-printed-protein.pdf`
4. The app will treat the local URL as a PDF and run the full extraction pipeline.

> **Note:** `GET /api/test/*` routes are only mounted when `DEBUG=true`.
> They are never available in production.
