"""
Test endpoint for serving sample PDFs during development.
"""

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/test", tags=["test"])

# Resolve the PDF directory relative to the project root
# From: app/api/test_pdf.py
# Up to: content-queue-backend/ -> content-queue/ (project root)
PDF_DIR = Path(__file__).resolve().parent.parent.parent.parent / "pdf"


@router.get("/pdf")
async def serve_test_pdf():
    """
    Serve the sample PDF for testing PDF ingestion.

    Usage: Paste http://localhost:8000/api/test/pdf into the app URL input.
    """
    pdf_path = PDF_DIR / "TabPFN_copy.pdf"

    if not pdf_path.exists():
        return {"error": f"PDF not found at {pdf_path}"}

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="TabPFN_copy.pdf",
    )


@router.get("/pdf_chem")
async def serve_test_pdf_chem():
    """
    Serve the sample PDF for testing PDF ingestion.

    Usage: Paste http://localhost:8000/api/test/pdf into the app URL input.
    """
    pdf_path = PDF_DIR / "3d-printed-protein.pdf"

    if not pdf_path.exists():
        return {"error": f"PDF not found at {pdf_path}"}

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="3d-printed-protein.pdf",
    )
