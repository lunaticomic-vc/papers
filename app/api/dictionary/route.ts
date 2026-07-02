import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { dictionaryEntries, papers } from "@/lib/db/schema";
import { defineTerm } from "@/lib/prompts";
import { desc, eq, like } from "drizzle-orm";

const createSchema = z.object({
  term: z.string().min(1).max(200),
  contextSnippet: z.string().default(""),
  sourcePaperId: z.number().int().nullable().optional(),
  sourceHighlightId: z.number().int().nullable().optional(),
  definition: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();

  const rows = q
    ? await db
        .select()
        .from(dictionaryEntries)
        .where(like(dictionaryEntries.term, `%${q}%`))
        .orderBy(desc(dictionaryEntries.createdAt))
        .limit(500)
    : await db
        .select()
        .from(dictionaryEntries)
        .orderBy(desc(dictionaryEntries.createdAt))
        .limit(500);

  return NextResponse.json({ entries: rows });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const input = parsed.data;

  let definition = input.definition;
  if (!definition) {
    let paperTitle: string | undefined;
    if (input.sourcePaperId != null) {
      const [p] = await db
        .select({ title: papers.title })
        .from(papers)
        .where(eq(papers.id, input.sourcePaperId));
      paperTitle = p?.title;
    }
    try {
      definition = await defineTerm({
        term: input.term,
        contextSnippet: input.contextSnippet,
        paperTitle,
      });
    } catch (err) {
      console.error("[dictionary] define failed:", err);
      return NextResponse.json(
        { error: "Could not generate definition. Check OPENAI_API_KEY." },
        { status: 502 },
      );
    }
  }

  try {
    const [row] = await db
      .insert(dictionaryEntries)
      .values({
        term: input.term,
        definition,
        sourcePaperId: input.sourcePaperId ?? null,
        sourceHighlightId: input.sourceHighlightId ?? null,
        contextSnippet: input.contextSnippet || null,
      })
      .returning();
    return NextResponse.json({ entry: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: `"${input.term}" is already in your dictionary.` },
        { status: 409 },
      );
    }
    throw err;
  }
}
