import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { fetchPaperHtml } from "@/lib/arxiv-html";
import { eq } from "drizzle-orm";

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
  if (!paper) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (paper.cachedHtml) {
    return NextResponse.json({
      renderable: true,
      html: paper.cachedHtml,
      pdfUrl: paper.pdfUrl,
      source: "cache",
    });
  }

  const rendered = await fetchPaperHtml(paper.arxivId);
  if (!rendered) {
    return NextResponse.json({
      renderable: false,
      html: null,
      pdfUrl: paper.pdfUrl,
      source: null,
      message:
        "No HTML rendering available (neither arXiv HTML nor ar5iv). Showing abstract with PDF link.",
    });
  }

  await db
    .update(papers)
    .set({ cachedHtml: rendered.html })
    .where(eq(papers.id, paperId));

  return NextResponse.json({
    renderable: true,
    html: rendered.html,
    pdfUrl: paper.pdfUrl,
    source: rendered.source,
  });
}
