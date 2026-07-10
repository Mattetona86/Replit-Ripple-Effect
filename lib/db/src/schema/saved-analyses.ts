import { pgTable, text, serial, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Snapshot of a saved technical-analysis result for a ticker, scoped to the
// Clerk user who saved it. Storing the explanation snapshot (not just the
// symbol) lets the user revisit exactly what they saw without re-calling the
// LLM, and keeps "save the ticker" and "save the analysis" as one action.
export const savedAnalysesTable = pgTable(
  "saved_analyses",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    timeframe: text("timeframe").notNull(),
    language: text("language").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.symbol, table.timeframe, table.language)],
);

export const insertSavedAnalysisSchema = createInsertSchema(savedAnalysesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedAnalysis = z.infer<typeof insertSavedAnalysisSchema>;
export type SavedAnalysis = typeof savedAnalysesTable.$inferSelect;
