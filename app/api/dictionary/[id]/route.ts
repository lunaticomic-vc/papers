import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dictionaryEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isFinite(entryId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  await db.delete(dictionaryEntries).where(eq(dictionaryEntries.id, entryId));
  return NextResponse.json({ ok: true });
}
