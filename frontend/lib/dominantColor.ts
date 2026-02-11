/**
 * Extract the dominant color from an image URL using a canvas.
 * Returns an "rgb(r,g,b)" string or null if extraction fails (CORS, load error, etc.).
 */
export function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Sample at small size for performance
        const size = 16;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Average all pixel colors, skip very dark/very light (likely bg)
        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i],
            pg = data[i + 1],
            pb = data[i + 2];
          const brightness = (pr + pg + pb) / 3;
          if (brightness > 20 && brightness < 235) {
            r += pr;
            g += pg;
            b += pb;
            count++;
          }
        }
        if (count === 0) {
          resolve(null);
          return;
        }
        resolve(
          `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`,
        );
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
