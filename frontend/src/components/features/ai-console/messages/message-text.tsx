"use client";

import { memo } from "react";
import type { ConsoleMessage } from "../store";
import { Markdown } from "./markdown";

interface MessageTextProps {
  message: ConsoleMessage;
}

export const MessageText = memo(function MessageText({ message }: MessageTextProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-xl text-[15px] leading-relaxed ${
          isUser
            ? "bg-brand-accent text-text-on-accent rounded-br-md whitespace-pre-wrap"
            : "bg-surface-l3 text-theme-primary border border-theme-subtle rounded-bl-md"
        }`}
      >
        {isUser ? message.content : <Markdown content={message.content} />}
      </div>
    </div>
  );
});
