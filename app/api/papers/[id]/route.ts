import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paperReasoning, papers, topics } from "@/lib/db/schema";
import { generateWhyThisPaper } from "@/lib/prompts";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const paperId = Number(id);
  if (!Number.isFinite(paperId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const [paper] = await db.select().from(papers).where(eq(papers.id, paperId));
  if (!paper) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const matchedTopics = paper.matchedTopicIds.length
    ? await db
        .select({ id: topics.id, name: topics.name })
        .from(topics)
        .where(inArray(topics.id, paper.matchedTopicIds))
    : [];

  const [existing] = await db
    .select()
    .from(paperReasoning)
    .where(eq(paperReasoning.paperId, paperId));

  let reasoning: string | null = existing?.whyThisPaper ?? null;
  if (!reasoning) {
    try {
      reasoning = await generateWhyThisPaper({
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        categories: paper.arxivCategories,
        topicNames: matchedTopics.map((t) => t.name),
      });
      await db
        .insert(paperReasoning)
        .values({ paperId, whyThisPaper: reasoning });
    } catch (err) {
      console.error("[papers/id] reasoning regen failed:", err);
      reasoning = null;
    }
  }

  return NextResponse.json({ paper, reasoning, matchedTopics });
}
