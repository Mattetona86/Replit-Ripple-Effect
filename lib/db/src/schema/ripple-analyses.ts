import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Persisted Ripple Lab analyses. One row per distinct article (headline +
// primaryTickers + language), NOT per user — re-analyzing the same public
// news item should reuse the existing row instead of paying for a second
// Anthropic call, the same way the old in-memory LRU cache worked, except
// this survives restarts and supports a reload-by-id permalink.
// `createdByUserId` is provenance only, not an ownership/access boundary:
// the content is a public-news analysis, not personal data.
export const rippleAnalysesTable = pgTable("ripple_analyses", {
  id: serial("id").primaryKey(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  createdByUserId: text("created_by_user_id").notNull(),
  headline: text("headline").notNull(),
  language: text("language").notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  article: jsonb("article").notNull(),
  analysis: jsonb("analysis").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRippleAnalysisSchema = createInsertSchema(rippleAnalysesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRippleAnalysis = z.infer<typeof insertRippleAnalysisSchema>;
export type RippleAnalysisRow = typeof rippleAnalysesTable.$inferSelect;
