import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { highlights, papers } from "@/lib/db/schema";
import { explainHighlight } from "@/lib/prompts";
import { fetchPaperHtml } from "@/lib/arxiv-html";
import { eq, desc } from "drizzle-orm";

const createSchema = z.object({
  paperId: z.number().int(),
  selectedText: z.string().min(1),
  surroundingContext: z.string().default(""),
  note: z.string().optional(),
  explain: z.boolean().default(true),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paperIdParam = url.searchParams.get("paperId");
  const paperId = paperIdParam ? Number(paperIdParam) : null;

  const query = db
    .select()
    .from(highlights)
    .orderBy(desc(highlights.createdAt))
    .limit(200);

  const rows = paperId !== null && Number.isFinite(paperId)
    ? await query.where(eq(highlights.paperId, paperId))
    : await query;

  return NextResponse.json({ highlights: rows });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const input = parsed.data;

  const [paper] = await db
    .select()
    .from(papers)
    .where(eq(papers.id, input.paperId));
  if (!paper) {
    return NextResponse.json({ error: "paper not found" }, { status: 404 });
  }

  const [row] = await db
    .insert(highlights)
    .values({
      paperId: input.paperId,
      selectedText: input.selectedText,
      surroundingContext: input.surroundingContext,
      note: input.note ?? null,
    })
    .returning();

  if (!input.explain) return NextResponse.json({ highlight: row });

  const fullText = await resolveFullText(paper);
  try {
    const explanation = await explainHighlight({
      paperTitle: paper.title,
      paperFullText: fullText,
      selectedText: input.selectedText,
      surroundingContext: input.surroundingContext,
    });
    const [updated] = await db
      .update(highlights)
      .set({ aiExplanation: explanation })
      .where(eq(highlights.id, row.id))
      .returning();
    return NextResponse.json({ highlight: updated });
  } catch (err) {
    console.error("[highlights] explain failed:", err);
    return NextResponse.json({
      highlight: row,
      warning: "Highlight saved, but explanation failed. Check OPENAI_API_KEY.",
    });
  }
}

async function resolveFullText(paper: typeof papers.$inferSelect): Promise<string> {
  if (paper.cachedHtml) return stripTags(paper.cachedHtml);
  const rendered = await fetchPaperHtml(paper.arxivId);
  if (rendered) {
    await db
      .update(papers)
      .set({ cachedHtml: rendered.html })
      .where(eq(papers.id, paper.id));
    return rendered.plainText;
  }
  return `Title: ${paper.title}\n\nAbstract: ${paper.abstract}`;
}

function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
