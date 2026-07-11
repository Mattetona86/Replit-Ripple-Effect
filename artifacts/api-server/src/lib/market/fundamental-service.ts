/**
 * Orchestrates fundamental data fetching, calculation, and LLM explanation.
 * Data is sourced from Yahoo Finance (single quoteSummary call, ~1-2 s).
 * Results are cached for 4 hours since fundamentals change at most daily.
 */

import { LRUCache } from "lru-cache";
import { logger } from "../logger";
import type { Language } from "./llm";
import { fetchYahooFundamentalData } from "./fundamental-yahoo-client";
import { computeFundamentals, type FundamentalData } from "./fundamental-calculator";
import { generateFundamentalExplanation, type FundamentalExplanation } from "./fundamental-llm";

export type { FundamentalData, FundamentalExplanation };

export interface FundamentalAnalysis extends FundamentalData {
  explanation: FundamentalExplanation;
}

// 4-hour TTL — financials update at most once a day
const cache = new LRUCache<string, FundamentalAnalysis>({
  max: 100,
  ttl: 4 * 60 * 60 * 1000,
});

export async function getFundamentalAnalysis(
  symbol: string,
  language: Language,
): Promise<FundamentalAnalysis | null> {
  const cacheKey = `${symbol}::${language}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info({ symbol, language }, "Fundamental analysis cache hit");
    return cached;
  }

  logger.info({ symbol, language }, "Fetching fundamental analysis via Yahoo Finance");

  // Single round-trip: all statements + metrics + profile in one call
  const raw = await fetchYahooFundamentalData(symbol);
  if (!raw || raw.incomeAnnual.length === 0) {
    logger.warn({ symbol }, "No financial data found");
    return null;
  }

  // ── Compute metrics ───────────────────────────────────────────────────────
  const fundamentalData = computeFundamentals(raw);

  // ── Generate AI explanation ───────────────────────────────────────────────
  const explanation = await generateFundamentalExplanation(fundamentalData, language);

  const result: FundamentalAnalysis = { ...fundamentalData, explanation };
  cache.set(cacheKey, result);
  return result;
}
