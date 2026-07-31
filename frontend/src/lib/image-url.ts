// Utility helper functions for requested image variants (thumbnails & previews)

export function normalizeStorageUrl(url?: string): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/[^\/]+(\/storage\/.*)/i, "$1");
}

export function getThumbnailUrl(url?: string, width = 200): string {
  if (!url) return "";
  const normalized = normalizeStorageUrl(url);
  if (!isScalableImage(normalized)) return normalized;

  let base = normalized.replace(/[?&]w=\d+/, "");
  if (base.includes("/storage/")) {
    base = base.replace(/\.(png|jpg|jpeg|gif)$/i, ".webp");
    if (!base.toLowerCase().endsWith(".webp")) {
      base = `${base}.webp`;
    }
  }

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}w=${width}`;
}

export function getPreviewUrl(url?: string, width = 800): string {
  if (!url) return "";
  const normalized = normalizeStorageUrl(url);
  if (!isScalableImage(normalized)) return normalized;

  let base = normalized.replace(/[?&]w=\d+/, "");
  if (base.includes("/storage/")) {
    base = base.replace(/\.(png|jpg|jpeg|gif)$/i, ".webp");
    if (!base.toLowerCase().endsWith(".webp")) {
      base = `${base}.webp`;
    }
  }

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}w=${width}`;
}

export function getOriginalUrl(url?: string): string {
  if (!url) return "";
  const normalized = normalizeStorageUrl(url);
  return normalized.replace(/[?&]w=\d+/, "");
}

function isScalableImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes(".svg") || lower.includes(".pdf")) return false;
  return (
    lower.includes("/storage/") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
}
