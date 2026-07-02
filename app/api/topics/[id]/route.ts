import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  arxivCategories: z.array(z.string().min(1)).min(1).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const [row] = await db
    .update(topics)
    .set(parsed.data)
    .where(eq(topics.id, topicId))
    .returning();
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ topic: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  await db.delete(topics).where(eq(topics.id, topicId));
  return NextResponse.json({ ok: true });
}
