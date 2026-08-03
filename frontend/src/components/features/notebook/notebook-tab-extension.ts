import { Extension } from "@tiptap/core";

/**
 * Notion-style Tab handling.
 *
 * Browsers let Tab move focus out of a contenteditable by default; this
 * extension gives it an in-editor meaning instead:
 *  - Table: move to next/previous cell (handled by the built-in Table keymap,
 *    which runs first thanks to our lower `priority`).
 *  - List:  indent (sink) / outdent (lift) the item.
 *  - Else:  insert a literal tab character.
 */

export const NotebookTabHandling = Extension.create({
  name: "notebook-tab-handling",
  // Below Table's default priority (100) so it doesn't double-advance cells.
  priority: 90,

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { editor } = this;
        if (editor.isActive("listItem")) {
          return editor.chain().focus().sinkListItem("listItem").run();
        }
        return editor.chain().focus().insertContent("\t").run();
      },
      "Shift-Tab": () => {
        const { editor } = this;
        if (editor.isActive("listItem")) {
          return editor.chain().focus().liftListItem("listItem").run();
        }
        return false; // let the browser traverse focus backwards
      },
    };
  },
});
