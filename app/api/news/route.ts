import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { topics as topicsTable } from "@/lib/db/schema";
import { fetchTopicNews, fetchTopStories } from "@/lib/news";
import { eq } from "drizzle-orm";

export const revalidate = 300;

export async function GET() {
  try {
    const active = await db
      .select({ name: topicsTable.name, keywords: topicsTable.keywords })
      .from(topicsTable)
      .where(eq(topicsTable.active, true));

    if (active.length === 0) {
      const items = await fetchTopStories(12);
      return NextResponse.json({ items, mode: "top" });
    }

    const items = await fetchTopicNews(active, 15);
    if (items.length === 0) {
      const fallback = await fetchTopStories(12);
      return NextResponse.json({ items: fallback, mode: "top-fallback" });
    }
    return NextResponse.json({ items, mode: "topics" });
  } catch (err) {
    console.error("[news] fetch failed:", err);
    return NextResponse.json(
      { items: [], error: "Could not load news." },
      { status: 200 },
    );
  }
}
