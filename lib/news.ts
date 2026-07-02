export interface NewsItem {
  id: number;
  title: string;
  url: string | null;
  hnUrl: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
  matchedTopics: string[];
}

interface TopicInput {
  name: string;
  keywords: string[];
}

/**
 * Fetch Hacker News stories relevant to the user's active topics.
 * Runs one Algolia search per topic, dedupes, and ranks by score + recency
 * with a boost when a story matches multiple topics.
 * Falls back to the plain top-stories feed if no topics have keywords.
 */
export async function fetchTopicNews(
  topics: TopicInput[],
  limit = 15,
): Promise<NewsItem[]> {
  const searchable = topics.filter((t) => t.keywords.length > 0);
  if (searchable.length === 0) return fetchTopStories(limit);

  const map = new Map<number, NewsItem>();

  await Promise.all(
    searchable.map(async (topic) => {
      const query = topic.keywords.slice(0, 4).join(" ");
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
      try {
        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) return;
        const data = await res.json();
        for (const h of data.hits ?? []) {
          const id = Number(h.objectID);
          if (!Number.isFinite(id)) continue;
          const existing = map.get(id);
          if (existing) {
            if (!existing.matchedTopics.includes(topic.name)) {
              existing.matchedTopics.push(topic.name);
            }
          } else {
            map.set(id, {
              id,
              title: h.title ?? h.story_title ?? "",
              url: h.url ?? null,
              hnUrl: `https://news.ycombinator.com/item?id=${id}`,
              score: h.points ?? 0,
              by: h.author ?? "",
              time: (h.created_at_i ?? 0) * 1000,
              descendants: h.num_comments ?? 0,
              matchedTopics: [topic.name],
            });
          }
        }
      } catch (err) {
        console.error(`[news] search failed for topic ${topic.name}:`, err);
      }
    }),
  );

  const now = Date.now();
  const items = [...map.values()].filter((i) => i.title.length > 0);
  items.sort((a, b) => rank(b, now) - rank(a, now));
  return items.slice(0, limit);
}

function rank(item: NewsItem, now: number): number {
  const ageDays = Math.max(0, (now - item.time) / (1000 * 60 * 60 * 24));
  const recency = Math.max(0, 1 - ageDays / 30);
  const topicBoost = (item.matchedTopics.length - 1) * 0.6;
  return Math.log1p(item.score) + recency * 2.5 + topicBoost;
}

/**
 * Plain top-stories fallback (used when no topics are active).
 */
export async function fetchTopStories(limit = 12): Promise<NewsItem[]> {
  const idsRes = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
    { next: { revalidate: 300 } },
  );
  if (!idsRes.ok) throw new Error(`HN topstories: ${idsRes.status}`);
  const ids: number[] = await idsRes.json();

  const items = await Promise.all(
    ids.slice(0, limit).map(async (id) => {
      const res = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        { next: { revalidate: 300 } },
      );
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw || raw.deleted || raw.dead) return null;
      const item: NewsItem = {
        id: raw.id,
        title: raw.title ?? "",
        url: raw.url ?? null,
        hnUrl: `https://news.ycombinator.com/item?id=${raw.id}`,
        score: raw.score ?? 0,
        by: raw.by ?? "",
        time: (raw.time ?? 0) * 1000,
        descendants: raw.descendants ?? 0,
        matchedTopics: [],
      };
      return item;
    }),
  );

  return items.filter((x): x is NewsItem => x !== null);
}
