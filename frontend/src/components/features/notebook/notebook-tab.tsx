"use client";

import { useState } from "react";
import { CaretLeft, CaretRight, ListDashes, X } from "@phosphor-icons/react";
import {
  useCreateNotebookPage,
  useDeleteNotebookPage,
  useNotebookPage,
  useNotebookPages,
  useUpdateNotebookPage,
} from "@/lib/api/queries/use-notebook";
import { NotebookPageList } from "./notebook-page-list";
import { NotebookEditor } from "./notebook-editor";
import { cn } from "@/lib/utils";

interface NotebookTabProps {
  projectId: string;
}

/** Notebook tab: pages rail + document editor, seamless with the viewport and collapsible. */
export function NotebookTab({ projectId }: NotebookTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const { data: pages = [], isLoading: pagesLoading } = useNotebookPages(projectId);
  // Fall back to the first page when nothing is selected yet (or the selected
  // one was deleted) — derived state, no sync effect needed.
  const activeId = selectedId ?? pages[0]?.id ?? null;
  const { data: page } = useNotebookPage(activeId ?? "");
  const { mutate: createPage, isPending: creating } = useCreateNotebookPage(projectId);
  const { mutate: updatePage } = useUpdateNotebookPage(projectId);
  const { mutate: deletePage } = useDeleteNotebookPage(projectId);

  const handleCreate = () => {
    createPage(
      {},
      {
        onSuccess: (created) => {
          setSelectedId(created.id);
          setRailOpen(false);
        },
      }
    );
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setRailOpen(false);
  };

  const handleTogglePin = (id: string, isPinned: boolean) => {
    updatePage({ id, data: { is_pinned: isPinned } });
  };

  const handleDeletePage = (id: string) => {
    deletePage(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null);
      },
    });
  };

  const editorLoading = pagesLoading || (activeId != null && !page);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Mobile rail trigger */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-theme-elevated text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
        >
          <ListDashes className="w-3.5 h-3.5" />
          Pages
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-brand-accent-subtle font-mono">
            {pages.length}
          </span>
        </button>
        <span className="truncate text-[13px] font-medium text-theme-secondary">
          {page?.title ?? (pagesLoading ? "Loading…" : "")}
        </span>
      </div>

      {/* Body: rail + editor */}
      <div className="flex flex-1 min-h-0">
        {collapsed ? (
          /* Retracted: a slim seam to pull the pages back in. */
          <div className="hidden md:flex flex-col items-center pt-4 w-8 shrink-0">
            <button
              type="button"
              title="Show pages"
              aria-label="Show pages"
              onClick={() => setCollapsed(false)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-black hover:opacity-90 bg-brand-accent shadow-xs transition-all cursor-pointer"
            >
              <CaretRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative hidden md:block shrink-0">
            <NotebookPageList
              pages={pages}
              selectedId={activeId}
              onSelect={handleSelect}
              onCreate={handleCreate}
              onTogglePin={handleTogglePin}
              isCreating={creating}
              loading={pagesLoading}
              className="flex h-full"
            />
            {/* Seam handle: half on the rail, half on the editor — one control, no bar. */}
            <button
              type="button"
              title="Hide pages"
              aria-label="Hide pages"
              onClick={() => setCollapsed(true)}
              className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-7 rounded-full bg-brand-accent text-black shadow-sm flex items-center justify-center hover:opacity-90 border border-black/10 transition-all cursor-pointer"
            >
              <CaretLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <NotebookEditor
          key={activeId ?? "none"}
          projectId={projectId}
          page={page}
          onCreatePage={handleCreate}
          onDeletePage={handleDeletePage}
          loading={editorLoading}
        />
      </div>

      {/* Mobile rail drawer */}
      <div
        className={cn("fixed inset-0 z-40 md:hidden", !railOpen && "pointer-events-none")}
        aria-hidden={!railOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            railOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setRailOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 bg-theme-surface shadow-2xl transition-transform duration-200",
            railOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-end px-2 pt-2 shrink-0">
            <button
              type="button"
              title="Close pages"
              aria-label="Close pages"
              onClick={() => setRailOpen(false)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <NotebookPageList
            pages={pages}
            selectedId={activeId}
            onSelect={handleSelect}
            onCreate={handleCreate}
            onTogglePin={handleTogglePin}
            isCreating={creating}
            loading={pagesLoading}
            className="h-full flex"
          />
        </div>
      </div>
    </div>
  );
}
