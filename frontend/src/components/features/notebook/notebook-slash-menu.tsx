"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  Code,
  Table as TableIcon,
  Minus,
  TextT,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ──────── item types ────────

export interface SlashItem {
  /* Unique key, also used as the filterable text. */
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string }>;
  /* Executed when the user picks this item. The editor is already focused
  and the /query range has been deleted by the extension. */
  run: (editor: Editor) => void;
}

// ──────── command table ────────

export const SLASH_ITEMS: SlashItem[] = [
  {
    key: "text",
    label: "Text",
    description: "Start writing plain text.",
    icon: TextT,
    run: (ed) => ed.chain().focus().setParagraph().run(),
  },
  {
    key: "h1",
    label: "Heading 1",
    description: "Large section heading.",
    icon: TextHOne,
    run: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    key: "h2",
    label: "Heading 2",
    description: "Medium section heading.",
    icon: TextHTwo,
    run: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    key: "h3",
    label: "Heading 3",
    description: "Small section heading.",
    icon: TextHThree,
    run: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    key: "bullet",
    label: "Bullet list",
    description: "Unordered list of items.",
    icon: ListBullets,
    run: (ed) => ed.chain().focus().toggleBulletList().run(),
  },
  {
    key: "ordered",
    label: "Numbered list",
    description: "Ordered list of items.",
    icon: ListNumbers,
    run: (ed) => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    key: "task",
    label: "Task list",
    description: "Checklist with checkboxes.",
    icon: ListChecks,
    run: (ed) => ed.chain().focus().toggleTaskList().run(),
  },
  {
    key: "quote",
    label: "Quote",
    description: "Blockquote for citations.",
    icon: Quotes,
    run: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    key: "code",
    label: "Code block",
    description: "Syntax-highlighted code.",
    icon: Code,
    run: (ed) => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    key: "table",
    label: "Table",
    description: "3×3 GFM table, resizable.",
    icon: TableIcon,
    run: (ed) => insertTableWithCursorInFirstCell(ed),
  },
  {
    key: "divider",
    label: "Divider",
    description: "Horizontal rule.",
    icon: Minus,
    run: (ed) => ed.chain().focus().setHorizontalRule().run(),
  },
];

// ──────── popover component ────────

/**
 * Inserts a table, then places the cursor in its first cell.
 *
 * TipTap's `insertTable` leaves the selection around the table node, so the
 * user would otherwise keep typing in the paragraph above it.
 */
function insertTableWithCursorInFirstCell(ed: Editor): void {
  ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  // Wait a tick for ProseMirror to settle the insert, then find the first
  // cell via a depth-first walk of the table node.
  setTimeout(() => {
    try {
      if (!ed.isActive("table")) return;

      const doc = ed.state.doc;
      const { $from } = ed.state.selection;
      const tablePos = $from.before(1); // position of the enclosing table node
      const tableNode = doc.nodeAt(tablePos);
      if (!tableNode) return;

      let firstCellPos: number | null = null;
      tableNode.forEach((child, offset) => {
        if (firstCellPos !== null) return;
        child.forEach((grandchild, grandOffset) => {
          if (firstCellPos !== null) return;
          if (
            grandchild.type.name === "tableCell" ||
            grandchild.type.name === "tableHeader"
          ) {
            firstCellPos = tablePos + 1 + offset + grandOffset;
          }
        });
      });

      if (firstCellPos !== null) {
        ed.chain().focus().setTextSelection(firstCellPos).run();
      }
    } catch {
      // Cursor placement failed; table is still inserted, user can click in.
    }
  }, 0);
}

interface SlashMenuPopoverProps {
  items: SlashItem[];
  query: string;
  /** If true, all items match — show everything. */
  noFilter: boolean;
  /* Callback when the user picks an item by index. */
  onSelect: (index: number) => void;
}

export type { SlashMenuPopoverProps };

export interface SlashMenuPopoverHandle {
  onKeyDown: (ev: KeyboardEvent) => boolean;
}

export const SlashMenuPopover = forwardRef<SlashMenuPopoverHandle, SlashMenuPopoverProps>(
  function SlashMenuPopover({ items, query, noFilter, onSelect }, ref) {
    const [selected, setSelected] = useState(0);

    // Wrap `selected` back to valid bounds when `items` change.
    useEffect(() => {
      if (items.length === 0) setSelected(0);
      else setSelected((s) => Math.min(Math.max(s, 0), items.length - 1));
    }, [items.length]);

    // Expose keyboard handler to the Tiptap Suggestion plugin so arrow /
    // enter / escape are captured inside the popover before they reach the
    // parent ProseMirror view.
    useImperativeHandle(
      ref,
      () => ({
        onKeyDown(ev: KeyboardEvent): boolean {
          if (ev.key === "ArrowDown") {
            setSelected((s) => (s + 1) % items.length);
            return true; // consume
          }
          if (ev.key === "ArrowUp") {
            setSelected((s) => (s - 1 + items.length) % items.length);
            return true;
          }
          if (ev.key === "Enter") {
            onSelect(selected);
            return true;
          }
          if (ev.key === "Escape") {
            return true; // consumed by suggestion plugin → onExit
          }
          return false; // let ProseMirror handle other keys
        },
      }),
      [selected, items.length, onSelect]
    );

    if (items.length === 0) return null;

    return (
      <div
        className="flex flex-col w-64 max-h-72 overflow-y-auto rounded-lg border border-theme-subtle bg-surface-l4 shadow-2xl py-1 animate-in fade-in-0 slide-in-from-top-1"
        role="listbox"
        aria-label="Commands"
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = i === selected;

          // Highlight matching chars in the label when filtering.
          const matchIndex = noFilter
            ? -1
            : item.key.toLowerCase().indexOf(query.toLowerCase());

          return (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(i)}
              onMouseEnter={() => setSelected(i)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors",
                active
                  ? "bg-brand-accent-subtle text-brand-accent"
                  : "text-theme-secondary hover:bg-surface-hover"
              )}
            >
              <span className="shrink-0"><Icon size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight">
                  {matchIndex >= 0 ? (
                    <>
                      {item.label.slice(0, matchIndex)}
                      <mark className="bg-transparent text-theme-primary font-semibold">
                        {item.label.slice(matchIndex, matchIndex + query.length)}
                      </mark>
                      {item.label.slice(matchIndex + query.length)}
                    </>
                  ) : (
                    item.label
                  )}
                </div>
                <div className="text-[11px] text-theme-tertiary truncate">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);