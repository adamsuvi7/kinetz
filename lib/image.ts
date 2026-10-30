export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscale before upload: Gemini doesn't need full-res, and serverless request bodies are capped (~4.5MB on Vercel).
export function toJpegDataUrl(src: HTMLImageElement | HTMLCanvasElement, max = 1024) {
  const w0 = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
  const h0 = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * scale);
  c.height = Math.round(h0 * scale);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}
