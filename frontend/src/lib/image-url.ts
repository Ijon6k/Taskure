// Utility helper functions for requested image variants (thumbnails & previews).
// The backend derives every variant (preview + persisted thumbnails) from the
// original object key, so these only need to point back at the original URL
// with a width parameter.

export function normalizeStorageUrl(url?: string): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/[^\/]+(\/storage\/.*)/i, "$1");
}

function stripWidthParam(url: string): string {
  return url.replace(/[?&]w=\d+/g, "");
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

function withWidth(url: string, width: number): string {
  const normalized = normalizeStorageUrl(url);
  if (!normalized.includes("/storage/") || !isScalableImage(normalized)) {
    return normalized;
  }
  return `${stripWidthParam(normalized)}?w=${width}`;
}

export function getThumbnailUrl(url?: string, width = 200): string {
  if (!url) return "";
  return withWidth(url, width);
}

export function getPreviewUrl(url?: string, width = 800): string {
  if (!url) return "";
  return withWidth(url, width);
}

export function getOriginalUrl(url?: string): string {
  if (!url) return "";
  return stripWidthParam(normalizeStorageUrl(url));
}
