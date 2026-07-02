"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Paper } from "@/lib/db/schema";

interface QueueItem extends Paper {
  matchedTopicNames: string[];
}

export default function QueueList() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/queue");
    const data = await res.json();
    setItems(data.papers ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const unsave = async (paperId: number) => {
    await fetch(`/api/papers/${paperId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: false }),
    });
    load();
  };

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Nothing here yet. Save a paper from the Today card or from the reader.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="mb-2 flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
            <span>saved {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : ""}</span>
            <span>·</span>
            <span>{p.arxivCategories.slice(0, 3).join(" / ")}</span>
          </div>
          <Link href={`/read/${p.id}`} className="block">
            <h2 className="text-lg font-semibold leading-snug hover:text-[var(--accent)] transition-colors">
              {p.title}
            </h2>
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">{p.authors.join(", ")}</p>
          {p.matchedTopicNames.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.matchedTopicNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent),transparent_88%)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 line-clamp-3 text-sm text-[var(--foreground)]/80">
            {p.abstract}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/read/${p.id}`}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Read
            </Link>
            <button
              onClick={() => unsave(p.id)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[color-mix(in_oklab,var(--muted),transparent_90%)]"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
