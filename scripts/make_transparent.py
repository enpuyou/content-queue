
from PIL import Image
import numpy as np

def make_transparent(input_path, output_path, threshold=45):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if pixel is "black" enough
            # item is (R, G, B, A)
            if item[0] < threshold and item[1] < threshold and item[2] < threshold:
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved transparent image to {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_file = "/Users/enpuyou/cmpsc/projects/content-queue/frontend/public/img/R-6576-002.jpg"
    output_file = "/Users/enpuyou/cmpsc/projects/content-queue/frontend/public/img/R-6576-002.png"
    make_transparent(input_file, output_file, threshold=50)
