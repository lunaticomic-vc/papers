"use client";

import { useEffect, useState } from "react";
import type { DictionaryEntry } from "@/lib/db/schema";
import Markdown from "./Markdown";

export default function DictionaryList() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async (query = "") => {
    setLoading(true);
    const url = query
      ? `/api/dictionary?q=${encodeURIComponent(query)}`
      : "/api/dictionary";
    const res = await fetch(url);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(q), 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const remove = async (entry: DictionaryEntry) => {
    if (!confirm(`Remove "${entry.term}" from dictionary?`)) return;
    await fetch(`/api/dictionary/${entry.id}`, { method: "DELETE" });
    load(q);
  };

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search terms…"
        className="mb-6 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {q
            ? `No terms match "${q}".`
            : "Nothing here yet. Highlight text while reading and hit \"Add to dictionary\"."}
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold">{e.term}</h2>
                <button
                  onClick={() => remove(e)}
                  className="shrink-0 text-xs text-[var(--muted)] underline hover:text-red-600"
                >
                  remove
                </button>
              </div>
              {e.contextSnippet && (
                <blockquote className="mt-2 border-l-2 border-[var(--border)] pl-3 text-xs italic text-[var(--muted)]">
                  “{e.contextSnippet.slice(0, 240)}
                  {e.contextSnippet.length > 240 ? "…" : ""}”
                </blockquote>
              )}
              <div className="mt-3">
                <Markdown>{e.definition}</Markdown>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                added {new Date(e.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
