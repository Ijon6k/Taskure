"use client";

import { useEffect, useRef, memo } from "react";
import { useAIConsoleStore } from "./store";
import { MessageText, MessageProgress, MessageEmptyState, MessageActivities } from "./messages";

export const MessageStream = memo(function MessageStream() {
  const messages = useAIConsoleStore((s) => s.messages);
  const executionState = useAIConsoleStore((s) => s.executionState);
  const mode = useAIConsoleStore((s) => s.mode);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledUpRef.current = !isNearBottom;
  };

  // Auto-scroll to latest message if user has not scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, executionState]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
    >
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {messages.length === 0 && (!executionState || executionState === "idle") ? (
          <MessageEmptyState mode={mode} />
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {msg.role === "assistant" && msg.activities && msg.activities.length > 0 && (
                <div className="pl-9">
                  <MessageActivities activities={msg.activities} />
                </div>
              )}
              <MessageText message={msg} />
              {msg.role === "assistant" &&
                msg.executionState &&
                msg.executionState !== "done" && (
                  <div className="pl-9">
                    <MessageProgress executionState={msg.executionState} />
                  </div>
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
            <div className="pl-9">
              <MessageProgress executionState={executionState} />
            </div>
          )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
});
