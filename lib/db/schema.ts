import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  arxivCategories: text("arxiv_categories", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const papers = sqliteTable("papers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  arxivId: text("arxiv_id").notNull().unique(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  authors: text("authors", { mode: "json" }).$type<string[]>().notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  arxivCategories: text("arxiv_categories", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  pdfUrl: text("pdf_url").notNull(),
  ar5ivUrl: text("ar5iv_url").notNull(),
  cachedHtml: text("cached_html"),
  matchedTopicIds: text("matched_topic_ids", { mode: "json" })
    .$type<number[]>()
    .notNull(),
  savedAt: integer("saved_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const paperReasoning = sqliteTable("paper_reasoning", {
  paperId: integer("paper_id")
    .primaryKey()
    .references(() => papers.id, { onDelete: "cascade" }),
  whyThisPaper: text("why_this_paper").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const paperEvents = sqliteTable("paper_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paperId: integer("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  event: text("event", {
    enum: ["shown", "skipped", "opened", "finished"],
  }).notNull(),
  at: integer("at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const highlights = sqliteTable("highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paperId: integer("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  selectedText: text("selected_text").notNull(),
  surroundingContext: text("surrounding_context").notNull(),
  note: text("note"),
  aiExplanation: text("ai_explanation"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const dictionaryEntries = sqliteTable("dictionary_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  term: text("term").notNull().unique(),
  definition: text("definition").notNull(),
  sourcePaperId: integer("source_paper_id").references(() => papers.id, {
    onDelete: "set null",
  }),
  sourceHighlightId: integer("source_highlight_id").references(
    () => highlights.id,
    { onDelete: "set null" },
  ),
  contextSnippet: text("context_snippet"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type Paper = typeof papers.$inferSelect;
export type NewPaper = typeof papers.$inferInsert;
export type Highlight = typeof highlights.$inferSelect;
export type NewHighlight = typeof highlights.$inferInsert;
export type DictionaryEntry = typeof dictionaryEntries.$inferSelect;
export type NewDictionaryEntry = typeof dictionaryEntries.$inferInsert;
