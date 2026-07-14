/**
 * Orchestrates Ripple Lab analysis.
 * In-memory LRU cache (process-local, sub-second) sits in front of the
 * Postgres-backed store (survives restarts, supports reload-by-id) which
 * sits in front of the actual Anthropic call — each layer only runs if the
 * one before it misses.
 */

import { LRUCache } from 'lru-cache';
import { logger } from '../logger';
import { generateRippleAnalysis } from './ripple-llm';
import {
  makeDedupeKey,
  findRecentRippleAnalysis,
  saveRippleAnalysis,
  getRippleAnalysisById,
} from './ripple-analyses-store';
import type { RippleNewsInput, RippleAnalysis } from './types';
import type { RippleAnalysisRecord } from '@workspace/api-zod';

// 2-hour TTL — analysis is expensive and the underlying news doesn't change.
// Same window as the DB freshness check in ripple-analyses-store.ts; this
// cache just avoids a DB round-trip on top of avoiding an Anthropic call.
const cache = new LRUCache<string, RippleAnalysisRecord>({
  max: 50,
  ttl: 2 * 60 * 60 * 1000,
});

export async function analyzeRipple(
  userId: string,
  input: RippleNewsInput,
  language: 'en' | 'it' = 'en',
): Promise<RippleAnalysisRecord> {
  const cacheKey = makeDedupeKey(input, language);

  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info({ headline: input.headline.slice(0, 60), language }, 'Ripple analysis in-memory cache hit');
    return cached;
  }

  const recent = await findRecentRippleAnalysis(input, language);
  if (recent) {
    logger.info({ headline: input.headline.slice(0, 60), language }, 'Ripple analysis reused from database');
    cache.set(cacheKey, recent);
    return recent;
  }

  logger.info({ headline: input.headline.slice(0, 60), language }, 'Running Ripple Lab analysis');
  const result = await generateRippleAnalysis(input, language);
  const record = await saveRippleAnalysis(userId, input, language, result);
  cache.set(cacheKey, record);
  return record;
}

export async function getRippleAnalysis(id: number): Promise<RippleAnalysisRecord | null> {
  return getRippleAnalysisById(id);
}

export type { RippleNewsInput, RippleAnalysis };
