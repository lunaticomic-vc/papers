import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paperReasoning, topics as topicsTable } from "@/lib/db/schema";
import { pickNextPaper, recordEvent } from "@/lib/selector";
import { generateWhyThisPaper } from "@/lib/prompts";
import { eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const paper = await pickNextPaper();
  if (!paper) {
    return NextResponse.json(
      {
        paper: null,
        reasoning: null,
        matchedTopics: [],
        message:
          "No new papers found for your active topics. Try adjusting keywords or come back in a day.",
      },
      { status: 200 },
    );
  }

  const matchedTopics = paper.matchedTopicIds.length
    ? await db
        .select({ id: topicsTable.id, name: topicsTable.name })
        .from(topicsTable)
        .where(inArray(topicsTable.id, paper.matchedTopicIds))
    : [];

  const [existing] = await db
    .select()
    .from(paperReasoning)
    .where(eq(paperReasoning.paperId, paper.id));

  let whyThisPaper: string;
  if (existing) {
    whyThisPaper = existing.whyThisPaper;
  } else {
    try {
      whyThisPaper = await generateWhyThisPaper({
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        categories: paper.arxivCategories,
        topicNames: matchedTopics.map((t) => t.name),
      });
    } catch (err) {
      console.error("[papers/next] reasoning failed:", err);
      whyThisPaper =
        "(Couldn't generate reasoning right now — check your OPENAI_API_KEY. You can still read the paper.)";
    }
    if (!whyThisPaper.startsWith("(Couldn't")) {
      await db.insert(paperReasoning).values({
        paperId: paper.id,
        whyThisPaper,
      });
    }
  }

  await recordEvent(paper.id, "shown");

  return NextResponse.json({ paper, reasoning: whyThisPaper, matchedTopics });
}
