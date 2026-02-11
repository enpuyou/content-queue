
from PIL import Image
import os

MAX_SIZE = 1000 * 1024 # 1000 KB

IMAGES = [
    "frontend/public/img/GrQ_uQTWAAAOBDl.jpeg",
    "frontend/public/img/G3ApVFdXkAAPj-m.jpeg",
    "frontend/public/img/Gp3xXltX0AEFi_O.jpeg"
]

def resize_image(path):
    try:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            return

        img = Image.open(path)
        original_size = os.path.getsize(path)

        if original_size <= MAX_SIZE:
            print(f"Skipping {path} (Size: {original_size/1024:.2f} KB) - OK")
            return

        print(f"Resizing {path} (Original: {original_size/1024:.2f} KB)...")

        while True:
            # Simple approach: Resize dimensions to 1600px width max if > 1600
            width, height = img.size
            if width > 1600:
                new_width = 1600
                new_height = int(height * (1600 / width))
                # Compatible resampling
                resample = Image.ANTIALIAS if hasattr(Image, 'ANTIALIAS') else (Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
                img = img.resize((new_width, new_height), resample)

            # Save with 80 quality
            img.save(path, quality=80, optimize=True)

            new_size = os.path.getsize(path)
            print(f"New size: {new_size/1024:.2f} KB")

            if new_size < MAX_SIZE:
                break

            # If still too big, brute force scale down further
            width, height = img.size
            resample = Image.ANTIALIAS if hasattr(Image, 'ANTIALIAS') else (Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.LANCZOS)
            img = img.resize((int(width * 0.9), int(height * 0.9)), resample)

    except Exception as e:
        print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    base_dir = "/Users/enpuyou/cmpsc/projects/content-queue"
    os.chdir(base_dir)

    for img_path in IMAGES:
        resize_image(img_path)
