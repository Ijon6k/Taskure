// Utility helper functions for requested image variants (thumbnails & previews).
// The backend derives every variant (preview + persisted thumbnails) from the
// original object key, so these only need to point back at the original URL
// with a width parameter.

/** Rewrites an internal storage URL (MinIO host) into the publicly served path. */
export function normalizeStorageUrl(url?: string): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/[^\/]+(\/storage\/.*)/i, "$1");
}

/** Removes the width query param from a variant URL, returning the original. */
function stripWidthParam(url: string): string {
  return url.replace(/[?&]w=\d+/g, "");
}

/** True when the URL belongs to a generated image variant (width-replaceable). */
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

/** Adds a width query param to a variant URL (or returns the original URL when not scalable). */
function withWidth(url: string, width: number): string {
  const normalized = normalizeStorageUrl(url);
  if (!normalized.includes("/storage/") || !isScalableImage(normalized)) {
    return normalized;
  }
  return `${stripWidthParam(normalized)}?w=${width}`;
}

/** Returns the small variant URL (or original when no variant exists). */
export function getThumbnailUrl(url?: string, width = 200): string {
  if (!url) return "";
  return withWidth(url, width);
}

/** Returns the preview-width variant URL (or original when no variant exists). */
export function getPreviewUrl(url?: string, width = 800): string {
  if (!url) return "";
  return withWidth(url, width);
}

/** Returns the original-resolution URL for a stored object. */
export function getOriginalUrl(url?: string): string {
  if (!url) return "";
  return stripWidthParam(normalizeStorageUrl(url));
}
