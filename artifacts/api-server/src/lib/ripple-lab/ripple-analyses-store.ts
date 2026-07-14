/**
 * Postgres persistence for Ripple Lab analyses.
 * One row per distinct article (headline + tickers + language) — re-running
 * the same public news item reuses the row instead of a fresh Anthropic call.
 */

import { db, rippleAnalysesTable, eq, type RippleAnalysisRow } from '@workspace/db';
import type { RippleAnalysisResult, RippleAnalysisRecord } from '@workspace/api-zod';
import type { RippleNewsInput } from './types';

const SCHEMA_VERSION = 1;
// Matches the old in-memory-only cache's TTL — re-analyzing the same article
// within this window reuses the stored result instead of calling Anthropic.
const FRESHNESS_WINDOW_MS = 2 * 60 * 60 * 1000;

export function makeDedupeKey(input: RippleNewsInput, language: string): string {
  const normalized = `${input.headline}::${(input.primaryTickers ?? []).slice().sort().join(',')}::${language}`;
  return normalized.slice(0, 120).toLowerCase().replace(/\s+/g, '_');
}

function toRecord(row: RippleAnalysisRow): RippleAnalysisRecord {
  return {
    id: row.id,
    schemaVersion: row.schemaVersion,
    article: row.article as RippleAnalysisRecord['article'],
    analysis: row.analysis as RippleAnalysisResult,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findRecentRippleAnalysis(
  input: RippleNewsInput,
  language: string,
): Promise<RippleAnalysisRecord | null> {
  const dedupeKey = makeDedupeKey(input, language);
  const [row] = await db
    .select()
    .from(rippleAnalysesTable)
    .where(eq(rippleAnalysesTable.dedupeKey, dedupeKey))
    .limit(1);

  if (!row) return null;
  const ageMs = Date.now() - row.updatedAt.getTime();
  if (ageMs > FRESHNESS_WINDOW_MS) return null;
  return toRecord(row);
}

export async function saveRippleAnalysis(
  userId: string,
  input: RippleNewsInput,
  language: string,
  analysis: RippleAnalysisResult,
): Promise<RippleAnalysisRecord> {
  const dedupeKey = makeDedupeKey(input, language);
  // Stored `article` matches NewsAnalysisRequest exactly (RippleNewsInput
  // plus `language`, which is a separate parameter here) — so a row read
  // back later validates cleanly against RippleAnalysisRecord.article.
  const article = { ...input, language };
  const [row] = await db
    .insert(rippleAnalysesTable)
    .values({
      dedupeKey,
      createdByUserId: userId,
      headline: input.headline,
      language,
      schemaVersion: SCHEMA_VERSION,
      article,
      analysis,
    })
    .onConflictDoUpdate({
      target: rippleAnalysesTable.dedupeKey,
      set: {
        headline: input.headline,
        article,
        analysis,
        updatedAt: new Date(),
      },
    })
    .returning();
  return toRecord(row);
}

export async function getRippleAnalysisById(id: number): Promise<RippleAnalysisRecord | null> {
  const [row] = await db
    .select()
    .from(rippleAnalysesTable)
    .where(eq(rippleAnalysesTable.id, id))
    .limit(1);
  return row ? toRecord(row) : null;
}
