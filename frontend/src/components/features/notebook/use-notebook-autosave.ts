"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounced autosave with a flush-on-unmount guarantee.
 *
 * Debounces keystroke drafts to one save per `debounceMs`, and guarantees the
 * latest draft is persisted when the editor unmounts (page switch, route
 * change). Editor-agnostic: only sees `pageId`, `draft`, and `save`.
 */

export type SaveStatus = "saving" | "saved" | null;

interface AutosaveOptions<T> {
  /** Active page id. Falsy values disable saving. */
  pageId: string | undefined;
  /** Current draft. `null` = clean, nothing to save. */
  draft: T | null;
  /** Async save call; resolves on success, rejects on failure. */
  save: (id: string, draft: T) => Promise<unknown>;
  /** Debounce window in ms. Default 600. */
  debounceMs?: number;
  /** How long the "Saved" badge stays visible. Default 1500. */
  savedBadgeMs?: number;
  /** Called when the freshest draft is confirmed saved. */
  onSaved?: (id: string, draft: T) => void;
  /** Called when the freshest draft fails to save. */
  onError?: (id: string, draft: T) => void;
}

export function useNotebookAutosave<T>({
  pageId,
  draft,
  save,
  debounceMs = 600,
  savedBadgeMs = 1500,
  onSaved,
  onError,
}: AutosaveOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);

  // Latest draft mirrored in a ref so the unmount flush sees the final value
  // after React state is gone. Synced in an effect (not during render) to
  // satisfy the React 19 ref-during-render lint rule.
  const pendingRef = useRef<{ id: string; draft: T } | null>(null);
  useEffect(() => {
    pendingRef.current = pageId && draft ? { id: pageId, draft } : null;
  }, [pageId, draft]);

  // Debounced autosave.
  useEffect(() => {
    if (!draft || !pageId) return;
    const timer = setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending) return;
      setSaveStatus("saving");
      save(pending.id, pending.draft)
        .then(() => {
          // Only mark "saved" if this is still the freshest draft — a newer
          // keystroke keeps us "saving" until its own debounce fires.
          if (pendingRef.current?.draft === pending.draft) {
            setSaveStatus("saved");
            onSaved?.(pending.id, pending.draft);
          }
        })
        .catch(() => {
          if (pendingRef.current?.draft === pending.draft) {
            setSaveStatus(null);
            onError?.(pending.id, pending.draft);
          }
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [draft, pageId, debounceMs, save, onSaved, onError]);

  // Auto-clear the "Saved" badge.
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus(null), savedBadgeMs);
    return () => clearTimeout(timer);
  }, [saveStatus, savedBadgeMs]);

  // Flush on unmount (fire-and-forget; the PATCH is idempotent).
  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (pending) void save(pending.id, pending.draft);
    };
  }, [save]);

  /** Flush now, bypassing the debounce (Cmd/Ctrl+S). `useCallback`-stable. */
  const flushNow = useCallback(async (): Promise<unknown> => {
    const pending = pendingRef.current;
    if (!pending) return null;
    setSaveStatus("saving");
    try {
      const result = await save(pending.id, pending.draft);
      if (pendingRef.current?.draft === pending.draft) {
        setSaveStatus("saved");
        onSaved?.(pending.id, pending.draft);
      }
      return result;
    } catch (err) {
      if (pendingRef.current?.draft === pending.draft) {
        setSaveStatus(null);
        onError?.(pending.id, pending.draft);
      }
      throw err;
    }
  }, [save, onSaved, onError]);

  return { saveStatus, flushNow };
}
