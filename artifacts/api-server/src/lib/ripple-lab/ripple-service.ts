/**
 * Orchestrates Ripple Lab analysis.
 * LRU cache keyed by headline hash to avoid re-running expensive LLM calls.
 */

import { LRUCache } from 'lru-cache';
import { logger } from '../logger';
import { generateRippleAnalysis } from './ripple-llm';
import type { RippleNewsInput, RippleAnalysis } from './types';

// 2-hour TTL — analysis is expensive and the underlying news doesn't change
const cache = new LRUCache<string, RippleAnalysis>({
  max: 50,
  ttl: 2 * 60 * 60 * 1000,
});

function makeCacheKey(input: RippleNewsInput, language: string): string {
  const normalized = `${input.headline}::${(input.primaryTickers ?? []).sort().join(',')}::${language}`;
  // Simple hash: use first 120 chars to keep key manageable
  return normalized.slice(0, 120).toLowerCase().replace(/\s+/g, '_');
}

export async function analyzeRipple(
  input: RippleNewsInput,
  language: 'en' | 'it' = 'en',
): Promise<RippleAnalysis> {
  const cacheKey = makeCacheKey(input, language);
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info({ headline: input.headline.slice(0, 60), language }, 'Ripple analysis cache hit');
    return cached;
  }

  logger.info({ headline: input.headline.slice(0, 60), language }, 'Running Ripple Lab analysis');

  const result = await generateRippleAnalysis(input, language);
  cache.set(cacheKey, result);
  return result;
}

export type { RippleNewsInput, RippleAnalysis };
