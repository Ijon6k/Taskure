/**
 * Tiptap extension set for the notebook editor.
 *
 * - StarterKit provides headings, marks, lists, history; its `codeBlock` is
 *   disabled because `CodeBlockLowlight` renders highlighted code instead.
 * - `@tiptap/markdown` round-trips ProseMirror <-> markdown (GFM: tables,
 *   task lists, strikethrough). We persist that markdown string straight to
 *   the DB — no HTML/JSON in the content column.
 *
 * Single source of truth for the editor schema; read-only renderers should
 * import `buildNotebookExtensions()` from here.
 */

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Markdown } from "@tiptap/markdown";
import { common, createLowlight } from "lowlight";
import { SlashMenu } from "./notebook-slash-extension";
import { NotebookTabHandling } from "./notebook-tab-extension";
import { MarkdownPaste } from "./markdown-paste-extension";

/** Shared lowlight instance for code-block syntax highlighting. */
export const lowlight = createLowlight(common);

export function buildNotebookExtensions() {
  return [
    // Markdown <-> ProseMirror. `contentType: 'markdown'` is set on the editor
    // (not here) so initial content strings parse as markdown.
    Markdown.configure({
      markedOptions: { gfm: true, breaks: false },
    }),

    StarterKit.configure({
      codeBlock: false, // CodeBlockLowlight below
    }),

    Placeholder.configure({
      placeholder: "Write something…  (/  for commands)",
      emptyEditorClass:
        "before:content-[attr(data-placeholder)] before:text-theme-tertiary before:float-left before:h-0 before:pointer-events-none",
    }),

    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "text",
      HTMLAttributes: { class: "notebook-code-block" },
    }),

    // GFM tables, resizable via column drag.
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "notebook-table" },
    }),
    TableRow,
    TableHeader,
    TableCell,

    // GFM task lists (`- [ ]` / `- [x]`).
    TaskList.configure({
      HTMLAttributes: { class: "notebook-task-list" },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { class: "notebook-task-item" },
    }),

    // `/` command popover (headings, lists, table, code block, quote, divider).
    SlashMenu,

    // Notion-style Tab: cell navigation / list indent / literal tab.
    NotebookTabHandling,

    // Paste markdown as formatted content instead of raw text.
    MarkdownPaste,
  ];
}
