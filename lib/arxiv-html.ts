import sanitizeHtml from "sanitize-html";

export interface HtmlSource {
  html: string;
  plainText: string;
  source: "arxiv-html" | "ar5iv";
}

const commonSanitize: sanitizeHtml.IOptions = {
  allowedTags: [
    "article", "section", "div", "span", "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "figure", "figcaption", "img",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "thead", "tbody", "tr", "th", "td",
    "cite", "sup", "sub", "em", "strong", "b", "i", "code", "pre", "blockquote",
    "math", "mrow", "mi", "mn", "mo", "msup", "msub", "msubsup",
    "mfrac", "msqrt", "mroot", "munder", "mover", "munderover",
    "annotation", "semantics", "mtext", "mstyle", "mspace", "mtable", "mtr", "mtd",
  ],
  allowedAttributes: {
    "*": ["id", "class"],
    a: ["href", "title", "rel"],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

/**
 * Try arXiv's native HTML rendering (arxiv.org/html/{id}).
 * Covers most new papers submitted with LaTeX source.
 */
export async function fetchArxivHtml(
  arxivId: string,
): Promise<HtmlSource | null> {
  const pageUrl = `https://arxiv.org/html/${arxivId}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "papers-reader-local/0.1" },
  });
  if (!res.ok) return null;
  const raw = await res.text();

  if (
    raw.includes("No HTML for this paper") ||
    raw.includes("Paper not found") ||
    raw.length < 2000
  ) {
    return null;
  }

  const extracted = extractArticle(raw);
  if (!extracted) return null;

  const html = sanitizeHtml(
    extracted,
    urlRewritingOptions("https://arxiv.org", pageUrl),
  );

  const plainText = stripToText(html);
  if (plainText.length < 500) return null;

  return { html, plainText, source: "arxiv-html" };
}

/**
 * Try ar5iv (the older 3rd-party LaTeXML renderer).
 * Better coverage for older papers, sometimes better formatting.
 */
export async function fetchAr5ivHtml(
  arxivId: string,
): Promise<HtmlSource | null> {
  const pageUrl = `https://ar5iv.labs.arxiv.org/html/${arxivId}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "papers-reader-local/0.1" },
  });
  if (!res.ok) return null;
  const raw = await res.text();

  if (raw.includes("Paper not available on ar5iv")) return null;

  const extracted = extractArticle(raw);
  if (!extracted) return null;

  const html = sanitizeHtml(
    extracted,
    urlRewritingOptions("https://ar5iv.labs.arxiv.org", pageUrl),
  );

  const plainText = stripToText(html);
  if (plainText.length < 500) return null;

  return { html, plainText, source: "ar5iv" };
}

/**
 * Try arxiv-html first, ar5iv second. Returns whichever renders.
 */
export async function fetchPaperHtml(
  arxivId: string,
): Promise<HtmlSource | null> {
  const arxiv = await fetchArxivHtml(arxivId).catch(() => null);
  if (arxiv) return arxiv;
  const ar5iv = await fetchAr5ivHtml(arxivId).catch(() => null);
  return ar5iv;
}

/**
 * Build sanitize-html options that rewrite `src` / `href` on img/a tags to
 * be absolute against the correct origin. Relative URLs are resolved against
 * the URL the paper was loaded from (so `2607.01224v1/x1.png` becomes
 * `https://arxiv.org/html/2607.01224v1/x1.png`).
 */
function urlRewritingOptions(
  origin: string,
  pageUrl: string,
): sanitizeHtml.IOptions {
  const resolve = (raw: string | undefined): string | undefined => {
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("mailto:")) {
      return raw;
    }
    if (raw.startsWith("/")) return `${origin}${raw}`;
    try {
      return new URL(raw, pageUrl).toString();
    } catch {
      return raw;
    }
  };
  return {
    ...commonSanitize,
    transformTags: {
      img: (tagName, attribs) => {
        const src = resolve(attribs.src);
        return { tagName, attribs: src ? { ...attribs, src } : attribs };
      },
      a: (tagName, attribs) => {
        const href = resolve(attribs.href);
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(href ? { href } : {}),
            rel: "noopener noreferrer",
            target: "_blank",
          },
        };
      },
    },
  };
}

function extractArticle(raw: string): string | null {
  const articleMatch = raw.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];
  const mainMatch = raw.match(
    /<div[^>]*class="[^"]*ltx_page_content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  );
  return mainMatch ? mainMatch[1] : null;
}

function stripToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
