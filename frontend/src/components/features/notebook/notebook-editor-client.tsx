"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "@phosphor-icons/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useUpdateNotebookPage } from "@/lib/api/queries/use-notebook";
import type { NotebookPageDetailData } from "@/lib/api/types";
import { NOTEBOOK_TEXT_SIZES, useNotebookSettings } from "@/store/use-notebook-settings";
import { buildNotebookExtensions } from "./extensions";
import { NotebookBubbleMenu } from "./notebook-bubble-menu";
import { useNotebookAutosave } from "./use-notebook-autosave";
import { NotebookEditorHeader } from "./notebook-editor-header";
import { NotebookEditorEmpty } from "./notebook-editor-empty";
import { cn } from "@/lib/utils";

/**
 * Client-only TipTap editor, loaded via `next/dynamic({ ssr: false })` from
 * `notebook-editor.tsx` (TipTap touches `window`/`document` at init and would
 * flash under hydration).
 *
 * Owns the local draft state, debounced autosave (with flush-on-unmount),
 * the persistent header, and the floating BubbleMenu.
 */

type Draft = { title: string; content: string };

export interface NotebookEditorClientProps {
  projectId: string;
  page: NotebookPageDetailData | undefined;
  onCreatePage: () => void;
  onDeletePage: (id: string) => void;
  loading?: boolean;
}

export function NotebookEditorClient({
  projectId,
  page,
  onCreatePage,
  onDeletePage,
  loading,
}: NotebookEditorClientProps) {
  const { mutateAsync: updatePage } = useUpdateNotebookPage(projectId);
  const { textSize } = useNotebookSettings();

  // Title mirrored to local state so it autosaves with the same draft as the
  // body. Initial value comes from the server-loaded page.
  const [title, setTitle] = useState<string>(page?.title ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  // Scroll container ref, for the always-visible "back to top" button.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Ref-mirror of `title` for the long-lived `onUpdate` closure. Synced in an
  // effect to satisfy the React 19 ref-during-render lint rule.
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Stable wrapper so autosave's effects don't re-fire on every render.
  const save = useMemo(
    () => (id: string, d: Draft) => updatePage({ id, data: d }),
    [updatePage]
  );

  const { saveStatus, flushNow } = useNotebookAutosave<Draft>({
    pageId: page?.id,
    draft,
    save,
  });

  // Cmd/Ctrl+S = explicit save, bypassing the debounce. Registered at window
  // level because TipTap captures keys inside its content area.
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        void flushNow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flushNow]);

  // Sync the title mirror when the page object changes (covers autosave
  // cache refreshes; id changes already remount the editor via `key`).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-to-state sync; id changes already remount via `key` upstream
    setTitle(page?.title ?? "");
    setDraft(null);
  }, [page?.id, page?.title]);

  // TipTap instance. `contentType: 'markdown'` makes `@tiptap/markdown` parse
  // the initial `content` string instead of treating it as ProseMirror JSON.
  const extensions = useMemo(() => buildNotebookExtensions(), []);
  const editor = useEditor(
    {
      extensions,
      content: page?.content ?? "",
      contentType: "markdown",
      autofocus: "end",
      editorProps: {
        attributes: {
          class: cn(
            "notebook-prose focus:outline-none min-h-[50vh]",
            "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-theme-primary",
            "prose-p:text-theme-secondary prose-strong:text-theme-primary prose-em:text-theme-primary",
            "prose-a:text-brand-accent prose-a:no-underline hover:prose-a:underline"
          ),
        },
      },
      onUpdate({ editor: ed }) {
        // Stamp the canonical markdown onto the draft for autosave, keeping
        // whatever title the user typed (fallback: page's server title).
        const content = ed.getMarkdown();
        setDraft((prev) => ({
          content,
          title: prev?.title ?? titleRef.current ?? page?.title ?? "",
        }));
      },
    },
    // Recreate the editor when the page id changes so fresh `content` loads
    // into a clean ProseMirror state (belt-and-braces on top of `key`).
    [page?.id]
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setDraft((prev) => ({
      content: prev?.content ?? editor?.getMarkdown() ?? "",
      title: value,
    }));
  };

  // Pin / export / delete.
  const handleTogglePin = () => {
    if (!page) return;
    void updatePage({ id: page.id, data: { is_pinned: !page.is_pinned } });
  };

  const handleExport = () => {
    if (!editor || !page) return;
    const blob = new Blob([editor.getMarkdown()], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title || page.title || "page"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Empty state.
  if (!page) {
    if (loading) return <NotebookEditorLoading />;
    return <NotebookEditorEmpty onCreate={onCreatePage} />;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <NotebookEditorHeader
        page={page}
        saveStatus={saveStatus}
        textSize={textSize}
        onTogglePin={handleTogglePin}
        onExport={handleExport}
        onDelete={() => onDeletePage(page.id)}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[1120px] mx-auto px-4 md:px-8 py-8 space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent text-2xl font-semibold tracking-tight text-theme-primary placeholder-theme-tertiary focus:outline-none"
          />

          <div
            className="notebook-editor"
            // fontSize on the wrapper cascades through the editor's em-based
            // typography. This is how the "A / A / A" header buttons scale
            // the document without us reaching into ProseMirror's schema.
            style={{ fontSize: NOTEBOOK_TEXT_SIZES[textSize] }}
          >
            {editor && (
              <BubbleMenu
                editor={editor}
                className="px-1 py-1 rounded-md border border-theme-subtle bg-theme-surface shadow-xl"
              >
                <NotebookBubbleMenu editor={editor} />
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Back to top — fixed to the viewport bottom-right so it's always
          visible regardless of how far the document is scrolled. */}
      <button
        type="button"
        aria-label="Back to top"
        onClick={() =>
          scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
        }
        className="notebook-scroll-to-top"
      >
        <ArrowUp size={15} />
      </button>
    </div>
  );
}

function NotebookEditorLoading() {
  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-4xl px-8 py-8 space-y-4 animate-pulse">
        <div className="h-7 w-1/3 bg-theme-elevated rounded-md" />
        <div className="h-48 bg-theme-elevated rounded-md" />
      </div>
    </div>
  );
}