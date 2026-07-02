"use client";

import ReactMarkdown from "react-markdown";
import type { ComponentProps } from "react";

type Props = {
  children: string;
  className?: string;
  size?: "sm" | "base";
};

/**
 * Small styled wrapper around react-markdown for LLM output.
 * Renders bold/italic/lists/headings inline with our color tokens.
 */
export default function Markdown({ children, className = "", size = "sm" }: Props) {
  const text = size === "sm" ? "text-sm leading-relaxed" : "text-base leading-relaxed";
  return (
    <div className={`markdown ${text} ${className}`}>
      <ReactMarkdown
        components={{
          p: (props: ComponentProps<"p">) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
          strong: (props: ComponentProps<"strong">) => (
            <strong className="font-semibold text-[var(--foreground)]" {...props} />
          ),
          em: (props: ComponentProps<"em">) => <em className="italic" {...props} />,
          ul: (props: ComponentProps<"ul">) => (
            <ul className="my-2 list-disc space-y-1 pl-5" {...props} />
          ),
          ol: (props: ComponentProps<"ol">) => (
            <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />
          ),
          li: (props: ComponentProps<"li">) => <li className="marker:text-[var(--muted)]" {...props} />,
          h1: (props: ComponentProps<"h1">) => (
            <h1 className="mt-4 mb-2 text-base font-semibold" {...props} />
          ),
          h2: (props: ComponentProps<"h2">) => (
            <h2 className="mt-4 mb-2 text-base font-semibold" {...props} />
          ),
          h3: (props: ComponentProps<"h3">) => (
            <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />
          ),
          code: (props: ComponentProps<"code">) => (
            <code
              className="rounded bg-[color-mix(in_oklab,var(--muted),transparent_85%)] px-1 py-0.5 font-mono text-[0.85em]"
              {...props}
            />
          ),
          a: (props: ComponentProps<"a">) => (
            <a
              className="text-[var(--accent)] underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: (props: ComponentProps<"blockquote">) => (
            <blockquote
              className="my-2 border-l-2 border-[var(--border)] pl-3 italic text-[var(--muted)]"
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
