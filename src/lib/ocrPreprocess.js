function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load source image for OCR preprocessing."));
    img.src = source;
  });
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function toCanvas(img, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function grayscaleAndContrast(canvas, contrast = 1.35) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const adjusted = clamp((gray - 128) * contrast + 128);
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function adaptiveThreshold(canvas, threshold = 174) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const next = gray >= threshold ? 255 : 0;
    data[i] = next;
    data[i + 1] = next;
    data[i + 2] = next;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function sharpen(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = ctx.createImageData(src.width, src.height);
  const s = src.data;
  const d = out.data;
  const w = src.width;
  const h = src.height;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + channel;
            sum += s[idx] * kernel[k++];
          }
        }
        d[(y * w + x) * 4 + channel] = clamp(sum);
      }
      d[(y * w + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

export async function buildOcrVariants(source) {
  const img = await loadImage(source);
  const nativeWidth = img.naturalWidth || 1;
  const targetWidth = Math.min(2600, Math.max(1800, nativeWidth));
  const scale = Math.max(1, targetWidth / nativeWidth);

  const original = toCanvas(img, scale);
  const enhanced = sharpen(grayscaleAndContrast(toCanvas(img, scale), 1.45));
  const threshold = adaptiveThreshold(grayscaleAndContrast(toCanvas(img, scale), 1.55), 178);

  return [
    { id: "high_res", label: "High-resolution", image: original.toDataURL("image/png") },
    { id: "contrast", label: "Contrast + sharpen", image: enhanced.toDataURL("image/png") },
    { id: "threshold", label: "Binarized", image: threshold.toDataURL("image/png") },
  ];
}
