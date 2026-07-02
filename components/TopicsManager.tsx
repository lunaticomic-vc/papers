"use client";

import { useEffect, useState } from "react";
import type { Topic } from "@/lib/db/schema";

export default function TopicsManager() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState("");
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/topics");
    const data = await res.json();
    setTopics(data.topics ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const arxivCategories = categories
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const kws = keywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name || arxivCategories.length === 0) {
      setError("Name and at least one arXiv category required.");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, arxivCategories, keywords: kws }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add.");
    } else {
      setName("");
      setCategories("");
      setKeywords("");
      await load();
    }
    setBusy(false);
  };

  const toggleActive = async (topic: Topic) => {
    await fetch(`/api/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !topic.active }),
    });
    load();
  };

  const remove = async (topic: Topic) => {
    if (!confirm(`Delete topic "${topic.name}"?`)) return;
    await fetch(`/api/topics/${topic.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={add} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Add a topic</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-[var(--muted)]">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diffusion models"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-[var(--muted)]">
              arXiv categories (space or comma separated)
            </span>
            <input
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g. cs.CV cs.LG"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm font-mono outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="sm:col-span-2 text-sm">
            <span className="mb-1 block text-xs text-[var(--muted)]">
              Keywords (comma separated, optional — narrows the feed)
            </span>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. diffusion, DDPM, score matching"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add topic"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <section>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Your topics
        </div>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : topics.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No topics yet.</p>
        ) : (
          <ul className="space-y-2">
            {topics.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    {!t.active && (
                      <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        paused
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs text-[var(--muted)]">
                    {t.arxivCategories.map((c) => (
                      <span key={c} className="rounded bg-[color-mix(in_oklab,var(--muted),transparent_88%)] px-1.5 py-0.5 font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                  {t.keywords.length > 0 && (
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      keywords: {t.keywords.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => toggleActive(t)}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[color-mix(in_oklab,var(--muted),transparent_92%)]"
                  >
                    {t.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => remove(t)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
