"use client";

import { memo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language?: string | undefined;
  code: string;
}

const CodeBlock = memo(function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-3 rounded-xl border border-theme-subtle bg-surface-l1 overflow-hidden group shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface-l2/70 border-b border-theme-subtle text-[11px] text-theme-secondary font-mono">
        <span className="uppercase tracking-wider font-medium">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-surface-l3 hover:text-theme-primary text-theme-tertiary transition-colors cursor-pointer"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-semantic-success" />
              <span className="text-[11px] text-semantic-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] font-mono leading-relaxed text-theme-primary">
        <code>{code}</code>
      </pre>
    </div>
  );
});

/**
 * Renders AI/assistant messages as clean, prose-style GitHub-flavored Markdown.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[14.5px] leading-relaxed text-theme-primary select-text break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]} code={codeString} />;
            }
            // Multi-line code block without language
            if (codeString.includes("\n")) {
              return <CodeBlock language="" code={codeString} />;
            }
            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-surface-l2 border border-theme-subtle text-[13px] font-mono text-theme-primary"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent hover:underline underline-offset-2 font-medium"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-lg border border-theme-subtle">
                <table className="w-full text-[13.5px] border-collapse">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-b border-theme-subtle px-3 py-2 text-left font-medium text-theme-secondary bg-surface-l2">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-b border-theme-subtle/50 px-3 py-2 text-theme-primary">
                {children}
              </td>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2.5 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2.5 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-theme-subtle pl-3.5 my-2.5 italic text-theme-secondary">
                {children}
              </blockquote>
            );
          },
          h1({ children }) {
            return (
              <h1 className="text-[17px] font-bold text-theme-primary mt-4 mb-2 first:mt-0 tracking-tight">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-[15.5px] font-semibold text-theme-primary mt-3.5 mb-1.5 first:mt-0 tracking-tight">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-[14.5px] font-semibold text-theme-primary mt-3 mb-1 first:mt-0">
                {children}
              </h3>
            );
          },
          hr() {
            return <hr className="my-4 border-theme-subtle" />;
          },
          strong({ children }) {
            return <strong className="font-semibold text-theme-primary">{children}</strong>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
