"use client";

import { Eye, PenLine,  Check } from "lucide-react";
import { ProjectData } from "@/lib/api";
import { ColumnDiff, ImportDiff, TaskDiffItem } from "@/lib/workspace-backup";

interface BoardImportPreviewProps {
  project: ProjectData;
  diff: ImportDiff;
  isApplying: boolean;
  onApply: () => void;
  onCancel: () => void;
  onEditJson: () => void;
}

export function BoardImportPreview({
  project,
  diff,
  isApplying,
  onApply,
  onCancel,
  onEditJson,
}: BoardImportPreviewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview action bar */}
      <div className="shrink-0 border-b border-theme-subtle bg-surface-l1 px-3 md:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-accent-subtle text-accent flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-theme-primary leading-tight">
              Preview import · {project.name}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <PreviewChip tone="accent" show={diff.columnsAdded > 0}>
                +{diff.columnsAdded} column{diff.columnsAdded === 1 ? "" : "s"}
              </PreviewChip>
              <PreviewChip tone="accent" show={diff.tasksAdded > 0}>
                +{diff.tasksAdded} task{diff.tasksAdded === 1 ? "" : "s"}
              </PreviewChip>
              <PreviewChip tone="neutral" show={diff.columnsReplaced > 0}>
                {diff.columnsReplaced} column{diff.columnsReplaced === 1 ? "" : "s"} updated
              </PreviewChip>
              <PreviewChip tone="danger" show={diff.columnsRemoved > 0}>
                −{diff.columnsRemoved} column{diff.columnsRemoved === 1 ? "" : "s"}
              </PreviewChip>
              <PreviewChip tone="danger" show={diff.tasksRemoved > 0}>
                −{diff.tasksRemoved} task{diff.tasksRemoved === 1 ? "" : "s"}
              </PreviewChip>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEditJson}
            className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-surface-l3 hover:bg-surface-l4 border border-theme-subtle text-theme-primary flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Edit JSON</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-[13px] font-medium text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying}
            className="px-4 py-1.5 rounded-md bg-brand-accent hover:bg-brand-accent-hover text-on-accent text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isApplying ? "Applying…" : "Apply import"}</span>
          </button>
        </div>
      </div>

      {/* Read-only board preview */}
      <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-none">
        <div className="flex gap-4 p-4 md:p-6 items-start w-max min-w-full">
          {diff.columns.map((column, index) => (
            <PreviewColumn key={column.id ?? `${column.status}-${column.name}-${index}`} diff={column} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewChip({
  tone,
  show,
  children,
}: {
  tone: "accent" | "danger" | "neutral";
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  const toneClass =
    tone === "accent"
      ? "bg-accent-subtle text-accent"
      : tone === "danger"
        ? "bg-semantic-danger-subtle text-semantic-danger"
        : "bg-surface-l3 text-theme-secondary";
  return (
    <span className={`px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold font-mono leading-none ${toneClass}`}>
      {children}
    </span>
  );
}

function PreviewColumn({ diff }: { diff: ColumnDiff }) {
  const isRemoved = diff.status === "removed";
  const barColor =
    diff.status === "removed" ? "var(--semantic-danger)" : diff.status === "unchanged" ? null : "var(--brand-accent)";
  const taskWord = (count: number) => `task${count === 1 ? "" : "s"}`;

  return (
    <article
      className={`relative w-[280px] shrink-0 rounded-md border border-theme-subtle bg-surface-l2 flex flex-col max-h-[calc(100vh-260px)] overflow-hidden ${
        isRemoved ? "opacity-70" : ""
      }`}
    >
      {/* Slim left-edge status indicator, like a git diff gutter */}
      {barColor && (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: barColor }}
          aria-hidden="true"
        />
      )}

      <header className="shrink-0 pl-4 pr-3 py-2.5 border-b border-theme-subtle bg-surface-l2 rounded-t-md">
        <div className="flex items-center gap-2 min-w-0">
          {diff.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: diff.color }} />
          )}
          <h3
            className={`text-[14px] font-medium truncate min-w-0 ${
              isRemoved ? "text-theme-tertiary line-through" : "text-theme-primary"
            }`}
          >
            {diff.name}
          </h3>
          {diff.status === "added" && <ColumnBadge tone="accent">NEW</ColumnBadge>}
          {diff.status === "replaced" && <ColumnBadge tone="neutral">CHANGED</ColumnBadge>}
          {isRemoved && <ColumnBadge tone="danger">DELETED</ColumnBadge>}
        </div>
        <div className="text-[11px] text-theme-tertiary mt-1 font-mono">
          {isRemoved
            ? `${diff.removedTaskCount} ${taskWord(diff.removedTaskCount)} will be deleted`
            : `${diff.newTaskCount} ${taskWord(diff.newTaskCount)}${
                diff.removedTaskCount > 0 ? ` · −${diff.removedTaskCount} removed` : ""
              }`}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {diff.taskItems.length === 0 ? (
          <p className="text-[12px] text-theme-tertiary px-1 py-2">No tasks</p>
        ) : (
          diff.taskItems.map((item, index) => <TaskRow key={index} item={item} />)
        )}
      </div>
    </article>
  );
}

function ColumnBadge({ tone, children }: { tone: "accent" | "danger" | "neutral"; children: React.ReactNode }) {
  const toneClass =
    tone === "accent"
      ? "bg-accent-subtle text-accent"
      : tone === "danger"
        ? "bg-semantic-danger-subtle text-semantic-danger"
        : "bg-surface-l3 text-theme-secondary";
  return (
    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold leading-none shrink-0 ${toneClass}`}>
      {children}
    </span>
  );
}

function TaskRow({ item }: { item: TaskDiffItem }) {
  const rowClass =
    item.status === "added"
      ? "bg-accent-subtle text-theme-primary"
      : item.status === "removed"
        ? "bg-semantic-danger-subtle text-theme-tertiary line-through"
        : "text-theme-secondary";
  return <div className={`px-2.5 py-1.5 rounded-md text-[12.5px] leading-snug ${rowClass}`}>{item.title}</div>;
}
