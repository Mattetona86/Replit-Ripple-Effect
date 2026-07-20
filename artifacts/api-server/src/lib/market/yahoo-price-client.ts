/**
 * Yahoo Finance price client — replaces FMP for real-time quotes,
 * daily history, and intraday bars used by the technical analysis service.
 *
 * Uses yahoo-finance2 (already a dependency for fundamental data).
 * Returns the same bar shape the rest of service.ts already consumes
 * so the mapping/indicator pipeline is unchanged.
 */

import YahooFinance from 'yahoo-finance2';
import { logger } from '../logger';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ── Shared bar shape (same fields FmpDailyBar / FmpIntradayBar had) ───────────

export interface YahooBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IntradayInterval = '5min' | '30min' | '1hour';

// ── Quote ─────────────────────────────────────────────────────────────────────

export interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  exchange: string;
}

export async function getQuote(symbol: string): Promise<YahooQuote | undefined> {
  try {
    const q = await yahooFinance.quote(symbol, {}, { validateResult: false });
    if (!q || q.regularMarketPrice == null) return undefined;
    return {
      symbol: q.symbol,
      name: q.longName ?? q.shortName ?? q.symbol,
      price: q.regularMarketPrice,
      exchange: q.fullExchangeName ?? q.exchange ?? '',
    };
  } catch (err) {
    logger.warn({ err, symbol }, 'Yahoo getQuote failed');
    return undefined;
  }
}

// ── Daily history ─────────────────────────────────────────────────────────────

// Fetch 7 years to cover the worst case: 5Y display (1260 bars) + 260 warmup
const DAILY_LOOKBACK_MS = 7 * 365 * 24 * 60 * 60 * 1000;

export async function getDailyHistory(symbol: string): Promise<YahooBar[]> {
  const period1 = new Date(Date.now() - DAILY_LOOKBACK_MS);

  const result = await yahooFinance.chart(
    symbol,
    { period1, interval: '1d' },
    { validateResult: false },
  );

  // Yahoo chart returns quotes in ascending (oldest-first) chronological order
  return (result.quotes ?? [])
    .filter((q) => q.open != null && q.close != null)
    .map((q) => ({
      date: q.date.toISOString().slice(0, 10), // "YYYY-MM-DD"
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume ?? 0,
    }));
}

// ── Intraday history ──────────────────────────────────────────────────────────

// Yahoo Finance interval strings
const YAHOO_INTERVAL: Record<IntradayInterval, '5m' | '30m' | '1h'> = {
  '5min': '5m',
  '30min': '30m',
  '1hour': '1h',
};

// Days of look-back needed to cover displayBars + warmupBars for each interval:
//   5min:  (78 + 260) × 5 min  ≈  4.5 trading days  → fetch 10 calendar days
//   30min: (70 + 260) × 30 min ≈ 33 trading days     → fetch 60 calendar days
//   1hour: generously 90 calendar days
const INTRADAY_LOOKBACK_DAYS: Record<IntradayInterval, number> = {
  '5min': 10,
  '30min': 60,
  '1hour': 90,
};

export async function getIntradayHistory(
  symbol: string,
  interval: IntradayInterval,
): Promise<YahooBar[]> {
  const days = INTRADAY_LOOKBACK_DAYS[interval];
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const yahooInterval = YAHOO_INTERVAL[interval];

  const result = await yahooFinance.chart(
    symbol,
    { period1, interval: yahooInterval },
    { validateResult: false },
  );

  return (result.quotes ?? [])
    .filter((q) => q.open != null && q.close != null)
    .map((q) => ({
      // "YYYY-MM-DD HH:mm:ss" UTC — toUnixSeconds() in service.ts appends "Z" and parses correctly
      date: q.date.toISOString().replace('T', ' ').slice(0, 19),
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume ?? 0,
    }));
}
