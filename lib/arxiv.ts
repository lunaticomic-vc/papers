import { XMLParser } from "fast-xml-parser";

export interface ArxivPaper {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: Date;
  updatedAt: Date;
  categories: string[];
  pdfUrl: string;
  ar5ivUrl: string;
}

interface AtomLink {
  "@_href": string;
  "@_rel"?: string;
  "@_type"?: string;
  "@_title"?: string;
}

interface AtomEntry {
  id: string;
  title: string;
  summary: string;
  author: { name: string } | { name: string }[];
  published: string;
  updated: string;
  category: { "@_term": string } | { "@_term": string }[];
  link?: AtomLink | AtomLink[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    name === "entry" ||
    name === "author" ||
    name === "category" ||
    name === "link",
});

function extractArxivId(idUrl: string): string {
  const match = idUrl.match(/abs\/([^\/]+?)(?:v\d+)?$/);
  return match ? match[1] : idUrl;
}

/**
 * Query arXiv's public Atom API for papers in the given categories,
 * optionally narrowed by keywords appearing in the abstract.
 * Returns papers submitted within the last `daysBack` days.
 */
export async function searchArxiv(opts: {
  categories: string[];
  keywords?: string[];
  maxResults?: number;
  daysBack?: number;
}): Promise<ArxivPaper[]> {
  const {
    categories,
    keywords = [],
    maxResults = 25,
    daysBack = 14,
  } = opts;

  if (categories.length === 0) return [];

  const catQuery = categories.map((c) => `cat:${c}`).join("+OR+");
  const kwQuery =
    keywords.length > 0
      ? "+AND+(" +
        keywords
          .map((k) => `abs:%22${encodeURIComponent(k)}%22`)
          .join("+OR+") +
        ")"
      : "";

  const params = new URLSearchParams({
    sortBy: "submittedDate",
    sortOrder: "descending",
    max_results: String(maxResults),
  });
  const rawUrl =
    `https://export.arxiv.org/api/query?search_query=(${catQuery})${kwQuery}&` +
    params.toString();

  const res = await fetch(rawUrl, {
    headers: {
      Accept: "application/atom+xml",
      "User-Agent": "papers-reader-local/0.1",
    },
  });

  if (!res.ok) {
    throw new Error(
      `arXiv API returned ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);
  const entries: AtomEntry[] = parsed?.feed?.entry ?? [];
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  return entries
    .map((e): ArxivPaper => {
      const arxivId = extractArxivId(e.id);
      const authors = Array.isArray(e.author)
        ? e.author.map((a) => a.name)
        : [e.author.name];
      const cats = Array.isArray(e.category)
        ? e.category.map((c) => c["@_term"])
        : [e.category["@_term"]];
      const links: AtomLink[] = Array.isArray(e.link)
        ? e.link
        : e.link
          ? [e.link]
          : [];
      const pdfLink = links.find(
        (l) => l["@_title"] === "pdf" || l["@_type"] === "application/pdf",
      )?.["@_href"];
      return {
        arxivId,
        title: (e.title ?? "").trim().replace(/\s+/g, " "),
        abstract: (e.summary ?? "").trim().replace(/\s+/g, " "),
        authors,
        publishedAt: new Date(e.published),
        updatedAt: new Date(e.updated),
        categories: cats,
        pdfUrl: pdfLink ?? `https://arxiv.org/pdf/${arxivId}`,
        ar5ivUrl: `https://ar5iv.labs.arxiv.org/html/${arxivId}`,
      };
    })
    .filter((p) => p.publishedAt.getTime() >= cutoff);
}
