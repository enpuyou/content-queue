
from PIL import Image
import numpy as np
import sys

def crop_black_borders(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGB")
        data = np.array(img)

        # Mask of non-black pixels (assuming "black" might have some noise, so using a low threshold)
        # sum across channels, if < threshold then it's black
        threshold = 30 # Adjust if black is not perfectly black
        mask = np.sum(data, axis=2) > threshold

        # Find rows and columns where mask is True
        rows = np.any(mask, axis=1)
        cols = np.any(mask, axis=0)

        if not np.any(rows) or not np.any(cols):
            print("No non-black content found.")
            return

        ymin, ymax = np.where(rows)[0][[0, -1]]
        xmin, xmax = np.where(cols)[0][[0, -1]]

        # Add a small padding if desired, or just precise crop

        cropped = img.crop((xmin, ymin, xmax + 1, ymax + 1))
        cropped.save(output_path)
        print(f"Cropped image saved to {output_path}")
        print(f"Original size: {img.size}, New size: {cropped.size}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_file = "/Users/enpuyou/cmpsc/projects/content-queue/frontend/public/img/R-6576-002.jpg"
    crop_black_borders(input_file, input_file)
