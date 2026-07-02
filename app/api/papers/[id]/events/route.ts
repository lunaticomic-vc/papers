import { NextResponse } from "next/server";
import { z } from "zod";
import { recordEvent } from "@/lib/selector";

const bodySchema = z.object({
  event: z.enum(["shown", "skipped", "opened", "finished"]),
});

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
  await recordEvent(paperId, parsed.data.event);
  return NextResponse.json({ ok: true });
}
