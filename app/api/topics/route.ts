import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  arxivCategories: z.array(z.string().min(1)).min(1),
  keywords: z.array(z.string().min(1)).default([]),
});

export async function GET() {
  const rows = await db
    .select()
    .from(topics)
    .orderBy(desc(topics.createdAt));
  return NextResponse.json({ topics: rows });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  try {
    const [row] = await db
      .insert(topics)
      .values({
        name: parsed.data.name,
        arxivCategories: parsed.data.arxivCategories,
        keywords: parsed.data.keywords,
        active: true,
      })
      .returning();
    return NextResponse.json({ topic: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "A topic with that name already exists." },
        { status: 409 },
      );
    }
    throw err;
  }
}
