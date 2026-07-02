import { openai, MODEL } from "./openai";

const BEGINNER_VOICE = `
You are a research-reading tutor helping a smart software engineer who is
early in their research journey. They are not a researcher yet but want to
become well-versed in modern ML/AI research. When you explain things:
- Define jargon on first use, briefly and concretely.
- Use analogies when they clarify, but never at the cost of correctness.
- Prefer plain English over notation; when notation is essential, unpack it.
- Never condescend. They are technically strong; they are new to *research*,
  not new to thinking.
`.trim();

/**
 * Generate a beginner-oriented "why this paper is worth reading today" blurb.
 * Kept short (2–3 sentences). Cached per paper in the DB.
 */
export async function generateWhyThisPaper(input: {
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  topicNames: string[];
}): Promise<string> {
  const client = openai();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 250,
    messages: [
      { role: "system", content: BEGINNER_VOICE },
      {
        role: "user",
        content: `A paper just showed up in the feed for these topics: ${input.topicNames.join(", ")}.

TITLE: ${input.title}
AUTHORS: ${input.authors.join(", ")}
ARXIV CATEGORIES: ${input.categories.join(", ")}
ABSTRACT: ${input.abstract}

Write **4–5 sentences maximum** (hard cap — do not exceed) telling the reader why this paper is interesting *right now*. Cover, in this order:
- The concrete question the paper attacks.
- What would make it matter for someone learning the field (a new capability, a surprising result, an on-ramp to a subfield, a benchmark shift, etc.).
- Whether it looks incremental/narrow — be honest, and if so, say if it's still worth reading.

Do not restate the title. Do not begin with "This paper". Write like you're texting a friend a recommendation. No bullet points. Plain prose only.`,
      },
    ],
  });
  return (res.choices[0]?.message.content ?? "").trim();
}

/**
 * Explain a highlighted passage in the context of the whole paper.
 *
 * OpenAI applies automatic prompt caching for prompts ≥1024 tokens whose
 * prefix matches a recent call. Placing the paper text at the top of the
 * system message means the second-and-later highlight on the same paper
 * gets a cache hit for free.
 */
export async function explainHighlight(input: {
  paperTitle: string;
  paperFullText: string;
  selectedText: string;
  surroundingContext: string;
}): Promise<string> {
  const client = openai();
  const systemMessage = `${BEGINNER_VOICE}

You are explaining passages from this paper: "${input.paperTitle}".

FULL PAPER TEXT (for context — do not summarize this whole thing; only use it to answer questions about specific passages):

${input.paperFullText}`;

  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 350,
    messages: [
      { role: "system", content: systemMessage },
      {
        role: "user",
        content: `The reader highlighted this passage:

<<<
${input.selectedText}
>>>

Surrounding context from the same section:
${input.surroundingContext}

Explain in **4–5 sentences maximum** (hard cap — do not exceed), for a research beginner. Cover, packed together as needed:
- What the passage is actually saying, in plain English.
- Why the authors are doing this — what problem it addresses or what claim it supports.
- If it references prior work, name what and briefly why it matters.
- If it introduces notation or a technical term, unpack it inline.

Plain prose only. No headings. No bullet points.`,
      },
    ],
  });
  return (res.choices[0]?.message.content ?? "").trim();
}

/**
 * Produce a beginner-friendly dictionary entry for a term the reader saved.
 */
export async function defineTerm(input: {
  term: string;
  contextSnippet: string;
  paperTitle?: string;
}): Promise<string> {
  const client = openai();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 500,
    messages: [
      { role: "system", content: BEGINNER_VOICE },
      {
        role: "user",
        content: `Add "${input.term}" to a personal research dictionary.

Where it appeared:${input.paperTitle ? ` "${input.paperTitle}"` : ""}
Context: "${input.contextSnippet}"

Write a definition with two parts:
1. **Plain-English definition** (2–3 sentences) — what it is, in a way a beginner would grasp on first read.
2. **Why it matters / where you'll see it again** (1–2 sentences) — situate it in the field so the reader recognizes it next time.

Do not invent detail you don't know. If the term is used unusually in this context, mention that.`,
      },
    ],
  });
  return (res.choices[0]?.message.content ?? "").trim();
}
