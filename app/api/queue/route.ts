import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { papers, topics } from "@/lib/db/schema";
import { desc, inArray, isNotNull } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(papers)
    .where(isNotNull(papers.savedAt))
    .orderBy(desc(papers.savedAt))
    .limit(200);

  const topicIds = Array.from(
    new Set(rows.flatMap((p) => p.matchedTopicIds)),
  );
  const topicRows = topicIds.length
    ? await db
        .select({ id: topics.id, name: topics.name })
        .from(topics)
        .where(inArray(topics.id, topicIds))
    : [];
  const topicById = new Map(topicRows.map((t) => [t.id, t.name]));

  const items = rows.map((p) => ({
    ...p,
    matchedTopicNames: p.matchedTopicIds
      .map((id) => topicById.get(id))
      .filter((n): n is string => Boolean(n)),
  }));

  return NextResponse.json({ papers: items });
}
