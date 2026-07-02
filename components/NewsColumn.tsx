"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";

function hostOf(url: string | null): string {
  if (!url) return "news.ycombinator.com";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function relTime(ms: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

type Mode = "top" | "topics" | "top-fallback";

export default function NewsColumn() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [mode, setMode] = useState<Mode>("topics");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        if (cancelled) return;
        if (data.error) setError(data.error);
        setMode((data.mode as Mode) ?? "topics");
        setItems(data.items ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const modeLabel =
    mode === "topics"
      ? "For your topics"
      : mode === "top-fallback"
        ? "No topic hits — showing top"
        : "Top stories";

  return (
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 lg:sticky lg:top-20 lg:self-start">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Tech news
          </h2>
          <div className="mt-0.5 text-[10px] text-[var(--muted)]">{modeLabel}</div>
        </div>
        <a
          href="https://news.ycombinator.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[var(--muted)] underline hover:text-[var(--foreground)]"
        >
          Hacker News
        </a>
      </div>

      {items === null && !error && (
        <p className="text-xs text-[var(--muted)]">Loading…</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {items && items.length > 0 && (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={item.id} className="text-sm leading-snug">
              <div>
                <span className="mr-1 text-[var(--muted)] tabular-nums">{i + 1}.</span>
                <a
                  href={item.url ?? item.hnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  {item.title}
                </a>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-[var(--muted)]">
                <span>{hostOf(item.url)}</span>
                <span>·</span>
                <span>{item.score} pts</span>
                <span>·</span>
                <a
                  href={item.hnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)]"
                >
                  {item.descendants} comments
                </a>
                <span>·</span>
                <span>{relTime(item.time)} ago</span>
              </div>
              {item.matchedTopics.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.matchedTopics.slice(0, 3).map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent),transparent_90%)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent)]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
