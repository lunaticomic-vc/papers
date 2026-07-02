"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Highlight, Paper } from "@/lib/db/schema";
import Markdown from "./Markdown";

interface PaperDetails {
  paper: Paper;
  reasoning: string | null;
  matchedTopics: { id: number; name: string }[];
}

interface RenderResult {
  renderable: boolean;
  html: string | null;
  pdfUrl: string;
  message?: string;
}

interface SelectionMenu {
  x: number;
  y: number;
  text: string;
  context: string;
}

const CONTEXT_MAX = 1500;

export default function Reader({ paperId }: { paperId: number }) {
  const [details, setDetails] = useState<PaperDetails | null>(null);
  const [render, setRender] = useState<RenderResult | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [menu, setMenu] = useState<SelectionMenu | null>(null);
  const [pending, setPending] = useState<"explain" | "define" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!Number.isFinite(paperId)) return;
    (async () => {
      const [d, r, h] = await Promise.all([
        fetch(`/api/papers/${paperId}`).then((r) => r.json()),
        fetch(`/api/papers/${paperId}/render`).then((r) => r.json()),
        fetch(`/api/highlights?paperId=${paperId}`).then((r) => r.json()),
      ]);
      setDetails(d);
      setRender(r);
      setHighlights(h.highlights ?? []);
    })();
  }, [paperId]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return setMenu(null);
    const text = sel.toString().trim();
    if (text.length < 2) return setMenu(null);
    const container = contentRef.current;
    if (!container) return;
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return setMenu(null);

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let ancestor = node as HTMLElement | null;
    const blockTags = new Set(["P", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "FIGCAPTION", "TD"]);
    while (ancestor && ancestor !== container && !blockTags.has(ancestor.tagName)) {
      ancestor = ancestor.parentElement;
    }
    const context = ((ancestor?.innerText || text).replace(/\s+/g, " ").trim()).slice(0, CONTEXT_MAX);

    setMenu({
      x: rect.right - containerRect.left + 8,
      y: rect.bottom - containerRect.top + 6,
      text,
      context,
    });
  };

  const explain = async () => {
    if (!menu) return;
    setPending("explain");
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          selectedText: menu.text,
          surroundingContext: menu.context,
          explain: true,
        }),
      });
      const data = await res.json();
      if (data.highlight) {
        setHighlights((prev) => [data.highlight, ...prev]);
        setToast(data.warning ?? "Explanation added.");
      } else {
        setToast(data.error ?? "Failed to save highlight.");
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
      setMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const defineTerm = async () => {
    if (!menu) return;
    setPending("define");
    try {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: menu.text,
          contextSnippet: menu.context,
          sourcePaperId: paperId,
        }),
      });
      const data = await res.json();
      if (data.entry) setToast(`Added "${data.entry.term}" to dictionary.`);
      else setToast(data.error ?? "Failed to save term.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
      setMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const markFinished = async () => {
    await fetch(`/api/papers/${paperId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "finished" }),
    });
    setToast("Marked as finished.");
  };

  const toggleSaved = async () => {
    if (!details) return;
    const nextSaved = !details.paper.savedAt;
    const res = await fetch(`/api/papers/${paperId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: nextSaved }),
    });
    if (res.ok) {
      const data = await res.json();
      setDetails({ ...details, paper: data.paper });
      setToast(nextSaved ? "Saved to your queue." : "Removed from queue.");
    }
  };

  if (!details || !render) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-[var(--muted)]">Loading paper…</div>
    );
  }

  const { paper, reasoning, matchedTopics } = details;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article>
        <div className="mb-4 text-xs text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--foreground)] underline">
            ← Back to today
          </Link>
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{paper.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{paper.authors.join(", ")}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {new Date(paper.publishedAt).toLocaleDateString()} · {paper.arxivCategories.join(" / ")} ·{" "}
          <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" rel="noopener noreferrer" className="underline">
            arXiv
          </a>
        </p>
        {matchedTopics.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              matched
            </span>
            {matchedTopics.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent),transparent_88%)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-6">
          {render.renderable && render.html ? (
            <div
              ref={contentRef}
              className="paper-content"
              onMouseUp={handleMouseUp}
              dangerouslySetInnerHTML={{ __html: render.html }}
            />
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="mb-3 text-sm text-[var(--muted)]">
                {render.message ?? "No HTML rendering available for this paper."}
              </p>
              <p className="mb-4 text-sm">
                Abstract-only mode — highlights will still work below.
              </p>
              <div
                ref={contentRef}
                className="paper-content"
                onMouseUp={handleMouseUp}
              >
                <p>{paper.abstract}</p>
              </div>
              <a
                href={render.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[color-mix(in_oklab,var(--muted),transparent_90%)]"
              >
                Open PDF ↗
              </a>
            </div>
          )}

          {menu && (
            <div
              className="absolute z-30 flex gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
              style={{ left: menu.x, top: menu.y }}
            >
              <button
                onClick={explain}
                disabled={pending !== null}
                className="rounded px-2 py-1 text-xs font-medium hover:bg-[color-mix(in_oklab,var(--accent),transparent_88%)] disabled:opacity-50"
              >
                {pending === "explain" ? "Explaining…" : "Explain"}
              </button>
              <button
                onClick={defineTerm}
                disabled={pending !== null}
                className="rounded px-2 py-1 text-xs font-medium hover:bg-[color-mix(in_oklab,var(--accent),transparent_88%)] disabled:opacity-50"
              >
                {pending === "define" ? "Saving…" : "Add to dictionary"}
              </button>
            </div>
          )}
        </div>
      </article>

      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        {reasoning && (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--accent)]">Why you&apos;re reading this</div>
            <Markdown>{reasoning}</Markdown>
          </section>
        )}

        <section className="flex flex-wrap gap-2">
          <button
            onClick={toggleSaved}
            className="rounded-md border border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent),transparent_92%)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:opacity-90"
          >
            {details.paper.savedAt ? "★ Saved — remove" : "☆ Save to queue"}
          </button>
          <button
            onClick={markFinished}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[color-mix(in_oklab,var(--muted),transparent_90%)]"
          >
            Mark finished
          </button>
        </section>

        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Your highlights</div>
          {highlights.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Select any text in the paper to explain it or add a term to your dictionary.
            </p>
          ) : (
            <ul className="space-y-3">
              {highlights.map((h) => (
                <li key={h.id} className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                  <blockquote className="border-l-2 border-[var(--accent)] pl-2 text-xs italic text-[var(--foreground)]/90">
                    “{h.selectedText}”
                  </blockquote>
                  {h.aiExplanation ? (
                    <div className="mt-2 text-xs text-[var(--foreground)]/90">
                      <Markdown size="sm">{h.aiExplanation}</Markdown>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--muted)]">(no explanation)</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
