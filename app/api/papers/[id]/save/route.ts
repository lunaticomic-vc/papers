import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({ saved: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const paperId = Number(id);
  if (!Number.isFinite(paperId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const [row] = await db
    .update(papers)
    .set({ savedAt: parsed.data.saved ? new Date() : null })
    .where(eq(papers.id, paperId))
    .returning();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ paper: row });
}
