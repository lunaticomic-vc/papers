import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "./db";
import { paperEvents, papers, topics, type Paper, type Topic } from "./db/schema";
import { searchArxiv, type ArxivPaper } from "./arxiv";

interface Candidate {
  arxiv: ArxivPaper;
  matchedTopics: Topic[];
  score: number;
}

/**
 * Refresh the candidate pool by hitting arXiv for each active topic,
 * then dedupe against papers we already have and store the new ones.
 */
export async function refreshCandidatePool(): Promise<Paper[]> {
  const active = await db.select().from(topics).where(eq(topics.active, true));
  if (active.length === 0) return [];

  const candidates = new Map<string, Candidate>();

  await Promise.all(
    active.map(async (topic) => {
      try {
        const results = await searchArxiv({
          categories: topic.arxivCategories,
          keywords: topic.keywords,
          maxResults: 20,
          daysBack: 21,
        });
        for (const paper of results) {
          const existing = candidates.get(paper.arxivId);
          if (existing) {
            existing.matchedTopics.push(topic);
            existing.score += scoreFor(paper, topic);
          } else {
            candidates.set(paper.arxivId, {
              arxiv: paper,
              matchedTopics: [topic],
              score: scoreFor(paper, topic),
            });
          }
        }
      } catch (err) {
        console.error(`[selector] arXiv fetch failed for topic ${topic.name}:`, err);
      }
    }),
  );

  const arxivIds = [...candidates.keys()];
  if (arxivIds.length === 0) return [];

  const existing = await db
    .select({ arxivId: papers.arxivId })
    .from(papers)
    .where(inArray(papers.arxivId, arxivIds));
  const existingIds = new Set(existing.map((p) => p.arxivId));

  const toInsert = [...candidates.values()].filter(
    (c) => !existingIds.has(c.arxiv.arxivId),
  );

  if (toInsert.length === 0) return [];

  const inserted = await db
    .insert(papers)
    .values(
      toInsert.map((c) => ({
        arxivId: c.arxiv.arxivId,
        title: c.arxiv.title,
        abstract: c.arxiv.abstract,
        authors: c.arxiv.authors,
        publishedAt: c.arxiv.publishedAt,
        updatedAt: c.arxiv.updatedAt,
        arxivCategories: c.arxiv.categories,
        pdfUrl: c.arxiv.pdfUrl,
        ar5ivUrl: c.arxiv.ar5ivUrl,
        matchedTopicIds: c.matchedTopics.map((t) => t.id),
      })),
    )
    .returning();

  return inserted;
}

function scoreFor(paper: ArxivPaper, topic: Topic): number {
  const abs = paper.abstract.toLowerCase();
  const title = paper.title.toLowerCase();
  let hits = 0;
  for (const kw of topic.keywords) {
    const needle = kw.toLowerCase();
    if (title.includes(needle)) hits += 2;
    else if (abs.includes(needle)) hits += 1;
  }
  const ageDays = (Date.now() - paper.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  const recency = Math.max(0, 1 - ageDays / 21);
  return hits + recency * 2;
}

/**
 * Pick the next paper to show. Skips any paper the user has already been shown.
 * If the local pool is empty, hits arXiv to refresh first.
 */
export async function pickNextPaper(): Promise<Paper | null> {
  const shownIds = (
    await db
      .selectDistinct({ paperId: paperEvents.paperId })
      .from(paperEvents)
      .where(inArray(paperEvents.event, ["shown", "skipped", "opened", "finished"]))
  ).map((r) => r.paperId);

  let candidate = await pickFromPool(shownIds);
  if (candidate) return candidate;

  await refreshCandidatePool();
  candidate = await pickFromPool(shownIds);
  return candidate;
}

async function pickFromPool(excludeIds: number[]): Promise<Paper | null> {
  const where =
    excludeIds.length > 0
      ? notInArray(papers.id, excludeIds)
      : undefined;

  const rows = await db
    .select()
    .from(papers)
    .where(where)
    .orderBy(desc(papers.publishedAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function recordEvent(
  paperId: number,
  event: "shown" | "skipped" | "opened" | "finished",
) {
  await db.insert(paperEvents).values({ paperId, event });
}
