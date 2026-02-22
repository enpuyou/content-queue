import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.tasks.extraction import extract_pdf_content

PDF_PATH = "../pdf/TabPFN_copy.pdf"
if len(sys.argv) > 1:
    PDF_PATH = sys.argv[1]

file_name = os.path.basename(PDF_PATH)
OUTPUT_HTML = f"verify_output_{file_name}.html"


def verify():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found at {PDF_PATH}")
        return

    print(f"Extracting content from {PDF_PATH}...")
    with open(PDF_PATH, "rb") as f:
        pdf_bytes = f.read()

    try:
        html = extract_pdf_content(pdf_bytes)

        with open(OUTPUT_HTML, "w") as f:
            f.write(html)

        print(f"\nSuccess! Extracted content saved to: {os.path.abspath(OUTPUT_HTML)}")
        print(f"File size: {len(html):,} bytes")
        print("\nPlease open this file in your browser to verify:")
        print(f"  open {OUTPUT_HTML}")

    except Exception as e:
        print(f"Extraction failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    verify()
