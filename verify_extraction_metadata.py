
import sys
import os
import asyncio
from pathlib import Path

# Add backend path to sys.path
# content-queue-backend is in the same directory as this script
backend_path = Path(__file__).resolve().parent / "content-queue-backend"
sys.path.append(str(backend_path))

from app.tasks.extraction_implementations import extract_with_yolo, _wrap_html
from app.models.content import ContentItem

def test_metadata_injection():
    print("Testing metadata injection...")

    # 1. Test _wrap_html
    body = "<p>Test content</p>"
    confidence = 85
    title = "Test Paper Title"
    abstract = "This is a test abstract."

    html = _wrap_html(body, confidence, title, abstract)

    if f'<meta name="extraction-confidence" content="{confidence}">' not in html:
        print("FAIL: Confidence meta tag missing")
        return False

    if f'<meta name="extraction-title" content="{title}">' not in html:
        print("FAIL: Title meta tag missing")
        return False

    if f'<meta name="extraction-description" content="{abstract}">' not in html:
        print("FAIL: Abstract meta tag missing")
        return False

    print("PASS: _wrap_html injects metadata correctly")

    # 2. Test extraction.py logic (simulated)
    import re

    # Simulate extraction.py parsing
    injected_title = None
    injected_abstract = None

    title_match = re.search(r'<meta name="extraction-title" content="([^"]+)">', html)
    if title_match:
        injected_title = title_match.group(1)

    desc_match = re.search(r'<meta name="extraction-description" content="([^"]+)">', html)
    if desc_match:
        injected_abstract = desc_match.group(1)

    if injected_title != title:
        print(f"FAIL: Title parsing mismatch. Expected '{title}', got '{injected_title}'")
        return False

    if injected_abstract != abstract:
        print(f"FAIL: Abstract parsing mismatch. Expected '{abstract}', got '{injected_abstract}'")
        return False

    print("PASS: Metadata parsing logic works")
    return True

if __name__ == "__main__":
    if test_metadata_injection():
        print("\nAll tests passed!")
        sys.exit(0)
    else:
        print("\nTests failed!")
        sys.exit(1)
