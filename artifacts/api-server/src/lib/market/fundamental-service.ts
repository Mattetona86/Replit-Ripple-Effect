/**
 * Orchestrates fundamental data fetching, calculation, and LLM explanation.
 * Results are cached for 4 hours since fundamentals change at most daily.
 */

import { LRUCache } from "lru-cache";
import { logger } from "../logger";
import type { Language } from "./llm";
import {
  getProfile,
  getIncomeStatements,
  getBalanceSheets,
  getCashFlows,
  getKeyMetrics,
  getFinancialRatios,
  getPeers,
  getAnalystEstimates,
} from "./fundamental-fmp-client";
import { computeFundamentals, type FundamentalData, type FundamentalRawData } from "./fundamental-calculator";
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

const MAX_PEERS = 6;

// US-only exchanges (same filter as technical analysis search)
const US_EXCHANGES = new Set([
  "NYSE", "NASDAQ", "AMEX", "OTC", "ETF", "PINK", "NYSEARCA",
  "CBOE", "BATS", "IEX",
]);

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

  logger.info({ symbol, language }, "Fetching fundamental analysis");

  // ── Fetch company profile ──────────────────────────────────────────────────
  const profile = await getProfile(symbol).catch(() => null);
  if (!profile) {
    logger.warn({ symbol }, "Company profile not found");
    return null;
  }

  // ── Fetch all financial statements in parallel ────────────────────────────
  const [
    incomeAnnual,
    incomeQuarterly,
    balanceAnnual,
    balanceQuarterly,
    cashFlowAnnual,
    cashFlowQuarterly,
    keyMetricsAnnual,
    keyMetricsTtm,
    ratiosAnnual,
    ratiosTtm,
    estimates,
    peerSymbols,
  ] = await Promise.all([
    getIncomeStatements(symbol, "annual", 5).catch(() => []),
    getIncomeStatements(symbol, "quarter", 5).catch(() => []),
    getBalanceSheets(symbol, "annual", 5).catch(() => []),
    getBalanceSheets(symbol, "quarter", 5).catch(() => []),
    getCashFlows(symbol, "annual", 5).catch(() => []),
    getCashFlows(symbol, "quarter", 5).catch(() => []),
    getKeyMetrics(symbol, "annual", 5).catch(() => []),
    getKeyMetrics(symbol, "ttm", 1).catch(() => []),
    getFinancialRatios(symbol, "annual", 5).catch(() => []),
    getFinancialRatios(symbol, "ttm", 1).catch(() => []),
    getAnalystEstimates(symbol, 4).catch(() => []),
    getPeers(symbol).catch(() => []),
  ]);

  if (incomeAnnual.length === 0) {
    logger.warn({ symbol }, "No financial statements found");
    return null;
  }

  // ── Fetch peer data ───────────────────────────────────────────────────────
  // Limit to US-listed peers with data, cap at MAX_PEERS
  const validPeerSymbols = peerSymbols
    .filter((s) => s !== symbol)
    .slice(0, MAX_PEERS + 2); // fetch a couple extra in case some fail

  const peerDataResults = await Promise.allSettled(
    validPeerSymbols.map(async (peerSym) => {
      const [peerProfile, peerKm, peerIncome] = await Promise.all([
        getProfile(peerSym),
        getKeyMetrics(peerSym, "ttm", 1).catch(() => []),
        getIncomeStatements(peerSym, "annual", 2).catch(() => []),
      ]);
      return { profile: peerProfile, keyMetrics: peerKm, income: peerIncome };
    }),
  );

  const validPeers = peerDataResults
    .filter(
      (r): r is PromiseFulfilledResult<{ profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>; keyMetrics: Awaited<ReturnType<typeof getKeyMetrics>>; income: Awaited<ReturnType<typeof getIncomeStatements>> }> =>
        r.status === "fulfilled" && r.value.profile != null,
    )
    .map((r) => r.value)
    .slice(0, MAX_PEERS);

  const raw: FundamentalRawData = {
    profile,
    incomeAnnual,
    incomeQuarterly,
    balanceAnnual,
    balanceQuarterly,
    cashFlowAnnual,
    cashFlowQuarterly,
    keyMetricsAnnual,
    keyMetricsTtm,
    ratiosAnnual,
    ratiosTtm,
    estimates,
    peerProfiles: validPeers.map((p) => p.profile),
    peerKeyMetricsTtm: validPeers.map((p) => p.keyMetrics),
    peerIncomeAnnual: validPeers.map((p) => p.income),
  };

  // ── Compute metrics ───────────────────────────────────────────────────────
  const fundamentalData = computeFundamentals(raw);

  // ── Generate AI explanation ───────────────────────────────────────────────
  const explanation = await generateFundamentalExplanation(fundamentalData, language);

  const result: FundamentalAnalysis = { ...fundamentalData, explanation };

  cache.set(cacheKey, result);
  return result;
}
