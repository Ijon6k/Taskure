/**
 * Slash-command extension. Typing `/` opens a popover of block-level
 * commands (headings, lists, table, code block, quote, divider); filter by
 * typing, navigate with arrows, Enter to select, Esc to close.
 *
 * Built on `@tiptap/suggestion` + `ReactRenderer` — positioning is handled
 * by Floating UI via `props.mount`, no manual DOM math.
 */

import { Extension } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import {
  SlashMenuPopover,
  SLASH_ITEMS,
  type SlashItem,
  type SlashMenuPopoverHandle,
  type SlashMenuPopoverProps,
} from "./notebook-slash-menu";

export const SlashMenu = Extension.create({
  name: "slash-menu",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false, // can appear anywhere in a line
        allowSpaces: false, // typing space closes the popover

        items: ({ query }) => {
          if (!query) return SLASH_ITEMS;
          const q = query.toLowerCase();
          return SLASH_ITEMS.filter(
            (item) =>
              item.key.toLowerCase().includes(q) ||
              item.label.toLowerCase().includes(q)
          );
        },

        // Delete the `/query` text, then run the item's command (synchronous).
        command: ({ editor, range, props: item }) => {
          editor.chain().focus().deleteRange(range).run();
          item.run(editor);
        },

        render: () => {
          let component: ReactRenderer<SlashMenuPopoverHandle, SlashMenuPopoverProps> | null =
            null;
          let unmountFn: (() => void) | null = null;

          const buildProps = (
            props: SuggestionProps<SlashItem>
          ): SlashMenuPopoverProps => ({
            items: props.items,
            query: props.query,
            noFilter: !props.query,
            onSelect: (index: number) => {
              const sel = props.items[index];
              if (sel) props.command(sel);
            },
          });

          return {
            onStart(props: SuggestionProps<SlashItem>) {
              component = new ReactRenderer(SlashMenuPopover, {
                editor: props.editor,
                props: buildProps(props),
              });
              unmountFn = props.mount(component.element);
            },

            onUpdate(props: SuggestionProps<SlashItem>) {
              component?.updateProps(buildProps(props));
            },

            onKeyDown(props: SuggestionKeyDownProps): boolean {
              if (props.event.key === "Escape") {
                return true; // consumed by Suggestion plugin → onExit
              }
              return (
                (component?.ref as SlashMenuPopoverHandle | null)?.onKeyDown(
                  props.event
                ) ?? false
              );
            },

            onExit() {
              unmountFn?.();
              component?.destroy();
              component = null;
              unmountFn = null;
            },
          };
        },
      }),
    ];
  },
});