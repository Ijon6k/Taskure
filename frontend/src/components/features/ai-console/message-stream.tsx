"use client";

import { useEffect, useRef, memo } from "react";
import { useAIConsoleStore } from "./store";
import { MessageText, MessageProgress, MessageEmptyState } from "./messages";

export const MessageStream = memo(function MessageStream() {
  const messages = useAIConsoleStore((s) => s.messages);
  const executionState = useAIConsoleStore((s) => s.executionState);
  const mode = useAIConsoleStore((s) => s.mode);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.length === 0 && (!executionState || executionState === "idle") ? (
        <MessageEmptyState mode={mode} />
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <MessageText message={msg} />
            {msg.role === "assistant" &&
              msg.executionState &&
              msg.executionState !== "done" && (
                <MessageProgress executionState={msg.executionState} />
              )}
          </div>
        ))
      )}

      {/* Streaming indicator when no assistant message placeholder exists yet */}
      {executionState !== "idle" &&
        executionState !== "done" &&
        executionState !== "error" &&
        messages.length > 0 &&
        messages[messages.length - 1]?.role === "user" && (
          <MessageProgress executionState={executionState} />
        )}

      <div ref={bottomRef} />
    </div>
  );
});
