"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Paper } from "@/lib/db/schema";
import Markdown from "./Markdown";

interface MatchedTopic {
  id: number;
  name: string;
}

type NextResponse =
  | { paper: Paper; reasoning: string; matchedTopics: MatchedTopic[]; message?: never }
  | { paper: null; reasoning: null; matchedTopics: MatchedTopic[]; message: string };

export default function TodayCard() {
  const router = useRouter();
  const [state, setState] = useState<NextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/papers/next", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [busy, setBusy] = useState<"skip" | "save" | "open" | null>(null);

  const skip = async () => {
    if (!state?.paper) return;
    setBusy("skip");
    await fetch(`/api/papers/${state.paper.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "skipped" }),
    });
    await load();
    setBusy(null);
  };

  const save = async () => {
    if (!state?.paper) return;
    setBusy("save");
    await fetch(`/api/papers/${state.paper.id}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: true }),
    });
    await fetch(`/api/papers/${state.paper.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "skipped" }),
    });
    await load();
    setBusy(null);
  };

  const open = async () => {
    if (!state?.paper) return;
    setBusy("open");
    await fetch(`/api/papers/${state.paper.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "opened" }),
    });
    router.push(`/read/${state.paper.id}`);
  };

  if (loading) return <CardShell><Skeleton /></CardShell>;
  if (error) {
    return (
      <CardShell>
        <p className="text-sm text-red-600">Failed to load: {error}</p>
        <button onClick={load} className="mt-3 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white">
          Retry
        </button>
      </CardShell>
    );
  }
  if (!state?.paper) {
    return (
      <CardShell>
        <p className="text-sm text-[var(--muted)]">
          {state?.message ?? "No paper available."}
        </p>
        <button onClick={load} className="mt-3 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
          Try again
        </button>
      </CardShell>
    );
  }

  const paper = state.paper;
  const published = new Date(paper.publishedAt);

  return (
    <CardShell>
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
        <span>{published.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
        <span>·</span>
        <span>{paper.arxivCategories.slice(0, 3).join(" / ")}</span>
        <span>·</span>
        <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] underline">
          arXiv:{paper.arxivId}
        </a>
      </div>
      <h2 className="text-xl font-semibold leading-snug">{paper.title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{paper.authors.join(", ")}</p>

      {state.matchedTopics.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            matched
          </span>
          {state.matchedTopics.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent),transparent_88%)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--accent),transparent_92%)] p-4">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--accent)]">Why this one</div>
        <Markdown>{state.reasoning}</Markdown>
      </div>

      <details className="mt-5 group">
        <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          Abstract
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/90">{paper.abstract}</p>
      </details>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={open}
          disabled={busy !== null}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy === "open" ? "Opening…" : "Read"}
        </button>
        <button
          onClick={save}
          disabled={busy !== null}
          className="rounded-md border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent),transparent_92%)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:opacity-90 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save for later"}
        </button>
        <button
          onClick={skip}
          disabled={busy !== null}
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[color-mix(in_oklab,var(--muted),transparent_90%)] disabled:opacity-50"
        >
          {busy === "skip" ? "Skipping…" : "Skip"}
        </button>
      </div>
    </CardShell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-3 w-1/3 rounded bg-[var(--border)]" />
      <div className="h-6 w-4/5 rounded bg-[var(--border)]" />
      <div className="h-3 w-1/2 rounded bg-[var(--border)]" />
      <div className="mt-6 h-20 rounded bg-[var(--border)]" />
    </div>
  );
}
