"use client";

import {
  TextB,
  TextItalic,
  TextHOne,
  TextHTwo,
  Code,
  Quotes,
  ListBullets,
  ListNumbers,
  ListChecks,
  LinkSimple,
  TextStrikethrough,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

/**
 * Floating formatting toolbar that follows the text selection. Replaces the
 * old textarea mirror-div hack — TipTap's BubbleMenu handles positioning.
 */

type ToolDef = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  /** Returns true if the mark/node is active at the current selection. */
  isActive: (e: Editor) => boolean;
  /** Applies / toggles the mark/node. */
  run: (e: Editor) => void;
  /** Disable when the editor can't apply this (e.g. heading outside paragraph). */
  isDisabled?: (e: Editor) => boolean;
};

const TOOLS: ToolDef[] = [
  {
    key: "h1",
    label: "Heading 1",
    icon: TextHOne,
    isActive: (e) => e.isActive("heading", { level: 1 }),
    isDisabled: (e) => !e.can().toggleHeading({ level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    key: "h2",
    label: "Heading 2",
    icon: TextHTwo,
    isActive: (e) => e.isActive("heading", { level: 2 }),
    isDisabled: (e) => !e.can().toggleHeading({ level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    key: "bold",
    label: "Bold",
    icon: TextB,
    isActive: (e) => e.isActive("bold"),
    isDisabled: (e) => !e.can().toggleBold(),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    key: "italic",
    label: "Italic",
    icon: TextItalic,
    isActive: (e) => e.isActive("italic"),
    isDisabled: (e) => !e.can().toggleItalic(),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    key: "strike",
    label: "Strikethrough",
    icon: TextStrikethrough,
    isActive: (e) => e.isActive("strike"),
    isDisabled: (e) => !e.can().toggleStrike(),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    key: "code",
    label: "Inline code",
    icon: Code,
    isActive: (e) => e.isActive("code"),
    isDisabled: (e) => !e.can().toggleCode(),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  {
    key: "quote",
    label: "Quote",
    icon: Quotes,
    isActive: (e) => e.isActive("blockquote"),
    isDisabled: (e) => !e.can().toggleBlockquote(),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    key: "bullet",
    label: "Bullet list",
    icon: ListBullets,
    isActive: (e) => e.isActive("bulletList"),
    isDisabled: (e) => !e.can().toggleBulletList(),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    key: "ordered",
    label: "Numbered list",
    icon: ListNumbers,
    isActive: (e) => e.isActive("orderedList"),
    isDisabled: (e) => !e.can().toggleOrderedList(),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    key: "task",
    label: "Task list",
    icon: ListChecks,
    isActive: (e) => e.isActive("taskList"),
    isDisabled: (e) => !e.can().toggleTaskList(),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    key: "link",
    label: "Link",
    icon: LinkSimple,
    isActive: (e) => e.isActive("link"),
    isDisabled: (e) => !e.can().setLink({ href: "" }),
    run: (e) => {
      const previous: string | undefined = e.getAttributes("link").href;
      const url = window.prompt("Link URL", previous ?? "https://");
      if (url === null) return;
      // Empty string clears the link (TipTap convention).
      const chain = e.chain().focus();
      if (url === "") chain.unsetLink().run();
      else chain.extendMarkRange("link").setLink({ href: url }).run();
    },
  },
];

interface NotebookBubbleMenuProps {
  editor: Editor | null;
}

export function NotebookBubbleMenu({ editor }: NotebookBubbleMenuProps) {
  if (!editor) return null;
  return (
    <div
      className="flex items-center gap-0.5 px-0.5 py-0.5 overflow-x-auto no-scrollbar"
      role="toolbar"
      aria-label="Formatting tools"
    >
      {TOOLS.map(({ key, label, icon: Icon, isActive, isDisabled, run }) => {
        const active = isActive(editor);
        const disabled = isDisabled?.(editor) ?? false;
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(ev) => ev.preventDefault() /* keep selection */}
            onClick={() => run(editor)}
            className={cn(
              "w-7 h-7 shrink-0 rounded-md flex items-center justify-center transition-colors cursor-pointer",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              active
                ? "bg-brand-accent-subtle text-brand-accent"
                : "text-theme-secondary hover:text-theme-primary hover:bg-surface-hover"
            )}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}