"use client";

import { memo, useState, useCallback } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import type { ConsoleMessage } from "../store";
import { Markdown } from "./markdown";

interface MessageTextProps {
  message: ConsoleMessage;
}

export const MessageText = memo(function MessageText({ message }: MessageTextProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  if (isUser) {
    return (
      <div className="flex justify-end w-full py-1">
        <div className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-surface-l2 text-theme-primary border border-theme-subtle text-[14.5px] leading-relaxed whitespace-pre-wrap shadow-xs">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant: Clean direct flow (NO chat bubble)
  return (
    <div className="w-full py-2 group">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-md bg-surface-l2 border border-theme-subtle text-theme-secondary flex items-center justify-center shrink-0 mt-0.5 select-none shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <Markdown content={message.content} />

          {/* Action bar on completed message */}
          {message.content && message.executionState === "done" && (
            <div className="flex items-center gap-3 mt-3 pt-2 text-[12px] text-theme-tertiary">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-l2 hover:text-theme-primary transition-colors cursor-pointer text-[12px]"
                title="Copy full response"
                aria-label="Copy full response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-semantic-success" />
                    <span className="text-semantic-success font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {message.contextUsage && (
                <span className="text-[11px] font-mono text-theme-tertiary">
                  {message.contextUsage.used} tokens
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
