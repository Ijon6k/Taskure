import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Paste markdown as formatted content.
 *
 * `@tiptap/markdown` only parses the *initial* editor content — paste events
 * fall through to ProseMirror's default HTML/text handler, so pasting from a
 * `.md` file lands as raw `# heading` / `**bold**` text. This extension
 * detects markdown-looking clipboard text and re-inserts it via the
 * `insertContent(..., { contentType: "markdown" })` command that
 * `@tiptap/markdown` registers. Plain text passes through untouched.
 */

/** Heuristic: does this text look like markdown worth parsing? */
function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)\s*(#{1,6}\s|[>*+-]\s|\d+\.\s|- \[[ xX]\]|```|^\|.*\|)/m.test(
    text
  );
}

export const MarkdownPaste = Extension.create({
  name: "markdown-paste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdown-paste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (!text || !looksLikeMarkdown(text)) return false;

            event.preventDefault();
            this.editor
              .chain()
              // contentType: "markdown" parses the string into ProseMirror JSON.
              .insertContent(text, { contentType: "markdown" } as never)
              .run();
            return true;
          },
        },
      }),
    ];
  },
});
