"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI/assistant messages as GitHub-flavored Markdown (tables, code
 * blocks, lists, links). react-markdown is safe by default — it does not
 * use dangerouslySetInnerHTML.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <code
                className="px-1.5 py-0.5 rounded bg-surface-l2 border border-theme-subtle text-[13px]"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="mt-2 mb-2 p-3 rounded-lg bg-surface-l1 border border-theme-subtle overflow-x-auto text-[13px]">
                {children}
              </pre>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-[13px] border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-theme-subtle px-2 py-1 text-left font-semibold bg-surface-l2">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-theme-subtle px-2 py-1">{children}</td>
            );
          },
          li({ children }) {
            return <li className="my-0.5">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-lg font-bold my-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-base font-bold my-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-[15px] font-bold my-1.5">{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
