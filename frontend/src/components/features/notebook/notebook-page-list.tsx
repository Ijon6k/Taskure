"use client";

import { useState } from "react";
import { FileText, Plus, PushPin, PushPinSlash } from "@phosphor-icons/react";
import { NotebookPageData } from "@/lib/api";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

interface NotebookPageListProps {
  pages: NotebookPageData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  isCreating: boolean;
  loading?: boolean;
  className?: string;
}

/** Left rail: search + pinned/all page list for the notebook tab. */
export function NotebookPageList({
  pages,
  selectedId,
  onSelect,
  onCreate,
  onTogglePin,
  isCreating,
  loading,
  className,
}: NotebookPageListProps) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : pages;
  const pinned = filtered.filter((p) => p.is_pinned);
  const rest = filtered.filter((p) => !p.is_pinned);

  return (
    <aside className={cn("w-60 lg:w-64 shrink-0 flex-col select-none", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
        <span className="text-[11px] font-medium text-theme-tertiary">
          Pages
        </span>
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          title="New page"
          aria-label="New page"
          className="w-7 h-7 rounded-md flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2.5 shrink-0">
        <div className="border border-theme-subtle rounded-md bg-surface-l2 px-2.5 hover:border-brand-accent/40 focus-within:border-brand-accent/40 transition-colors">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search pages..."
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
        {loading ? (
          <div className="space-y-1 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-theme-elevated animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {pinned.length > 0 && !query && (
              <PageGroup label="Pinned">
                {pinned.map((page) => (
                  <PageRow
                    key={page.id}
                    page={page}
                    active={page.id === selectedId}
                    onSelect={onSelect}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </PageGroup>
            )}

            <PageGroup label={query ? "Results" : "All pages"}>
              {rest.map((page) => (
                <PageRow
                  key={page.id}
                  page={page}
                  active={page.id === selectedId}
                  onSelect={onSelect}
                  onTogglePin={onTogglePin}
                />
              ))}
            </PageGroup>

            {filtered.length === 0 && query && (
              <div className="px-2.5 py-4 text-center">
                <p className="text-[12px] text-theme-tertiary">No pages found.</p>
                <p className="text-[12px] text-theme-tertiary mt-0.5">Try a different search.</p>
              </div>
            )}

            {!loading && !query && pages.length === 0 && (
              <div className="px-2.5 py-6 text-center space-y-3">
                <FileText className="w-5 h-5 mx-auto text-theme-tertiary" />
                <p className="text-[13px] text-theme-secondary">No pages yet.</p>
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={isCreating}
                  className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-full text-[12px] font-medium bg-brand-accent text-black hover:opacity-90 transition-all active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New page
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function PageGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="px-2 py-1 text-[11px] font-medium text-theme-tertiary">
        {label}
      </div>
      {children}
    </div>
  );
}

function PageRow({
  page,
  active,
  onSelect,
  onTogglePin,
}: {
  page: NotebookPageData;
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(page.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(page.id);
        }
      }}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
        active
          ? "bg-theme-elevated text-theme-primary font-medium"
          : "text-theme-secondary hover:bg-surface-hover hover:text-theme-primary"
      )}
    >
      <FileText className="w-3.5 h-3.5 shrink-0 text-theme-tertiary" />
      <span className="flex-1 truncate text-[13px]">{page.title}</span>
      <button
        type="button"
        title={page.is_pinned ? "Unpin page" : "Pin page"}
        aria-label={page.is_pinned ? "Unpin page" : "Pin page"}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(page.id, !page.is_pinned);
        }}
        className={cn(
          "w-6 h-6 shrink-0 rounded-md flex items-center justify-center transition-all cursor-pointer",
          page.is_pinned
            ? "text-brand-accent opacity-100"
            : "text-theme-tertiary hover:text-theme-primary opacity-0 group-hover:opacity-100"
        )}
      >
        {page.is_pinned ? <PushPin className="w-3 h-3" /> : <PushPinSlash className="w-3 h-3" />}
      </button>
    </div>
  );
}
