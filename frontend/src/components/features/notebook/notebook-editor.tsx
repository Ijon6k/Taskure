"use client";

import dynamic from "next/dynamic";
import type { NotebookEditorClientProps } from "./notebook-editor-client";

/**
 * Server-safe wrapper. The TipTap editor loads client-only via
 * `dynamic(..., { ssr: false })` — `useEditor` touches `window`/`document`
 * and would otherwise cause a hydration mismatch. This also keeps the
 * ProseMirror bundle out of the initial route chunk.
 */

const NotebookEditorClient = dynamic(
  () => import("./notebook-editor-client").then((mod) => mod.NotebookEditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-start justify-center overflow-y-auto">
        <div className="w-full max-w-4xl px-8 py-8 space-y-4 animate-pulse">
          <div className="h-7 w-1/3 bg-theme-elevated rounded-md" />
          <div className="h-48 bg-theme-elevated rounded-md" />
        </div>
      </div>
    ),
  }
);

export function NotebookEditor(props: NotebookEditorClientProps) {
  return <NotebookEditorClient {...props} />;
}